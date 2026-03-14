# services/mitigation_service.py

## Overview
- Source file: FV_backend/services/mitigation_service.py
- Primary role: Business logic layer called by routers; contains operational workflows and data processing.
- Total lines: 110
- Top-level functions: 1
- Classes: 0
- Module note: Mitigation service — threshold-optimisation strategy for demographic parity.

Enforces dataset ownership and reads the full dataset from disk.

## Imports and Dependencies
- from __future__ import annotations
- from typing import Any, Dict
- import numpy as np
- from bson import ObjectId
- from fastapi import HTTPException
- from sklearn.metrics import accuracy_score
- from database import datasets_collection
- from services.dataset_service import get_dataset_for_owner, load_full_dataset
- from services.ml_utils import clean_training_dataframe, compute_binary_group_metrics, encode_dataset, find_threshold_for_target_rate, fit_logistic_classifier

## Top-Level Functions (Detailed)
### run_mitigation
- Signature: async def run_mitigation(dataset_id, owner_id) -> Dict[str, Any]
- Location: lines 26-110
- Async: yes
- Inputs: dataset_id, owner_id
- Return annotation: Dict[str, Any]
- Docstring: Apply threshold-optimisation mitigation and persist the result.

Enforces dataset ownership — raises HTTP 404 if *owner_id* does not match.
- Internal calls: none detected
- External calls: HTTPException, ObjectId, abs, accuracy_score, class_map.get, clean_training_dataframe, compute_binary_group_metrics, config.get, dataset.get, datasets_collection.update_one, encode_dataset, find_threshold_for_target_rate, fit_logistic_classifier, float, get_dataset_for_owner, load_full_dataset, model.predict_proba, np.concatenate, priv_preds.mean, priv_preds.to_numpy, round, unpriv_preds.mean, unpriv_preds.to_numpy
- Side effects: Database read/write operations, Persistent document mutation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
