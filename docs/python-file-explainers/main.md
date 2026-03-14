# main.py

## Overview
- Source file: FV_backend/main.py
- Primary role: Application bootstrap and router wiring entry point.
- Total lines: 111
- Top-level functions: 4
- Classes: 0

## Imports and Dependencies
- from fastapi import FastAPI
- from fastapi.middleware.cors import CORSMiddleware
- import os
- from datetime import datetime
- from pymongo import ASCENDING
- from routers import datasets
- from routers import analysis
- from routers import auth
- from routers import mitigation
- from routers import audit_intelligence
- from routers import reports
- from routers import admin
- from database import users_collection, reports_collection, datasets_collection
- from security import get_password_hash

## Top-Level Functions (Detailed)
### get_allowed_origins
- Signature: def get_allowed_origins() -> list[str]
- Location: lines 25-41
- Async: no
- Inputs: none
- Return annotation: list[str]
- Docstring: None
- Internal calls: none detected
- External calls: default_origins.append, frontend_url.rstrip, os.getenv
- Side effects: Primarily computational / in-memory transformation

### bootstrap_admin_user
- Signature: async def bootstrap_admin_user() -> None
- Location: lines 44-74
- Async: yes
- Inputs: none
- Return annotation: None
- Docstring: None
- Internal calls: none detected
- External calls: datetime.utcnow, get_password_hash, users_collection.find_one, users_collection.insert_one, users_collection.update_one
- Side effects: Database read/write operations, Persistent document mutation

### startup_indexes
- Signature: async def startup_indexes()
- Location: lines 97-107
- Async: yes
- Inputs: none
- Return annotation: not specified
- Docstring: None
- Internal calls: bootstrap_admin_user
- External calls: app.on_event, datasets_collection.create_index, reports_collection.create_index, users_collection.create_index
- Side effects: Database read/write operations

### read_root
- Signature: def read_root()
- Location: lines 110-111
- Async: no
- Inputs: none
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: app.get
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
