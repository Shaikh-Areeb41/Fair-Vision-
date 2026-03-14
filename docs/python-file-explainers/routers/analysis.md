# routers/analysis.py

## Overview
- Source file: FV_backend/routers/analysis.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 23
- Top-level functions: 2
- Classes: 0

## Imports and Dependencies
- from fastapi import APIRouter, Depends, HTTPException
- from routers.auth import get_current_user
- from services.analysis_service import run_analysis

## Top-Level Functions (Detailed)
### _owner_id_from_user
- Signature: def _owner_id_from_user(current_user)
- Location: lines 9-10
- Async: no
- Inputs: current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### train_and_analyze
- Signature: async def train_and_analyze(dataset_id, current_user)
- Location: lines 14-23
- Async: yes
- Inputs: dataset_id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _owner_id_from_user
- External calls: Depends, HTTPException, router.post, run_analysis
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
