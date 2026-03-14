# services/dataset_service.py

## Overview
- Source file: FV_backend/services/dataset_service.py
- Primary role: Business logic layer called by routers; contains operational workflows and data processing.
- Total lines: 265
- Top-level functions: 11
- Classes: 0
- Module note: Dataset persistence service.

Responsibilities
----------------
* Upload: parse CSV, store raw bytes to filesystem, upsert metadata/preview in MongoDB.
* Load: read the full dataset from filesystem (primary) or fallback to legacy in-DB rows.
* CRUD helpers (list, get with ownership, configure, delete) shared across routers.

The filesystem root is ``FV_backend/stored_datasets/{owner_id}/{uuid}_{filename}``.
MongoDB stores only metadata, preview rows (≤1 000), and analysis results — never the
full dataset, avoiding the 16 MB BSON document limit.

## Imports and Dependencies
- from __future__ import annotations
- from datetime import datetime
- from io import BytesIO
- from pathlib import Path
- from typing import Any, Dict, List, Optional
- from uuid import uuid4
- import pandas as pd
- from bson import ObjectId
- from fastapi import HTTPException
- from database import datasets_collection

## Top-Level Functions (Detailed)
### normalize_dataset_name
- Signature: def normalize_dataset_name(name) -> str
- Location: lines 37-39
- Async: no
- Inputs: name
- Return annotation: str
- Docstring: Lowercase, collapse whitespace — used as a deduplication key.
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### serialize_dataset
- Signature: def serialize_dataset(doc) -> Optional[Dict[str, Any]]
- Location: lines 42-50
- Async: no
- Inputs: doc
- Return annotation: Optional[Dict[str, Any]]
- Docstring: Convert a raw MongoDB document to a JSON-safe dict.
- Internal calls: none detected
- External calls: dict, isinstance, serialized.get, serialized.pop, str
- Side effects: Primarily computational / in-memory transformation

### ensure_valid_object_id
- Signature: def ensure_valid_object_id(value, detail) -> ObjectId
- Location: lines 53-56
- Async: no
- Inputs: value, detail
- Return annotation: ObjectId
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, ObjectId, ObjectId.is_valid
- Side effects: Primarily computational / in-memory transformation

### get_dataset_for_owner
- Signature: async def get_dataset_for_owner(dataset_id, owner_id, projection, not_found_detail) -> Dict[str, Any]
- Location: lines 64-77
- Async: yes
- Inputs: dataset_id, owner_id, projection, not_found_detail
- Return annotation: Dict[str, Any]
- Docstring: Fetch a dataset document belonging exclusively to *owner_id*.
- Internal calls: ensure_valid_object_id
- External calls: HTTPException, datasets_collection.find_one
- Side effects: Database read/write operations

### list_datasets_for_owner
- Signature: async def list_datasets_for_owner(owner_id, limit) -> List[Dict[str, Any]]
- Location: lines 80-82
- Async: yes
- Inputs: owner_id, limit
- Return annotation: List[Dict[str, Any]]
- Docstring: None
- Internal calls: none detected
- External calls: cursor.to_list, datasets_collection.find
- Side effects: Database read/write operations

### store_preview
- Signature: def store_preview(df, limit) -> List[Dict[str, Any]]
- Location: lines 90-91
- Async: no
- Inputs: df, limit
- Return annotation: List[Dict[str, Any]]
- Docstring: None
- Internal calls: none detected
- External calls: df.head
- Side effects: Primarily computational / in-memory transformation

### store_full_dataset
- Signature: async def store_full_dataset(file_bytes, filename, owner_id) -> str
- Location: lines 94-102
- Async: yes
- Inputs: file_bytes, filename, owner_id
- Return annotation: str
- Docstring: Write raw CSV bytes to disk and return the absolute file path.
- Internal calls: none detected
- External calls: Path, owner_dir.mkdir, storage_path.write_bytes, str, uuid4
- Side effects: Filesystem read/write operations

### load_full_dataset
- Signature: async def load_full_dataset(dataset_doc) -> pd.DataFrame
- Location: lines 105-146
- Async: yes
- Inputs: dataset_doc
- Return annotation: pd.DataFrame
- Docstring: Load the complete dataset, falling back gracefully through storage tiers.

Priority:
1. ``full_dataset_path`` — filesystem storage (current default)
2. ``full_data``         — legacy in-document storage (MongoDB)
3. ``preview``           — last-resort fallback with a warning

Raises ``HTTPException(400)`` when no data source is available.
- Internal calls: none detected
- External calls: HTTPException, Path, dataset_doc.get, path.exists, path.is_file, pd.DataFrame, pd.read_csv, str
- Side effects: Filesystem read/write operations

### upload_dataset
- Signature: async def upload_dataset(file_bytes, filename, owner_id) -> Dict[str, Any]
- Location: lines 154-197
- Async: yes
- Inputs: file_bytes, filename, owner_id
- Return annotation: Dict[str, Any]
- Docstring: Validate, store, and register a new dataset. Returns the MongoDB document.
- Internal calls: normalize_dataset_name, store_full_dataset, store_preview
- External calls: BytesIO, HTTPException, Path, datasets_collection.find_one, datasets_collection.insert_one, datetime.utcnow, df.columns.tolist, filename.lower, int, len, pd.read_csv, str
- Side effects: Database read/write operations, Filesystem read/write operations

### save_dataset_configuration
- Signature: async def save_dataset_configuration(dataset_id, owner_id, config) -> None
- Location: lines 200-248
- Async: yes
- Inputs: dataset_id, owner_id, config
- Return annotation: None
- Docstring: Persist dataset configuration (target column, sensitive attributes, groups).
- Internal calls: get_dataset_for_owner, normalize_dataset_name
- External calls: HTTPException, Path, config.get, dataset.get, datasets_collection.find_one, datasets_collection.update_one, str
- Side effects: Database read/write operations, Filesystem read/write operations, Persistent document mutation

### delete_dataset_for_owner
- Signature: async def delete_dataset_for_owner(dataset_id, owner_id) -> None
- Location: lines 251-265
- Async: yes
- Inputs: dataset_id, owner_id
- Return annotation: None
- Docstring: Delete the dataset document and its on-disk file.
- Internal calls: get_dataset_for_owner
- External calls: HTTPException, Path, dataset.get, datasets_collection.delete_one, path.exists, path.is_file, path.unlink, str
- Side effects: Database read/write operations, Filesystem read/write operations


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
