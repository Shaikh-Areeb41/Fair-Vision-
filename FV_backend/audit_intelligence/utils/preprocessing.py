"""Shared preprocessing utilities for the audit-intelligence pipeline.

All fairness modules should import from here to avoid duplicated logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd

# Strings that represent missing values in raw CSVs
MISSING_MARKERS: frozenset = frozenset(
    {"", "?", "na", "n/a", "none", "null", "nan", "unknown"}
)

# Subgroups smaller than this are considered unreliable for fairness conclusions
LOW_SAMPLE_THRESHOLD = 30


# ---------------------------------------------------------------------------
# Data container
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PreparedDataset:
    """Result container returned by :func:`prepare_dataset`."""

    dataframe: pd.DataFrame
    feature_types: Dict[str, str]
    imputations: Dict[str, Dict[str, Any]]
    protected_attribute_encodings: Dict[str, Dict[str, int]]

    @property
    def df(self) -> pd.DataFrame:
        """Backward-compatible alias used by older code/tests."""
        return self.dataframe


# ---------------------------------------------------------------------------
# Sanitisation
# ---------------------------------------------------------------------------


def sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Replace common missing-value tokens with ``NaN`` and drop all-null rows."""
    clean = df.copy()
    for column in clean.columns:
        if pd.api.types.is_object_dtype(clean[column]) or pd.api.types.is_string_dtype(clean[column]):
            clean[column] = clean[column].map(
                lambda v: np.nan
                if isinstance(v, str) and v.strip().lower() in MISSING_MARKERS
                else v
            )
    clean = clean.replace([np.inf, -np.inf], np.nan)
    clean = clean.dropna(how="all")
    return clean.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Feature-type detection
# ---------------------------------------------------------------------------


def detect_feature_type(series: pd.Series) -> str:
    """Classify a column as ``binary``, ``ordinal``, ``continuous``, or ``categorical``."""
    non_null = series.dropna()
    unique_count = int(non_null.nunique())

    if unique_count <= 2:
        return "binary"

    if pd.api.types.is_numeric_dtype(non_null):
        numeric = pd.to_numeric(non_null, errors="coerce").dropna()
        if numeric.empty:
            return "categorical"
        integer_like = np.allclose(numeric, np.round(numeric))
        if integer_like and unique_count <= 10:
            return "ordinal"
        return "continuous"

    if unique_count <= 12:
        return "categorical"

    return "categorical"


def classify_feature_types(
    df: pd.DataFrame, exclude_columns: Optional[Iterable[str]] = None
) -> Dict[str, str]:
    """Return a mapping of column → feature type for all non-excluded columns."""
    excluded = set(exclude_columns or [])
    return {col: detect_feature_type(df[col]) for col in df.columns if col not in excluded}


# ---------------------------------------------------------------------------
# Binary coercion
# ---------------------------------------------------------------------------


def coerce_binary_series(series: pd.Series, positive_label: Optional[Any] = None) -> pd.Series:
    """Convert an arbitrary series to a 0/1 integer series.

    If *positive_label* is provided it is used as the positive class.
    Otherwise the function infers the positive label from common vocabulary
    (``{"1", "yes", "true", "approved", …}``) or picks the maximum numeric value.
    """
    clean = series.dropna()
    if clean.empty:
        return pd.Series(np.zeros(len(series), dtype=int), index=series.index)

    if positive_label is not None:
        return (series.astype(str) == str(positive_label)).astype(int)

    normalised = {str(v).strip().lower() for v in clean.unique()}
    positive_tokens = {"1", "true", "yes", "y", "approved", "accept", "accepted", "positive", "pass", "passed"}
    negative_tokens = {"0", "false", "no", "n", "rejected", "reject", "negative", "fail", "failed"}
    if normalised <= (positive_tokens | negative_tokens):
        return series.astype(str).str.strip().str.lower().isin(positive_tokens).astype(int)

    if pd.api.types.is_numeric_dtype(clean):
        numeric = pd.to_numeric(series, errors="coerce")
        unique_vals = sorted(pd.to_numeric(clean, errors="coerce").dropna().unique().tolist())
        if len(unique_vals) == 2:
            return (numeric == max(unique_vals)).astype(int)
        threshold = float(np.median(pd.to_numeric(clean, errors="coerce")))
        return (numeric >= threshold).astype(int)

    categorical = pd.Categorical(series.astype(str))
    codes = categorical.codes
    max_code = int(codes.max()) if len(codes) else 0
    return pd.Series((codes == max_code).astype(int), index=series.index)


