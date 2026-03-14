# services/analysis_service.py

## Overview
- Source file: FV_backend/services/analysis_service.py
- Primary role: Business logic layer called by routers; contains operational workflows and data processing.
- Total lines: 119
- Top-level functions: 1
- Classes: 0
- Module note: Analysis service — trains a Logistic Regression model and computes fairness metrics.

All dataset access goes through ``dataset_service.load_full_dataset`` so analysis
always runs on the complete uploaded file, never on truncated preview rows.

## Imports and Dependencies
- from __future__ import annotations
- from typing import Any, Dict
- from bson import ObjectId
- from fastapi import HTTPException
- from sklearn.metrics import accuracy_score
- from database import datasets_collection
- from services.dataset_service import get_dataset_for_owner, load_full_dataset
- from services.ml_utils import apply_privileged_group_rules, clean_training_dataframe, compute_group_metrics, encode_dataset, fit_logistic_classifier

## Top-Level Functions (Detailed)
### run_analysis
- Signature: async def run_analysis(dataset_id, owner_id) -> Dict[str, Any]
- Location: lines 31-119
- Async: yes
- Inputs: dataset_id, owner_id
- Return annotation: Dict[str, Any]
- Docstring: Train a Logistic Regression model and compute group-level fairness metrics.

Enforces dataset ownership — raises HTTP 404 if *owner_id* does not match.
Always loads the **full** dataset from disk, not truncated preview rows.
- Internal calls: none detected
- External calls: HTTPException, ObjectId, abs, accuracy_score, apply_privileged_group_rules, class_map.get, clean_training_dataframe, compute_group_metrics, dataset.get, datasets_collection.update_one, encode_dataset, fit_logistic_classifier, float, get_dataset_for_owner, len, load_full_dataset, model.predict, round
- Side effects: Database read/write operations, Persistent document mutation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
