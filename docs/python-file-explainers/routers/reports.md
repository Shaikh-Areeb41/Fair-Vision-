# routers/reports.py

## Overview
- Source file: FV_backend/routers/reports.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 372
- Top-level functions: 12
- Classes: 1

## Imports and Dependencies
- from __future__ import annotations
- from datetime import datetime
- from io import BytesIO
- from pathlib import Path
- from typing import Any, Dict, List, Optional
- from uuid import uuid4
- from bson import ObjectId
- from fastapi import APIRouter, Depends, HTTPException
- from fastapi.responses import FileResponse, StreamingResponse
- from pydantic import BaseModel, Field
- from audit_intelligence.governance_report_generator import DISPARITY_DI_THRESHOLD, DISPARITY_DPD_THRESHOLD, generate_governance_compliance_pdf
- from database import datasets_collection, reports_collection
- from routers.auth import get_current_user

## Top-Level Functions (Detailed)
### _parse_dataset_object_id
- Signature: def _parse_dataset_object_id(dataset_id) -> ObjectId
- Location: lines 34-37
- Async: no
- Inputs: dataset_id
- Return annotation: ObjectId
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, ObjectId, ObjectId.is_valid
- Side effects: Primarily computational / in-memory transformation

### _serialize_report_history
- Signature: def _serialize_report_history(report_doc) -> Dict[str, Any]
- Location: lines 40-49
- Async: no
- Inputs: report_doc
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: _safe_num
- External calls: isinstance, report_doc.get, round, str
- Side effects: Primarily computational / in-memory transformation

### _safe_num
- Signature: def _safe_num(value, default) -> float
- Location: lines 52-59
- Async: no
- Inputs: value, default
- Return annotation: float
- Docstring: None
- Internal calls: none detected
- External calls: float
- Side effects: Primarily computational / in-memory transformation

### _map_correction_scenario
- Signature: def _map_correction_scenario(raw_name) -> str
- Location: lines 62-68
- Async: no
- Inputs: raw_name
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _normalize_risk_level
- Signature: def _normalize_risk_level(compliance_score) -> str
- Location: lines 71-76
- Async: no
- Inputs: compliance_score
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _resolve_analysis_payload
- Signature: def _resolve_analysis_payload(dataset, analysis_id) -> Dict[str, Any]
- Location: lines 79-102
- Async: no
- Inputs: dataset, analysis_id
- Return annotation: Dict[str, Any]
- Docstring: None
- Internal calls: none detected
- External calls: analysis.get, analysis_id.strip, dataset.get, entry.get, str
- Side effects: Primarily computational / in-memory transformation

### _extract_base_fields
- Signature: def _extract_base_fields(dataset) -> Dict[str, str]
- Location: lines 105-111
- Async: no
- Inputs: dataset
- Return annotation: Dict[str, str]
- Docstring: None
- Internal calls: none detected
- External calls: dataset.get, str
- Side effects: Primarily computational / in-memory transformation

### _build_executive_summary
- Signature: def _build_executive_summary(target, sensitive, privileged, unprivileged, di, priv_rate, unpriv_rate) -> str
- Location: lines 114-137
- Async: no
- Inputs: target, sensitive, privileged, unprivileged, di, priv_rate, unpriv_rate
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _strategic_recommendations
- Signature: def _strategic_recommendations(target, risk_level) -> List[Dict[str, str]]
- Location: lines 140-171
- Async: no
- Inputs: target, risk_level
- Return annotation: List[Dict[str, str]]
- Docstring: None
- Internal calls: none detected
- External calls: risk_level.lower
- Side effects: Primarily computational / in-memory transformation

### generate_report
- Signature: async def generate_report(payload, current_user)
- Location: lines 175-342
- Async: yes
- Inputs: payload, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _build_executive_summary, _extract_base_fields, _map_correction_scenario, _normalize_risk_level, _parse_dataset_object_id, _resolve_analysis_payload, _safe_num, _strategic_recommendations
- External calls: BytesIO, Depends, HTTPException, REPORTS_DIR.mkdir, StreamingResponse, abs, analysis_payload.get, audit_intelligence.get, dataset.get, datasets_collection.find_one, datetime.utcnow, generate_governance_compliance_pdf, isinstance, max, mitigation.get, report_path.write_bytes, reports_collection.insert_one, risk_block.get, router.post, str, uuid4
- Side effects: Database read/write operations, Filesystem read/write operations

### get_report_history
- Signature: async def get_report_history(current_user)
- Location: lines 346-352
- Async: yes
- Inputs: current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _serialize_report_history
- External calls: Depends, reports_collection.find, router.get
- Side effects: Database read/write operations

### download_generated_report
- Signature: async def download_generated_report(report_id, current_user)
- Location: lines 356-372
- Async: yes
- Inputs: report_id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, FileResponse, HTTPException, Path, file_path.exists, file_path.is_file, report_doc.get, reports_collection.find_one, router.get, str
- Side effects: Database read/write operations, Filesystem read/write operations


## Classes and Methods (Detailed)
### GenerateReportRequest
- Location: lines 29-31
- Docstring: None
- Methods: 0


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
