from __future__ import annotations

import re
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler


def clean_training_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    clean = df.copy()
    clean.replace("?", np.nan, inplace=True)
    clean.dropna(inplace=True)
    return clean


def apply_privileged_group_rules(
    df: pd.DataFrame,
    sensitive_col: str,
    privileged_val: Any,
) -> Any:
    if pd.api.types.is_numeric_dtype(df[sensitive_col]):
        match = re.match(r"([<>]=?)(.*)", str(privileged_val).strip())
        if match:
            operator, value_str = match.groups()
            try:
                threshold = float(value_str)
                ops = {
                    ">": df[sensitive_col] > threshold,
                    ">=": df[sensitive_col] >= threshold,
                    "<": df[sensitive_col] < threshold,
                    "<=": df[sensitive_col] <= threshold,
                }
                mask = ops.get(operator, pd.Series(False, index=df.index))
                df[sensitive_col] = np.where(mask, "Privileged_Group", "Unprivileged_Group")
                return "Privileged_Group"
            except ValueError:
                return privileged_val

    if "," in str(privileged_val):
        target_values = [part.strip() for part in str(privileged_val).split(",")]
        mask = df[sensitive_col].astype(str).isin(target_values)
        df[sensitive_col] = np.where(mask, "Privileged_Group", "Unprivileged_Group")
        return "Privileged_Group"

    return privileged_val


def encode_dataset(
    df: pd.DataFrame,
    target_col: str,
    sensitive_col: str,
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, Dict[str, int]]:
    encoded = df.copy()

    le_target = LabelEncoder()
    encoded[target_col] = le_target.fit_transform(encoded[target_col].astype(str))

    le_sensitive = LabelEncoder()
    encoded[sensitive_col] = le_sensitive.fit_transform(encoded[sensitive_col].astype(str))
    class_map = dict(zip(le_sensitive.classes_, le_sensitive.transform(le_sensitive.classes_)))

    X = encoded.drop(columns=[target_col]).copy()
    y = encoded[target_col].copy()

    object_cols = [col for col in X.columns if not pd.api.types.is_numeric_dtype(X[col])]
    for col in object_cols:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))

    return X, y, encoded, class_map


def fit_logistic_classifier(X: pd.DataFrame, y: pd.Series):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, solver="lbfgs"))
    model.fit(X_train, y_train)
    return model, X_test, y_test


def compute_group_metrics(y_true: pd.Series, y_pred: pd.Series) -> Tuple[float, float, float, float, float]:
    if len(y_true) == 0:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    y_true_np = pd.Series(y_true).to_numpy()
    y_pred_np = pd.Series(y_pred).to_numpy()
    cm = confusion_matrix(y_true_np, y_pred_np, labels=[0, 1])
    tn, fp, fn, tp = (int(v) for v in cm.ravel())

    tpr = float(recall_score(y_true_np, y_pred_np, zero_division=0))
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    selection_rate = float(np.mean(y_pred_np))
    accuracy = float(accuracy_score(y_true_np, y_pred_np))
    precision = float(precision_score(y_true_np, y_pred_np, zero_division=0))
    return tpr, fpr, selection_rate, accuracy, precision


def compute_binary_group_metrics(y_true: pd.Series, y_pred: pd.Series) -> Tuple[float, float, float]:
    tpr, fpr, _, accuracy, _ = compute_group_metrics(y_true, y_pred)
    return accuracy, tpr, fpr


def find_threshold_for_target_rate(probabilities: pd.Series, target_rate: float) -> float:
    if len(probabilities) == 0:
        return 0.5

    thresholds = np.linspace(0.01, 0.99, 100)
    rates = np.array([(probabilities > threshold).mean() for threshold in thresholds])
    idx = int(np.argmin(np.abs(rates - target_rate)))
    return float(thresholds[idx])
