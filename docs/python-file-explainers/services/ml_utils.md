# services/ml_utils.py

## Overview
- Source file: FV_backend/services/ml_utils.py
- Primary role: Business logic layer called by routers; contains operational workflows and data processing.
- Total lines: 114
- Top-level functions: 7
- Classes: 0

## Imports and Dependencies
- from __future__ import annotations
- import re
- from typing import Any, Dict, Tuple
- import numpy as np
- import pandas as pd
- from sklearn.linear_model import LogisticRegression
- from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
- from sklearn.model_selection import train_test_split
- from sklearn.pipeline import make_pipeline
- from sklearn.preprocessing import LabelEncoder, StandardScaler

## Top-Level Functions (Detailed)
### clean_training_dataframe
- Signature: def clean_training_dataframe(df) -> pd.DataFrame
- Location: lines 15-19
- Async: no
- Inputs: df
- Return annotation: pd.DataFrame
- Docstring: None
- Internal calls: none detected
- External calls: clean.dropna, clean.replace, df.copy
- Side effects: Primarily computational / in-memory transformation

### apply_privileged_group_rules
- Signature: def apply_privileged_group_rules(df, sensitive_col, privileged_val) -> Any
- Location: lines 22-51
- Async: no
- Inputs: df, sensitive_col, privileged_val
- Return annotation: Any
- Docstring: None
- Internal calls: none detected
- External calls: float, match.groups, np.where, ops.get, part.strip, pd.Series, pd.api.types.is_numeric_dtype, re.match, str
- Side effects: Primarily computational / in-memory transformation

### encode_dataset
- Signature: def encode_dataset(df, target_col, sensitive_col) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, Dict[str, int]]
- Location: lines 54-75
- Async: no
- Inputs: df, target_col, sensitive_col
- Return annotation: Tuple[pd.DataFrame, pd.Series, pd.DataFrame, Dict[str, int]]
- Docstring: None
- Internal calls: none detected
- External calls: LabelEncoder, df.copy, dict, encoded.drop, le_sensitive.fit_transform, le_sensitive.transform, le_target.fit_transform, pd.api.types.is_numeric_dtype, zip
- Side effects: Primarily computational / in-memory transformation

### fit_logistic_classifier
- Signature: def fit_logistic_classifier(X, y)
- Location: lines 78-82
- Async: no
- Inputs: X, y
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: LogisticRegression, StandardScaler, make_pipeline, model.fit, train_test_split
- Side effects: Primarily computational / in-memory transformation

### compute_group_metrics
- Signature: def compute_group_metrics(y_true, y_pred) -> Tuple[float, float, float, float, float]
- Location: lines 85-99
- Async: no
- Inputs: y_true, y_pred
- Return annotation: Tuple[float, float, float, float, float]
- Docstring: None
- Internal calls: none detected
- External calls: accuracy_score, cm.ravel, confusion_matrix, float, int, len, np.mean, pd.Series, precision_score, recall_score
- Side effects: Primarily computational / in-memory transformation

### compute_binary_group_metrics
- Signature: def compute_binary_group_metrics(y_true, y_pred) -> Tuple[float, float, float]
- Location: lines 102-104
- Async: no
- Inputs: y_true, y_pred
- Return annotation: Tuple[float, float, float]
- Docstring: None
- Internal calls: compute_group_metrics
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### find_threshold_for_target_rate
- Signature: def find_threshold_for_target_rate(probabilities, target_rate) -> float
- Location: lines 107-114
- Async: no
- Inputs: probabilities, target_rate
- Return annotation: float
- Docstring: None
- Internal calls: none detected
- External calls: float, int, len, np.abs, np.argmin, np.array, np.linspace
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
