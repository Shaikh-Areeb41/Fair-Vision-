# audit_intelligence/explainability_engine.py

## Overview
- Source file: FV_backend/audit_intelligence/explainability_engine.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 278
- Top-level functions: 6
- Classes: 0
- Module note: Explainability engine — produces evidence-based, structured fairness explanations.

Each explanation is a dict containing:
  text              Plain-language summary (backward-compatible with string lists).
  type              "parity" | "intersectional" | "proxy" | "risk"
  title             Short headline.
  severity          "info" | "warning" | "critical"
  affected_attribute  Which sensitive attribute this finding relates to.
  affected_groups   List of {group, rate, count} dicts.
  key_metrics       Dict of metric name -> value.
  recommendations   List of actionable recommendation strings.
  sample_warning    Present only when subgroup size is small.

## Imports and Dependencies
- from __future__ import annotations
- from typing import Any, Dict, List, Optional

## Top-Level Functions (Detailed)
### _severity
- Signature: def _severity(value, medium, high) -> str
- Location: lines 27-32
- Async: no
- Inputs: value, medium, high
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _parity_recommendations
- Signature: def _parity_recommendations(gap, attribute) -> List[str]
- Location: lines 35-50
- Async: no
- Inputs: gap, attribute
- Return annotation: List[str]
- Docstring: None
- Internal calls: none detected
- External calls: recs.append
- Side effects: Primarily computational / in-memory transformation

### _proxy_recommendations
- Signature: def _proxy_recommendations(feature, sensitive, methods) -> List[str]
- Location: lines 53-68
- Async: no
- Inputs: feature, sensitive, methods
- Return annotation: List[str]
- Docstring: None
- Internal calls: none detected
- External calls: recs.append
- Side effects: Primarily computational / in-memory transformation

### _intersectional_recommendations
- Signature: def _intersectional_recommendations(attrs, deviation) -> List[str]
- Location: lines 71-81
- Async: no
- Inputs: attrs, deviation
- Return annotation: List[str]
- Docstring: None
- Internal calls: none detected
- External calls: recs.append
- Side effects: Primarily computational / in-memory transformation

### _default_explanation
- Signature: def _default_explanation() -> Dict[str, Any]
- Location: lines 84-94
- Async: no
- Inputs: none
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### generate_fairness_explanations
- Signature: def generate_fairness_explanations(fairness_payload, intersectional_payload, proxy_payload, risk_payload) -> List[Dict[str, Any]]
- Location: lines 97-278
- Async: no
- Inputs: fairness_payload, intersectional_payload, proxy_payload, risk_payload
- Return annotation: List[Dict[str, Any]]
- Docstring: Generate structured fairness explanations from all four analysis payloads.

Compatible API: the returned list can be iterated and each item's ``text``
field used for backward-compatible plain-text rendering.
- Internal calls: _default_explanation, _intersectional_recommendations, _parity_recommendations, _severity
- External calls: cell.get, combo.get, components.get, components.items, explanations.append, fairness_payload.get, float, g.get, group_breakdown.get, int, intersectional_payload.get, len, risk_payload.get, round, row.get, str, worst.get, worst_subgroups.append
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
