# audit_intelligence/intersectional_analysis.py

## Overview
- Source file: FV_backend/audit_intelligence/intersectional_analysis.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 198
- Top-level functions: 5
- Classes: 0
- Module note: Intersectional bias analysis (beginner-friendly implementation).

This module keeps the same output schema used by the API/UI while using
clear, small helper functions and straightforward control flow.

## Imports and Dependencies
- from __future__ import annotations
- from itertools import combinations
- from typing import Any, Dict, List, Optional
- import numpy as np
- import pandas as pd
- from scipy.stats import chi2_contingency
- from audit_intelligence.utils.preprocessing import LOW_SAMPLE_THRESHOLD, bootstrap_confidence_interval, coerce_binary_series

## Top-Level Functions (Detailed)
### _significance_test
- Signature: def _significance_test(subgroup_size, subgroup_positives, total_size, total_positives) -> float
- Location: lines 23-49
- Async: no
- Inputs: subgroup_size, subgroup_positives, total_size, total_positives
- Return annotation: float
- Docstring: Return p-value (chi-square) for whether the subgroup rate differs from the overall rate.
- Internal calls: none detected
- External calls: any, chi2_contingency, float, min, np.array
- Side effects: Primarily computational / in-memory transformation

### _build_cell
- Signature: def _build_cell(group_a, group_b, subgroup_outcome, overall_rate, total_size, total_positives) -> Dict[str, Any]
- Location: lines 52-97
- Async: no
- Inputs: group_a, group_b, subgroup_outcome, overall_rate, total_size, total_positives
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: _significance_test
- External calls: abs, bootstrap_confidence_interval, float, int, len, min, round, str, subgroup_outcome.mean, subgroup_outcome.sum
- Side effects: Primarily computational / in-memory transformation

### _build_sunburst
- Signature: def _build_sunburst(df, outcome, sensitive_attributes) -> List[Dict[str, Any]]
- Location: lines 100-137
- Async: no
- Inputs: df, outcome, sensitive_attributes
- Return annotation: List[Dict[str, Any]]
- Docstring: None
- Internal calls: none detected
- External calls: children.append, df.groupby, first_df.groupby, first_outcome.mean, float, int, len, nodes.append, round, second_outcome.mean
- Side effects: Primarily computational / in-memory transformation

### _rank_worst_subgroups
- Signature: def _rank_worst_subgroups(combinations_payload) -> List[Dict[str, Any]]
- Location: lines 140-149
- Async: no
- Inputs: combinations_payload
- Return annotation: List[Dict[str, Any]]
- Docstring: None
- Internal calls: none detected
- External calls: cell.get, combo.get, item.get, reliable_cells.append, reliable_cells.sort
- Side effects: Primarily computational / in-memory transformation

### analyze_intersectional_bias
- Signature: def analyze_intersectional_bias(df, sensitive_attributes, outcome_column, positive_label) -> Dict[str, Any]
- Location: lines 152-198
- Async: no
- Inputs: df, sensitive_attributes, outcome_column, positive_label
- Return annotation: Dict[str, Any]
- Docstring: Analyse bias at the intersection of pairs of sensitive attributes.

Returns
-------
Dict with keys:
- ``overall_selection_rate``
- ``combinations`` — list of pairwise intersectional analyses
- ``sunburst``      — hierarchical breakdown for sunburst chart
- ``worst_subgroups`` — top-5 highest-disparity reliable subgroups
- Internal calls: _build_cell, _build_sunburst, _rank_worst_subgroups
- External calls: cells.append, coerce_binary_series, combinations, combinations_payload.append, df.groupby, float, int, len, outcome.mean, outcome.sum, round
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
