# routers/admin.py

## Overview
- Source file: FV_backend/routers/admin.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 66
- Top-level functions: 5
- Classes: 0

## Imports and Dependencies
- from bson import ObjectId
- from fastapi import APIRouter, Depends, HTTPException
- from database import datasets_collection, reports_collection, users_collection
- from routers.auth import get_current_user

## Top-Level Functions (Detailed)
### _ensure_test_admin
- Signature: def _ensure_test_admin(current_user) -> None
- Location: lines 11-13
- Async: no
- Inputs: current_user
- Return annotation: None
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, bool, current_user.get
- Side effects: Primarily computational / in-memory transformation

### _parse_object_id
- Signature: def _parse_object_id(value, detail) -> ObjectId
- Location: lines 16-19
- Async: no
- Inputs: value, detail
- Return annotation: ObjectId
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, ObjectId, ObjectId.is_valid
- Side effects: Primarily computational / in-memory transformation

### _serialize_user_row
- Signature: def _serialize_user_row(user_doc, dataset_count) -> dict
- Location: lines 22-28
- Async: no
- Inputs: user_doc, dataset_count
- Return annotation: dict
- Docstring: None
- Internal calls: none detected
- External calls: str, user_doc.get
- Side effects: Primarily computational / in-memory transformation

### list_users
- Signature: async def list_users(current_user)
- Location: lines 32-42
- Async: yes
- Inputs: current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _ensure_test_admin, _serialize_user_row
- External calls: Depends, datasets_collection.count_documents, router.get, user_doc.get, users.append, users_collection.find
- Side effects: Database read/write operations

### delete_user
- Signature: async def delete_user(user_id, current_user)
- Location: lines 46-66
- Async: yes
- Inputs: user_id, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _ensure_test_admin, _parse_object_id
- External calls: Depends, HTTPException, current_user.get, datasets_collection.delete_many, reports_collection.delete_many, router.delete, target_user.get, users_collection.delete_one, users_collection.find_one
- Side effects: Database read/write operations


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
