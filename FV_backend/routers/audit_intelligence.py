from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from audit_intelligence.explainability_engine import generate_fairness_explanations
from audit_intelligence.fairness_metrics import compute_fairness_drift, compute_multi_attribute_fairness
from audit_intelligence.intersectional_analysis import analyze_intersectional_bias
from audit_intelligence.risk_scoring import compute_ethical_risk_score
from database import datasets_collection
from routers.auth import get_current_user
from services.dataset_service import get_dataset_for_owner, load_full_dataset


router = APIRouter(prefix="/api/audit-intelligence", tags=["Audit Intelligence"])


class AuditIntelligenceRequest(BaseModel):
    sensitive_attributes: List[str] = Field(min_length=1)
    target_column: Optional[str] = None
    outcome_column: Optional[str] = None
    actual_column: Optional[str] = None
    positive_label: Optional[Any] = None
    correlation_threshold: float = 0.25
    report_title: str = "Ethical AI Fairness Intelligence Report"


def _parse_dataset_id(dataset_id: str) -> ObjectId:
    if not ObjectId.is_valid(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID")
    return ObjectId(dataset_id)


def _validate_columns(
    df: pd.DataFrame,
    sensitive_attributes: List[str],
    outcome_column: str,
    actual_column: Optional[str],
) -> None:
    if not outcome_column or outcome_column not in df.columns:
        raise HTTPException(status_code=400, detail="Outcome column not found in dataset")

    missing_attributes = [attribute for attribute in sensitive_attributes if attribute not in df.columns]
    if missing_attributes:
        raise HTTPException(status_code=400, detail=f"Sensitive attribute(s) not found: {', '.join(missing_attributes)}")

    if actual_column and actual_column not in df.columns:
        raise HTTPException(status_code=400, detail="Actual column not found in dataset")


def _extract_history_points(datasets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    points: List[Dict[str, Any]] = []
    for dataset in datasets:
        audit = dataset.get("audit_intelligence") or {}
        score = audit.get("fairness", {}).get("global_fairness_score")
        risk = audit.get("risk_scoring", {}).get("risk_level")
        timestamp = audit.get("generated_at")
        if score is None:
            continue
        points.append(
            {
                "dataset_id": str(dataset.get("_id", "")),
                "timestamp": timestamp,
                "global_fairness_score": score,
                "risk_classification": risk,
            }
        )
    return points


def _build_noop_proxy_payload(df: pd.DataFrame, sensitive_attributes: List[str], outcome_column: str) -> Dict[str, Any]:
    feature_columns = [
        col
        for col in df.columns
        if col not in set(sensitive_attributes + ([outcome_column] if outcome_column else []))
    ]

    nodes = [
        *[{"id": attribute, "type": "sensitive"} for attribute in sensitive_attributes],
        *[{"id": feature, "type": "feature"} for feature in feature_columns],
    ]

    return {
        "nodes": nodes,
        "edges": [],
        "top_correlations": [],
        "method_summary": {
            attribute: {
                "pearson_flags": 0,
                "cramers_v_flags": 0,
                "mutual_information_flags": 0,
                "model_auc_flags": 0,
            }
            for attribute in sensitive_attributes
        },
    }


@router.post("/{dataset_id}/analyze")
async def run_audit_intelligence(
    dataset_id: str,
    payload: AuditIntelligenceRequest,
    current_user: dict = Depends(get_current_user),
):
    obj_id = _parse_dataset_id(dataset_id)
    dataset = await get_dataset_for_owner(dataset_id, current_user["_id"])

    df = await load_full_dataset(dataset)
    df = df.dropna(how="all")
    if df.empty:
        raise HTTPException(status_code=400, detail="Dataset is empty after preprocessing")

    target_column = payload.target_column or dataset.get("target_column")
    outcome_column = payload.outcome_column or target_column
    actual_column = payload.actual_column
    _validate_columns(
        df=df,
        sensitive_attributes=payload.sensitive_attributes,
        outcome_column=outcome_column,
        actual_column=actual_column,
    )

    fairness_payload = compute_multi_attribute_fairness(
        df=df,
        sensitive_attributes=payload.sensitive_attributes,
        outcome_column=outcome_column,
        actual_column=actual_column,
        positive_label=payload.positive_label,
    )

    intersectional_payload = analyze_intersectional_bias(
        df=df,
        sensitive_attributes=payload.sensitive_attributes,
        outcome_column=outcome_column,
        positive_label=payload.positive_label,
    )

    proxy_payload = _build_noop_proxy_payload(
        df=df,
        sensitive_attributes=payload.sensitive_attributes,
        outcome_column=outcome_column,
    )

    user_datasets = await datasets_collection.find({"user_id": current_user["_id"]}).sort("upload_date", 1).to_list(length=500)
    history_points = _extract_history_points(user_datasets)

    drift_payload = compute_fairness_drift(
        history_points=history_points,
        current_score=float(fairness_payload.get("global_fairness_score", 0)),
    )

    risk_payload = compute_ethical_risk_score(fairness_payload=fairness_payload, drift_payload=drift_payload)

    explanations = generate_fairness_explanations(
        fairness_payload=fairness_payload,
        intersectional_payload=intersectional_payload,
        proxy_payload=proxy_payload,
        risk_payload=risk_payload,
    )

    generated_at = datetime.utcnow().isoformat()
    report_payload = {
        "title": payload.report_title,
        "summary": {
            "dataset_name": dataset.get("filename", "Audit Session"),
            "global_fairness_score": fairness_payload.get("global_fairness_score", 0),
            "compliance_score": risk_payload.get("compliance_score", 0),
            "risk_level": risk_payload.get("risk_level", "Unknown"),
        },
        "comparison_matrix": fairness_payload.get("comparison_matrix", []),
        "explanations": explanations,
    }

    result = {
        "generated_at": generated_at,
        "request": payload.model_dump(),
        "fairness": fairness_payload,
        "intersectional": intersectional_payload,
        "proxy_bias": proxy_payload,
        "risk_scoring": risk_payload,
        "drift": drift_payload,
        "explanations": explanations,
        "report": report_payload,
    }

    await datasets_collection.update_one(
        {"_id": obj_id, "user_id": current_user["_id"]},
        {
            "$set": {"audit_intelligence": result},
            "$push": {"audit_intelligence_history": result},
        },
    )

    return result


@router.get("/{dataset_id}/latest")
async def get_latest_audit_intelligence(dataset_id: str, current_user: dict = Depends(get_current_user)):
    obj_id = _parse_dataset_id(dataset_id)
    dataset = await datasets_collection.find_one({"_id": obj_id, "user_id": current_user["_id"]})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    audit_payload = dataset.get("audit_intelligence")
    if not audit_payload:
        raise HTTPException(status_code=404, detail="No audit intelligence found for this dataset")

    return audit_payload


@router.get("/history/timeline")
async def get_audit_timeline(current_user: dict = Depends(get_current_user)):
    datasets = await datasets_collection.find({"user_id": current_user["_id"]}).sort("upload_date", 1).to_list(length=500)
    points = _extract_history_points(datasets)
    return {"timeline": points}
