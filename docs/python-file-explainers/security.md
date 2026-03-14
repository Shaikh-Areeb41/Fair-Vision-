# security.py

## Overview
- Source file: FV_backend/security.py
- Primary role: Authentication and credential security helpers.
- Total lines: 58
- Top-level functions: 6
- Classes: 0

## Imports and Dependencies
- import os
- import hashlib
- from datetime import datetime, timedelta
- from typing import Optional
- from jose import JWTError, jwt
- from passlib.context import CryptContext

## Top-Level Functions (Detailed)
### _prehash_password
- Signature: def _prehash_password(password) -> str
- Location: lines 22-23
- Async: no
- Inputs: password
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: hashlib.sha256, password.encode
- Side effects: Primarily computational / in-memory transformation

### verify_password
- Signature: def verify_password(plain_password, hashed_password) -> bool
- Location: lines 26-27
- Async: no
- Inputs: plain_password, hashed_password
- Return annotation: bool
- Docstring: None
- Internal calls: _prehash_password
- External calls: pwd_context.verify
- Side effects: Primarily computational / in-memory transformation

### get_password_hash
- Signature: def get_password_hash(password) -> str
- Location: lines 30-31
- Async: no
- Inputs: password
- Return annotation: str
- Docstring: None
- Internal calls: _prehash_password
- External calls: pwd_context.hash
- Side effects: Primarily computational / in-memory transformation

### create_access_token
- Signature: def create_access_token(data) -> str
- Location: lines 34-38
- Async: no
- Inputs: data
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: data.copy, datetime.utcnow, jwt.encode, timedelta, to_encode.update
- Side effects: Primarily computational / in-memory transformation

### create_password_reset_token
- Signature: def create_password_reset_token(email) -> str
- Location: lines 41-48
- Async: no
- Inputs: email
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: datetime.utcnow, jwt.encode, timedelta
- Side effects: Primarily computational / in-memory transformation

### verify_password_reset_token
- Signature: def verify_password_reset_token(token) -> Optional[str]
- Location: lines 51-58
- Async: no
- Inputs: token
- Return annotation: Optional[str]
- Docstring: None
- Internal calls: none detected
- External calls: jwt.decode, payload.get
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
