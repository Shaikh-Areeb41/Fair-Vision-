"""Analysis service — trains a Logistic Regression model and computes fairness metrics.

All dataset access goes through ``dataset_service.load_full_dataset`` so analysis
always runs on the complete uploaded file, never on truncated preview rows.
"""

from __future__ import annotations

from typing import Any, Dict

from bson import ObjectId
from fastapi import HTTPException
from sklearn.metrics import accuracy_score

from database import datasets_collection
from services.dataset_service import get_dataset_for_owner, load_full_dataset
from services.ml_utils import (
    apply_privileged_group_rules,
    clean_training_dataframe,
    compute_group_metrics,
    encode_dataset,
    fit_logistic_classifier,
)


# ---------------------------------------------------------------------------
# Public service function
# ---------------------------------------------------------------------------


async def run_analysis(dataset_id: str, owner_id: Any) -> Dict[str, Any]:
    """Train a Logistic Regression model and compute group-level fairness metrics.

    Enforces dataset ownership — raises HTTP 404 if *owner_id* does not match.
    Always loads the **full** dataset from disk, not truncated preview rows.
    """
    dataset = await get_dataset_for_owner(dataset_id, owner_id)

    if "target_column" not in dataset or "sensitive_attribute" not in dataset:
        raise HTTPException(
            status_code=400,
            detail="Dataset not configured. Please configure it first.",
        )

    target_col: str = dataset["target_column"]
    sensitive_col: str = dataset["sensitive_attribute"]
    privileged_val = dataset.get("privileged_group")

    df = await load_full_dataset(dataset)
    df = clean_training_dataframe(df)

    if len(df) < 10:
        raise HTTPException(status_code=400, detail="Dataset is too small after cleaning.")

    if target_col not in df.columns or sensitive_col not in df.columns:
        raise HTTPException(status_code=400, detail="Configured columns not found in dataset.")

    privileged_val = apply_privileged_group_rules(df, sensitive_col, privileged_val)

    X, y, encoded_df, class_map = encode_dataset(df, target_col, sensitive_col)
    priv_code = class_map.get(privileged_val)

    model, X_test, y_test = fit_logistic_classifier(X, y)
    y_pred = model.predict(X_test)

    overall_accuracy = float(accuracy_score(y_test, y_pred))

    test_df = encoded_df.loc[X_test.index, [sensitive_col]].copy()
    test_df["actual"] = y_test
    test_df["predicted"] = y_pred

    tpr_p = fpr_p = sr_p = acc_p = prec_p = 0.0
    tpr_u = fpr_u = sr_u = acc_u = prec_u = 0.0
    dpd = fprd = eod = di = 0.0

    if priv_code is not None:
        priv_group = test_df[test_df[sensitive_col] == priv_code]
        unpriv_group = test_df[test_df[sensitive_col] != priv_code]

        tpr_p, fpr_p, sr_p, acc_p, prec_p = compute_group_metrics(
            priv_group["actual"], priv_group["predicted"]
        )
        tpr_u, fpr_u, sr_u, acc_u, prec_u = compute_group_metrics(
            unpriv_group["actual"], unpriv_group["predicted"]
        )

        dpd = abs(sr_p - sr_u)
        fprd = abs(fpr_p - fpr_u)
        eod = abs(tpr_p - tpr_u) + abs(fpr_p - fpr_u)
        di = sr_u / sr_p if sr_p > 0 else 0.0

    result: Dict[str, Any] = {
        "accuracy": round(overall_accuracy, 4),
        "dpd": round(dpd, 4),
        "fprd": round(fprd, 4),
        "eod": round(eod, 4),
        "di": round(di, 4),
        "privileged_rate": round(sr_p, 4),
        "unprivileged_rate": round(sr_u, 4),
        "privileged_accuracy": round(acc_p, 4),
        "unprivileged_accuracy": round(acc_u, 4),
        "privileged_tpr": round(tpr_p, 4),
        "unprivileged_tpr": round(tpr_u, 4),
        "privileged_fpr": round(fpr_p, 4),
        "unprivileged_fpr": round(fpr_u, 4),
        "privileged_precision": round(prec_p, 4),
        "unprivileged_precision": round(prec_u, 4),
        "message": "Analysis complete",
    }

    obj_id = ObjectId(dataset_id)
    await datasets_collection.update_one(
        {"_id": obj_id, "user_id": owner_id},
        {
            "$set": {"analysis": result, "status": "Analyzed"},
            "$push": {"analysis_history": result},
        },
    )
    return result
