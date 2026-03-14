# audit_intelligence/utils/preprocessing.py

## Overview
- Source file: FV_backend/audit_intelligence/utils/preprocessing.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 266
- Top-level functions: 9
- Classes: 1
- Module note: Shared preprocessing utilities for the audit-intelligence pipeline.

All fairness modules should import from here to avoid duplicated logic.

## Imports and Dependencies
- from __future__ import annotations
- from dataclasses import dataclass
- from typing import Any, Dict, Iterable, List, Optional, Tuple
- import numpy as np
- import pandas as pd

## Top-Level Functions (Detailed)
### sanitize_dataframe
- Signature: def sanitize_dataframe(df) -> pd.DataFrame
- Location: lines 48-60
- Async: no
- Inputs: df
- Return annotation: pd.DataFrame
- Docstring: Replace common missing-value tokens with ``NaN`` and drop all-null rows.
- Internal calls: none detected
- External calls: clean.dropna, clean.replace, clean.reset_index, df.copy, isinstance, pd.api.types.is_object_dtype, pd.api.types.is_string_dtype, v.strip
- Side effects: Primarily computational / in-memory transformation

### detect_feature_type
- Signature: def detect_feature_type(series) -> str
- Location: lines 68-88
- Async: no
- Inputs: series
- Return annotation: str
- Docstring: Classify a column as ``binary``, ``ordinal``, ``continuous``, or ``categorical``.
- Internal calls: none detected
- External calls: int, non_null.nunique, np.allclose, np.round, pd.api.types.is_numeric_dtype, pd.to_numeric, series.dropna
- Side effects: Primarily computational / in-memory transformation

### classify_feature_types
- Signature: def classify_feature_types(df, exclude_columns) -> Dict[str, str]
- Location: lines 91-96
- Async: no
- Inputs: df, exclude_columns
- Return annotation: Dict[str, str]
- Docstring: Return a mapping of column → feature type for all non-excluded columns.
- Internal calls: detect_feature_type
- External calls: set
- Side effects: Primarily computational / in-memory transformation

### coerce_binary_series
- Signature: def coerce_binary_series(series, positive_label) -> pd.Series
- Location: lines 104-135
- Async: no
- Inputs: series, positive_label
- Return annotation: pd.Series
- Docstring: Convert an arbitrary series to a 0/1 integer series.

If *positive_label* is provided it is used as the positive class.
Otherwise the function infers the positive label from common vocabulary
(``{"1", "yes", "true", "approved", …}``) or picks the maximum numeric value.
- Internal calls: none detected
- External calls: clean.unique, codes.max, float, int, len, max, np.median, np.zeros, pd.Categorical, pd.Series, pd.api.types.is_numeric_dtype, pd.to_numeric, series.astype, series.dropna, sorted, str
- Side effects: Primarily computational / in-memory transformation

### bootstrap_confidence_interval
- Signature: def bootstrap_confidence_interval(values, iterations, confidence) -> Tuple[float, float]
- Location: lines 143-161
- Async: no
- Inputs: values, iterations, confidence
- Return annotation: Tuple[float, float]
- Docstring: Return a bootstrap confidence interval for the mean of *values*.
- Internal calls: none detected
- External calls: clean.to_numpy, float, len, np.mean, np.quantile, np.random.default_rng, pd.Series, pd.to_numeric, range, rng.choice
- Side effects: Primarily computational / in-memory transformation

### impute_missing_values
- Signature: def impute_missing_values(df, feature_types) -> Tuple[pd.DataFrame, Dict[str, Dict[str, Any]]]
- Location: lines 169-198
- Async: no
- Inputs: df, feature_types
- Return annotation: Tuple[pd.DataFrame, Dict[str, Dict[str, Any]]]
- Docstring: Fill missing values using median (numeric) or mode (categorical).
- Internal calls: detect_feature_type
- External calls: df.copy, feature_types.get, float, int, np.isnan, pd.to_numeric, str
- Side effects: Primarily computational / in-memory transformation

### encode_protected_attributes
- Signature: def encode_protected_attributes(df, sensitive_attributes) -> Dict[str, Dict[str, int]]
- Location: lines 206-218
- Async: no
- Inputs: df, sensitive_attributes
- Return annotation: Dict[str, Dict[str, int]]
- Docstring: Return a label-encoding map for each sensitive attribute column.
- Internal calls: none detected
- External calls: enumerate, int, pd.Categorical, str
- Side effects: Primarily computational / in-memory transformation

### prepare_dataset
- Signature: def prepare_dataset(df, sensitive_attributes, exclude_columns) -> PreparedDataset
- Location: lines 226-241
- Async: no
- Inputs: df, sensitive_attributes, exclude_columns
- Return annotation: PreparedDataset
- Docstring: Run the full sanitise → type-classify → impute → encode pipeline.
- Internal calls: classify_feature_types, encode_protected_attributes, impute_missing_values, sanitize_dataframe
- External calls: PreparedDataset
- Side effects: Primarily computational / in-memory transformation

### build_training_frame
- Signature: def build_training_frame(df, target_column, protected_attributes) -> Tuple[pd.DataFrame, pd.Series, List[str]]
- Location: lines 244-266
- Async: no
- Inputs: df, target_column, protected_attributes
- Return annotation: Tuple[pd.DataFrame, pd.Series, List[str]]
- Docstring: Encode all features and return (X, y, feature_names) ready for sklearn.
- Internal calls: coerce_binary_series, detect_feature_type
- External calls: encoded.columns.tolist, pd.get_dummies, pd.to_numeric
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
### PreparedDataset
- Location: lines 29-40
- Docstring: Result container returned by :func:`prepare_dataset`.
- Methods: 1

#### PreparedDataset.df
- Signature: def df(self) -> pd.DataFrame
- Location: lines 38-40
- Async: no
- Inputs: self
- Return annotation: pd.DataFrame
- Docstring: Backward-compatible alias used by older code/tests.
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
