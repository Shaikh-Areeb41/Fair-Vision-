# routers/datasets.py

## Overview
- Source file: FV_backend/routers/datasets.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 74
- Top-level functions: 5
- Classes: 1
- Module note: Datasets router — thin HTTP layer that delegates to dataset_service.

## Imports and Dependencies
- from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
- from pydantic import BaseModel
- from typing import Optional
- from routers.auth import get_current_user
- from services.dataset_service import delete_dataset_for_owner, get_dataset_for_owner, list_datasets_for_owner, save_dataset_configuration, serialize_dataset, upload_dataset

## Top-Level Functions (Detailed)
### upload_dataset_endpoint
- Signature: async def upload_dataset_endpoint(file, current_user)
- Location: lines 30-42
- Async: yes
- Inputs: file, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, File, file.read, router.post, str, upload_dataset
- Side effects: Primarily computational / in-memory transformation

### get_user_history
- Signature: async def get_user_history(current_user)
- Location: lines 47-49
- Async: yes
- Inputs: current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, list_datasets_for_owner, router.get, serialize_dataset
- Side effects: Primarily computational / in-memory transformation

### get_dataset_details
- Signature: async def get_dataset_details(id, current_user)
- Location: lines 54-56
- Async: yes
- Inputs: id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, get_dataset_for_owner, router.get, serialize_dataset
- Side effects: Primarily computational / in-memory transformation

### configure_dataset
- Signature: async def configure_dataset(id, config, current_user)
- Location: lines 61-67
- Async: yes
- Inputs: id, config, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, config.model_dump, router.post, save_dataset_configuration
- Side effects: Primarily computational / in-memory transformation

### delete_dataset_endpoint
- Signature: async def delete_dataset_endpoint(id, current_user)
- Location: lines 72-74
- Async: yes
- Inputs: id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, delete_dataset_for_owner, router.delete
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
### ConfigureDatasetRequest
- Location: lines 20-25
- Docstring: None
- Methods: 0


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
