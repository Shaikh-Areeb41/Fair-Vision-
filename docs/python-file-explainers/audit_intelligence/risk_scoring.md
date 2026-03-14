# audit_intelligence/risk_scoring.py

## Overview
- Source file: FV_backend/audit_intelligence/risk_scoring.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 45
- Top-level functions: 2
- Classes: 0

## Imports and Dependencies
- from __future__ import annotations
- from typing import Any, Dict

## Top-Level Functions (Detailed)
### _clamp
- Signature: def _clamp(value) -> float
- Location: lines 6-7
- Async: no
- Inputs: value
- Return annotation: float
- Docstring: None
- Internal calls: none detected
- External calls: max, min
- Side effects: Primarily computational / in-memory transformation

### compute_ethical_risk_score
- Signature: def compute_ethical_risk_score(fairness_payload, drift_payload) -> Dict[str, Any]
- Location: lines 10-45
- Async: no
- Inputs: fairness_payload, drift_payload
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: _clamp
- External calls: aggregates.get, drift_payload.get, fairness_payload.get, float, min, round
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
