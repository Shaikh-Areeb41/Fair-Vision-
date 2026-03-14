# routers/auth.py

## Overview
- Source file: FV_backend/routers/auth.py
- Primary role: HTTP API routing layer (FastAPI endpoints and request/response orchestration).
- Total lines: 631
- Top-level functions: 20
- Classes: 6

## Imports and Dependencies
- from fastapi import APIRouter, HTTPException, Depends, status, Query
- from pydantic import BaseModel, EmailStr, Field, field_validator
- from database import users_collection
- from security import verify_password, get_password_hash, SECRET_KEY, ALGORITHM, create_access_token, create_password_reset_token, verify_password_reset_token
- from jose import jwt, JWTError
- from fastapi.security import OAuth2PasswordBearer
- from fastapi.responses import RedirectResponse
- from datetime import datetime, timedelta
- import hashlib
- import os
- import resend
- import secrets
- from urllib.parse import urlencode
- import httpx
- from pymongo.errors import DuplicateKeyError
- import re

## Top-Level Functions (Detailed)
### _is_strong_password
- Signature: def _is_strong_password(password) -> bool
- Location: lines 32-43
- Async: no
- Inputs: password
- Return annotation: bool
- Docstring: None
- Internal calls: none detected
- External calls: len, re.search
- Side effects: Primarily computational / in-memory transformation

### _build_frontend_url
- Signature: def _build_frontend_url(path) -> str
- Location: lines 91-95
- Async: no
- Inputs: path
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: os.getenv, path.startswith
- Side effects: Primarily computational / in-memory transformation

### _create_oauth_state
- Signature: def _create_oauth_state(provider) -> str
- Location: lines 98-104
- Async: no
- Inputs: provider
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: datetime.utcnow, jwt.encode, secrets.token_urlsafe, timedelta
- Side effects: Primarily computational / in-memory transformation

### _validate_oauth_state
- Signature: def _validate_oauth_state(state, provider) -> None
- Location: lines 107-114
- Async: no
- Inputs: state, provider
- Return annotation: None
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, jwt.decode, payload.get
- Side effects: Primarily computational / in-memory transformation

### _redirect_with_error
- Signature: def _redirect_with_error(message)
- Location: lines 117-119
- Async: no
- Inputs: message
- Return annotation: not specified
- Docstring: None
- Internal calls: _build_frontend_url
- External calls: RedirectResponse, urlencode
- Side effects: Network or external API communication

### _create_or_update_oauth_user
- Signature: async def _create_or_update_oauth_user(email, full_name, provider, profile_image)
- Location: lines 122-152
- Async: yes
- Inputs: email, full_name, provider, profile_image
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: existing_user.get, get_password_hash, secrets.token_urlsafe, updates.get, user_doc.get, users_collection.find_one, users_collection.insert_one, users_collection.update_one
- Side effects: Database read/write operations, Persistent document mutation

### send_email_with_resend
- Signature: def send_email_with_resend(recipient_email, subject, html_body)
- Location: lines 155-169
- Async: no
- Inputs: recipient_email, subject, html_body
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: RuntimeError, os.getenv, resend.Emails.send
- Side effects: Primarily computational / in-memory transformation

### send_reset_email
- Signature: def send_reset_email(recipient_email, reset_link)
- Location: lines 172-192
- Async: no
- Inputs: recipient_email, reset_link
- Return annotation: not specified
- Docstring: None
- Internal calls: send_email_with_resend
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### send_verification_email
- Signature: def send_verification_email(recipient_email, code)
- Location: lines 195-210
- Async: no
- Inputs: recipient_email, code
- Return annotation: not specified
- Docstring: None
- Internal calls: send_email_with_resend
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### get_current_user
- Signature: async def get_current_user(token)
- Location: lines 214-231
- Async: yes
- Inputs: token
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: Depends, HTTPException, jwt.decode, payload.get, users_collection.find_one
- Side effects: Database read/write operations

### register
- Signature: async def register(user)
- Location: lines 235-269
- Async: yes
- Inputs: user
- Return annotation: not specified
- Docstring: None
- Internal calls: send_verification_email
- External calls: HTTPException, datetime.utcnow, get_password_hash, os.getenv, print, router.post, secrets.randbelow, str, timedelta, users_collection.find_one, users_collection.insert_one
- Side effects: Database read/write operations

### verify_email
- Signature: async def verify_email(request)
- Location: lines 273-299
- Async: yes
- Inputs: request
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, datetime.utcnow, db_user.get, router.post, users_collection.find_one, users_collection.update_one
- Side effects: Database read/write operations, Persistent document mutation

