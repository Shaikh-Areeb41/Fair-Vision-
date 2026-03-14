# audit_intelligence/fairness_metrics.py

## Overview
- Source file: FV_backend/audit_intelligence/fairness_metrics.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 139
- Top-level functions: 3
- Classes: 0

## Imports and Dependencies
- from __future__ import annotations
- from typing import Any, Dict, List, Optional
- import numpy as np
- import pandas as pd
- from audit_intelligence.utils.preprocessing import coerce_binary_series as _to_binary

## Top-Level Functions (Detailed)
### _bounded
- Signature: def _bounded(value) -> float
- Location: lines 11-12
- Async: no
- Inputs: value
- Return annotation: float
- Docstring: None
- Internal calls: none detected
- External calls: max, min
- Side effects: Primarily computational / in-memory transformation

### compute_multi_attribute_fairness
- Signature: def compute_multi_attribute_fairness(df, sensitive_attributes, outcome_column, actual_column, positive_label) -> Dict[str, Any]
- Location: lines 15-102
- Async: no
- Inputs: df, sensitive_attributes, outcome_column, actual_column, positive_label
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: _bounded
- External calls: _to_binary, df.groupby, float, group_outcome.mean, group_stats.append, int, len, matrix.append, max, min, np.mean, positives.any, round, str
- Side effects: Primarily computational / in-memory transformation

### compute_fairness_drift
- Signature: def compute_fairness_drift(history_points, current_score) -> Dict[str, Any]
- Location: lines 105-139
- Async: no
- Inputs: history_points, current_score
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: none detected
- External calls: float, len, np.std, point.get, round, str
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
