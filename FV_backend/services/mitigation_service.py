"""Mitigation service — threshold-optimisation strategy for demographic parity.

Enforces dataset ownership and reads the full dataset from disk.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
from bson import ObjectId
from fastapi import HTTPException
from sklearn.metrics import accuracy_score

from database import datasets_collection
from services.dataset_service import get_dataset_for_owner, load_full_dataset
from services.ml_utils import (
    clean_training_dataframe,
    compute_binary_group_metrics,
    encode_dataset,
    find_threshold_for_target_rate,
    fit_logistic_classifier,
)


async def run_mitigation(dataset_id: str, owner_id: Any) -> Dict[str, Any]:
    """Apply threshold-optimisation mitigation and persist the result.

    Enforces dataset ownership — raises HTTP 404 if *owner_id* does not match.
    """
    dataset = await get_dataset_for_owner(dataset_id, owner_id)

    df = await load_full_dataset(dataset)
    df = clean_training_dataframe(df)

    config = dataset.get("configuration") or {}
    if not config:
        config = {
            "target_column": dataset.get("target_column"),
            "sensitive_attribute": dataset.get("sensitive_attribute"),
            "privileged_group": dataset.get("privileged_group"),
        }

    target_col = config.get("target_column")
    sensitive_col = config.get("sensitive_attribute")
    priv_group_val = config.get("privileged_group")

    if not target_col or not sensitive_col:
        raise HTTPException(status_code=400, detail="Dataset configuration missing.")

    if target_col not in df.columns or sensitive_col not in df.columns:
        raise HTTPException(status_code=400, detail="Configured columns not found in dataset.")

    X, y, encoded_df, class_map = encode_dataset(df, target_col, sensitive_col)
    priv_code = class_map.get(priv_group_val)

    model, X_test, y_test = fit_logistic_classifier(X, y)
    y_probs = model.predict_proba(X_test)[:, 1]

    test_df = encoded_df.loc[X_test.index, [sensitive_col]].copy()
    test_df["actual"] = y_test
    test_df["prob"] = y_probs

    if priv_code is None:
        priv_code = 1 if 1 in test_df[sensitive_col].unique() else 0

    priv_rows = test_df[test_df[sensitive_col] == priv_code]
    unpriv_rows = test_df[test_df[sensitive_col] != priv_code]

    priv_selection_rate = float((priv_rows["prob"] > 0.5).mean())

    best_thresh = find_threshold_for_target_rate(unpriv_rows["prob"], priv_selection_rate)

    priv_preds = (priv_rows["prob"] > 0.5).astype(int)
    unpriv_preds = (unpriv_rows["prob"] > best_thresh).astype(int)

    acc_p, tpr_p, fpr_p = compute_binary_group_metrics(priv_rows["actual"], priv_preds)
    acc_u, tpr_u, fpr_u = compute_binary_group_metrics(unpriv_rows["actual"], unpriv_preds)

    final_preds = np.concatenate([priv_preds.to_numpy(), unpriv_preds.to_numpy()])
    final_actuals = np.concatenate(
        [priv_rows["actual"].to_numpy(), unpriv_rows["actual"].to_numpy()]
    )
    new_acc = float(accuracy_score(final_actuals, final_preds))
    new_sr_p = float(priv_preds.mean())
    new_sr_u = float(unpriv_preds.mean())
    new_dpd = abs(new_sr_p - new_sr_u)

    result: Dict[str, Any] = {
        "projected_accuracy": round(new_acc, 4),
        "projected_dpd": round(new_dpd, 4),
        "applied_threshold_priv": 0.5,
        "applied_threshold_unpriv": round(best_thresh, 4),
        "privileged_rate": round(new_sr_p, 4),
        "unprivileged_rate": round(new_sr_u, 4),
        "privileged_accuracy": round(acc_p, 4),
        "unprivileged_accuracy": round(acc_u, 4),
        "privileged_tpr": round(tpr_p, 4),
        "unprivileged_tpr": round(tpr_u, 4),
        "privileged_fpr": round(fpr_p, 4),
        "unprivileged_fpr": round(fpr_u, 4),
        "strategy": "Threshold Optimization",
    }

    obj_id = ObjectId(dataset_id)
    await datasets_collection.update_one(
        {"_id": obj_id, "user_id": owner_id},
        {"$set": {"mitigation": result, "status": "Mitigated"}},
    )
    return result