### login
- Signature: async def login(user)
- Location: lines 302-326
- Async: yes
- Inputs: user
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: HTTPException, bool, create_access_token, db_user.get, router.post, str, users_collection.find_one, verify_password
- Side effects: Database read/write operations

### google_login
- Signature: async def google_login()
- Location: lines 330-350
- Async: yes
- Inputs: none
- Return annotation: not specified
- Docstring: None
- Internal calls: _create_oauth_state
- External calls: HTTPException, RedirectResponse, os.getenv, router.get, urlencode
- Side effects: Network or external API communication

### google_callback
- Signature: async def google_callback(code, state)
- Location: lines 354-425
- Async: yes
- Inputs: code, state
- Return annotation: not specified
- Docstring: None
- Internal calls: _build_frontend_url, _create_or_update_oauth_user, _redirect_with_error, _validate_oauth_state
- External calls: HTTPException, Query, RedirectResponse, app_user.get, claims.get, client.get, client.post, create_access_token, httpx.AsyncClient, jwt.get_unverified_claims, os.getenv, profile.get, profile_response.json, router.get, token_data.get, token_response.json, urlencode
- Side effects: Network or external API communication

### github_login
- Signature: async def github_login()
- Location: lines 429-444
- Async: yes
- Inputs: none
- Return annotation: not specified
- Docstring: None
- Internal calls: _create_oauth_state
- External calls: HTTPException, RedirectResponse, os.getenv, router.get, urlencode
- Side effects: Network or external API communication

### github_callback
- Signature: async def github_callback(code, state)
- Location: lines 448-531
- Async: yes
- Inputs: code, state
- Return annotation: not specified
- Docstring: None
- Internal calls: _build_frontend_url, _create_or_update_oauth_user, _redirect_with_error, _validate_oauth_state
- External calls: HTTPException, Query, RedirectResponse, app_user.get, client.get, client.post, create_access_token, emails_response.json, entry.get, gh_user.get, httpx.AsyncClient, next, os.getenv, router.get, selected.get, token_data.get, token_response.json, urlencode, user_response.json
- Side effects: Network or external API communication

### change_password
- Signature: async def change_password(request, current_user)
- Location: lines 535-551
- Async: yes
- Inputs: request, current_user
- Return annotation: not specified
- Docstring: None
- Internal calls: _is_strong_password
- External calls: Depends, HTTPException, get_password_hash, router.post, users_collection.update_one, verify_password
- Side effects: Database read/write operations, Persistent document mutation

### forgot_password
- Signature: async def forgot_password(request)
- Location: lines 555-593
- Async: yes
- Inputs: request
- Return annotation: not specified
- Docstring: None
- Internal calls: send_reset_email
- External calls: create_password_reset_token, datetime.utcnow, frontend_url.rstrip, hashlib.sha256, os.getenv, print, reset_token.encode, router.post, timedelta, urlencode, users_collection.find_one, users_collection.update_one
- Side effects: Database read/write operations, Persistent document mutation

### reset_password
- Signature: async def reset_password(request)
- Location: lines 597-631
- Async: yes
- Inputs: request
- Return annotation: not specified
- Docstring: None
- Internal calls: _is_strong_password
- External calls: HTTPException, datetime.utcnow, get_password_hash, hashlib.sha256, request.token.encode, router.post, user.get, users_collection.find_one, users_collection.update_one, verify_password_reset_token
- Side effects: Database read/write operations, Persistent document mutation


## Classes and Methods (Detailed)
### UserLogin
- Location: lines 49-51
- Docstring: None
- Methods: 0

### UserRegister
- Location: lines 53-71
- Docstring: None
- Methods: 2

#### UserRegister.validate_full_name
- Signature: def validate_full_name(cls, value) -> str
- Location: lines 60-64
- Async: no
- Inputs: cls, value
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: ValueError, field_validator, re.fullmatch, value.strip
- Side effects: Primarily computational / in-memory transformation

#### UserRegister.validate_password_strength
- Signature: def validate_password_strength(cls, value) -> str
- Location: lines 68-71
- Async: no
- Inputs: cls, value
- Return annotation: str
- Docstring: None
- Internal calls: _is_strong_password
- External calls: ValueError, field_validator
- Side effects: Primarily computational / in-memory transformation

### ChangePasswordRequest
- Location: lines 73-75
- Docstring: None
- Methods: 0

### ForgotPasswordRequest
- Location: lines 77-79
- Docstring: None
- Methods: 0

### ResetPasswordRequest
- Location: lines 81-83
- Docstring: None
- Methods: 0

### VerifyEmailRequest
- Location: lines 86-88
- Docstring: None
- Methods: 0


## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