# ---------------------------------------------------------------------------
# Statistical robustness
# ---------------------------------------------------------------------------


def bootstrap_confidence_interval(
    values: pd.Series | List[float] | np.ndarray, iterations: int = 500, confidence: float = 0.95
) -> Tuple[float, float]:
    """Return a bootstrap confidence interval for the mean of *values*."""
    series = pd.Series(values)
    clean = pd.to_numeric(series, errors="coerce").dropna().astype(float)
    if clean.empty:
        return 0.0, 0.0
    if len(clean) == 1:
        point = float(clean.iloc[0])
        return point, point

    rng = np.random.default_rng(42)
    source = clean.to_numpy()
    samples = [float(np.mean(rng.choice(source, size=len(source), replace=True)))
               for _ in range(iterations)]

    alpha = (1 - confidence) / 2
    return float(np.quantile(samples, alpha)), float(np.quantile(samples, 1 - alpha))


# ---------------------------------------------------------------------------
# Missing-value imputation
# ---------------------------------------------------------------------------


def impute_missing_values(
    df: pd.DataFrame, feature_types: Dict[str, str]
) -> Tuple[pd.DataFrame, Dict[str, Dict[str, Any]]]:
    """Fill missing values using median (numeric) or mode (categorical)."""
    imputed = df.copy()
    summary: Dict[str, Dict[str, Any]] = {}

    for col in imputed.columns:
        missing_count = int(imputed[col].isna().sum())
        if missing_count == 0:
            continue

        ftype = feature_types.get(col, detect_feature_type(imputed[col]))
        if ftype in {"continuous", "ordinal"}:
            fill_value = float(pd.to_numeric(imputed[col], errors="coerce").median())
            if np.isnan(fill_value):
                fill_value = 0.0
            imputed[col] = pd.to_numeric(imputed[col], errors="coerce").fillna(fill_value)
        else:
            mode = imputed[col].mode(dropna=True)
            fill_value = str(mode.iloc[0]) if not mode.empty else "Unknown"
            imputed[col] = imputed[col].astype(object).where(~imputed[col].isna(), fill_value)

        summary[col] = {
            "missing_count": missing_count,
            "strategy": "median" if ftype in {"continuous", "ordinal"} else "mode",
            "fill_value": fill_value,
        }

    return imputed, summary


# ---------------------------------------------------------------------------
# Protected attribute encoding
# ---------------------------------------------------------------------------


def encode_protected_attributes(
    df: pd.DataFrame, sensitive_attributes: List[str]
) -> Dict[str, Dict[str, int]]:
    """Return a label-encoding map for each sensitive attribute column."""
    encodings: Dict[str, Dict[str, int]] = {}
    for attr in sensitive_attributes:
        if attr not in df.columns:
            continue
        categories = pd.Categorical(df[attr].astype(str))
        encodings[attr] = {
            str(cat): int(code) for code, cat in enumerate(categories.categories)
        }
    return encodings


# ---------------------------------------------------------------------------
# High-level pipeline
# ---------------------------------------------------------------------------


def prepare_dataset(
    df: pd.DataFrame,
    sensitive_attributes: List[str],
    exclude_columns: Optional[Iterable[str]] = None,
) -> PreparedDataset:
    """Run the full sanitise → type-classify → impute → encode pipeline."""
    sanitized = sanitize_dataframe(df)
    feature_types = classify_feature_types(sanitized, exclude_columns=exclude_columns)
    imputed, imputations = impute_missing_values(sanitized, feature_types)
    encodings = encode_protected_attributes(imputed, sensitive_attributes)
    return PreparedDataset(
        dataframe=imputed,
        feature_types=feature_types,
        imputations=imputations,
        protected_attribute_encodings=encodings,
    )


def build_training_frame(
    df: pd.DataFrame,
    target_column: str,
    protected_attributes: Optional[List[str]] = None,
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Encode all features and return (X, y, feature_names) ready for sklearn."""
    feature_columns = [col for col in df.columns if col != target_column]
    working = df[feature_columns].copy()

    for col in feature_columns:
        ftype = detect_feature_type(working[col])
        if ftype in {"continuous", "ordinal"}:
            working[col] = pd.to_numeric(working[col], errors="coerce").fillna(0)
        elif ftype == "binary":
            working[col] = coerce_binary_series(working[col])
        else:
            working[col] = working[col].astype(str)

    categorical_cols = [col for col in feature_columns if working[col].dtype == object]
    encoded = pd.get_dummies(working, columns=categorical_cols, drop_first=False).astype(float)
    y = coerce_binary_series(df[target_column])

    return encoded, y, encoded.columns.tolist()
