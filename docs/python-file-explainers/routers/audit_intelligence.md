# routers/audit_intelligence.py

## Overview
- Source file: FV_backend/routers/audit_intelligence.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 220
- Top-level functions: 7
- Classes: 1

## Imports and Dependencies
- from __future__ import annotations
- from datetime import datetime
- from typing import Any, Dict, List, Optional
- import pandas as pd
- from bson import ObjectId
- from fastapi import APIRouter, Depends, HTTPException
- from pydantic import BaseModel, Field
- from audit_intelligence.explainability_engine import generate_fairness_explanations
- from audit_intelligence.fairness_metrics import compute_fairness_drift, compute_multi_attribute_fairness
- from audit_intelligence.intersectional_analysis import analyze_intersectional_bias
- from audit_intelligence.risk_scoring import compute_ethical_risk_score
- from database import datasets_collection
- from routers.auth import get_current_user
- from services.dataset_service import get_dataset_for_owner, load_full_dataset

## Top-Level Functions (Detailed)
### _parse_dataset_id
- Signature: def _parse_dataset_id(dataset_id) -> ObjectId
- Location: lines 33-36
- Async: no
- Inputs: dataset_id
- Return annotation: ObjectId
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, ObjectId, ObjectId.is_valid
- Side effects: Primarily computational / in-memory transformation

### _validate_columns
- Signature: def _validate_columns(df, sensitive_attributes, outcome_column, actual_column) -> None
- Location: lines 39-53
- Async: no
- Inputs: df, sensitive_attributes, outcome_column, actual_column
- Return annotation: None
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException
- Side effects: Primarily computational / in-memory transformation

### _extract_history_points
- Signature: def _extract_history_points(datasets) -> List[Dict[str, Any]]
- Location: lines 56-73
- Async: no
- Inputs: datasets
- Return annotation: List[Dict[str, Any]]
- Docstring: None
- Internal calls: none detected
- External calls: audit.get, dataset.get, points.append, str
- Side effects: Primarily computational / in-memory transformation

### _build_noop_proxy_payload
- Signature: def _build_noop_proxy_payload(df, sensitive_attributes, outcome_column) -> Dict[str, Any]
- Location: lines 76-101
- Async: no
- Inputs: df, sensitive_attributes, outcome_column
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: none detected
- External calls: set
- Side effects: Primarily computational / in-memory transformation

### run_audit_intelligence
- Signature: async def run_audit_intelligence(dataset_id, payload, current_user)
- Location: lines 105-199
- Async: yes
- Inputs: dataset_id, payload, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _build_noop_proxy_payload, _extract_history_points, _parse_dataset_id, _validate_columns
- External calls: Depends, HTTPException, analyze_intersectional_bias, compute_ethical_risk_score, compute_fairness_drift, compute_multi_attribute_fairness, dataset.get, datasets_collection.find, datasets_collection.update_one, datetime.utcnow, df.dropna, fairness_payload.get, float, generate_fairness_explanations, get_dataset_for_owner, load_full_dataset, payload.model_dump, risk_payload.get, router.post
- Side effects: Database read/write operations, Persistent document mutation

### get_latest_audit_intelligence
- Signature: async def get_latest_audit_intelligence(dataset_id, current_user)
- Location: lines 203-213
- Async: yes
- Inputs: dataset_id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _parse_dataset_id
- External calls: Depends, HTTPException, dataset.get, datasets_collection.find_one, router.get
- Side effects: Database read/write operations

### get_audit_timeline
- Signature: async def get_audit_timeline(current_user)
- Location: lines 217-220
- Async: yes
- Inputs: current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _extract_history_points
- External calls: Depends, datasets_collection.find, router.get
- Side effects: Database read/write operations


## Classes and Methods (Detailed)
### AuditIntelligenceRequest
- Location: lines 23-30
- Docstring: None
- Methods: 0


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
