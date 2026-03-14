# models.py

## Overview
- Source file: FV_backend/models.py
- Primary role: Pydantic data models and validation schemas.
- Total lines: 73
- Top-level functions: 1
- Classes: 4

## Imports and Dependencies
- from pydantic import BaseModel, Field, BeforeValidator, EmailStr, field_validator
- from datetime import datetime
- from typing import List, Dict, Optional, Any
- from typing_extensions import Annotated
- import re

## Top-Level Functions (Detailed)
### _is_strong_password
- Signature: def _is_strong_password(password) -> bool
- Location: lines 9-20
- Async: no
- Inputs: password
- Return annotation: bool
- Docstring: None
- Internal calls: none detected
- External calls: len, re.search
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
### DatasetModel
- Location: lines 23-33
- Docstring: None
- Methods: 0

### UserCreate
- Location: lines 37-55
- Docstring: None
- Methods: 2

#### UserCreate.validate_full_name
- Signature: def validate_full_name(cls, value) -> str
- Location: lines 44-48
- Async: no
- Inputs: cls, value
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: ValueError, field_validator, re.fullmatch, value.strip
- Side effects: Primarily computational / in-memory transformation

#### UserCreate.validate_password_strength
- Signature: def validate_password_strength(cls, value) -> str
- Location: lines 52-55
- Async: no
- Inputs: cls, value
- Return annotation: str
- Docstring: None
- Internal calls: _is_strong_password
- External calls: ValueError, field_validator
- Side effects: Primarily computational / in-memory transformation

### UserLogin
- Location: lines 57-59
- Docstring: None
- Methods: 0

### UserInDB
- Location: lines 61-73
- Docstring: None
- Methods: 0


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
