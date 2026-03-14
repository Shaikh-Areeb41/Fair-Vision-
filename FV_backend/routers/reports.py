from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from audit_intelligence.governance_report_generator import (
    DISPARITY_DI_THRESHOLD,
    DISPARITY_DPD_THRESHOLD,
    generate_governance_compliance_pdf,
)
from database import datasets_collection, reports_collection
from routers.auth import get_current_user


router = APIRouter(prefix="/api/reports", tags=["Reports"])

SIGNIFICANT_CORRECTION_THRESHOLD = 0.2
REPORTS_DIR = Path(__file__).resolve().parents[1] / "generated_reports"


class GenerateReportRequest(BaseModel):
    dataset_id: str = Field(min_length=1)
    analysis_id: str = Field(min_length=1)


def _parse_dataset_object_id(dataset_id: str) -> ObjectId:
    if not ObjectId.is_valid(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID")
    return ObjectId(dataset_id)


def _serialize_report_history(report_doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "report_id": str(report_doc.get("report_id") or ""),
        "dataset_id": str(report_doc.get("dataset_id") or ""),
        "dataset_name": str(report_doc.get("dataset_name") or "Audit Session"),
        "generated_at": report_doc.get("generated_at").isoformat() if isinstance(report_doc.get("generated_at"), datetime) else str(report_doc.get("generated_at") or ""),
        "risk_level": str(report_doc.get("risk_level") or "Unknown"),
        "fairness_score": round(_safe_num(report_doc.get("fairness_score"), default=0.0), 4),
        "compliance_score": round(_safe_num(report_doc.get("compliance_score"), default=0.0), 2),
    }


def _safe_num(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        if parsed != parsed:
            return default
        return parsed
    except (TypeError, ValueError):
        return default


def _map_correction_scenario(raw_name: Optional[str]) -> str:
    value = (raw_name or "").lower()
    if "reweigh" in value:
        return "Representation balancing scenario"
    if "sampling" in value:
        return "Coverage expansion scenario"
    return "Structural correction scenario"


def _normalize_risk_level(compliance_score: float) -> str:
    if compliance_score >= 75:
        return "Low"
    if compliance_score >= 50:
        return "Medium"
    return "High"


def _resolve_analysis_payload(dataset: Dict[str, Any], analysis_id: str) -> Dict[str, Any]:
    normalized = analysis_id.strip().lower()

    analysis = dataset.get("analysis") or {}
    if normalized in {"latest", "current", "analysis"}:
        return analysis

    if analysis and str(analysis.get("analysis_id", "")).lower() == normalized:
        return analysis

    for entry in dataset.get("analysis_history") or []:
        candidate_id = str(entry.get("analysis_id") or entry.get("id") or "").lower()
        if candidate_id == normalized:
            return entry

    if normalized in {"latest-intelligence", "intelligence"}:
        return dataset.get("audit_intelligence") or analysis

    for entry in dataset.get("audit_intelligence_history") or []:
        candidate_id = str(entry.get("analysis_id") or entry.get("generated_at") or "").lower()
        if candidate_id == normalized:
            return entry

    return analysis


def _extract_base_fields(dataset: Dict[str, Any]) -> Dict[str, str]:
    return {
        "target": str(dataset.get("target_column") or "Organizational Outcome"),
        "sensitive": str(dataset.get("sensitive_attribute") or "Demographic Attribute"),
        "privileged": str(dataset.get("privileged_group") or "Privileged Group"),
        "unprivileged": str(dataset.get("unprivileged_group") or "Underrepresented Group"),
    }


def _build_executive_summary(
    target: str,
    sensitive: str,
    privileged: str,
    unprivileged: str,
    di: float,
    priv_rate: float,
    unpriv_rate: float,
) -> str:
    gap = (priv_rate - unpriv_rate) * 100
    if di < DISPARITY_DI_THRESHOLD:
        return (
            f"This governance audit reviewed organizational outcomes for {target} across {sensitive}. "
            f"Historical selection rates are {priv_rate * 100:.1f}% for {privileged} and {unpriv_rate * 100:.1f}% for {unprivileged}, "
            f"with a fairness gap of {gap:.1f}%. The equity ratio ({di:.2f}) is below the accepted operating threshold, "
            "indicating structural imbalance in decision outcomes that requires governance intervention."
        )

    return (
        f"This governance audit reviewed organizational outcomes for {target} across {sensitive}. "
        f"Historical selection rates are {priv_rate * 100:.1f}% for {privileged} and {unpriv_rate * 100:.1f}% for {unprivileged}, "
        f"with a fairness gap of {gap:.1f}%. The equity ratio ({di:.2f}) meets the accepted operating threshold, "
        "with no immediate structural risk signal requiring escalation."
    )


def _strategic_recommendations(target: str, risk_level: str) -> List[Dict[str, str]]:
    if risk_level.lower() == "low":
        return [
            {
                "title": "Sustainability Controls",
                "content": (
                    f"Maintain quarterly governance monitoring for {target} and confirm subgroup parity remains stable "
                    "as operational volumes change."
                ),
            },
            {
                "title": "Documentation Discipline",
                "content": (
                    "Continue maintaining decision traceability records and subgroup-level audit logs to preserve compliance readiness."
                ),
            },
        ]

    return [
        {
            "title": "Root Cause Review",
            "content": (
                "Conduct targeted review of policy criteria and intake routing that may be amplifying historical decision imbalance."
            ),
        },
        {
            "title": "Governance Checkpoints",
            "content": (
                "Require human oversight for borderline adverse outcomes until subgroup disparity remains within acceptable thresholds."
            ),
        },
    ]


@router.post("/generate")
async def generate_report(
    payload: GenerateReportRequest,
    current_user: dict = Depends(get_current_user),
):
    dataset_obj_id = _parse_dataset_object_id(payload.dataset_id)
    dataset = await datasets_collection.find_one(
        {"_id": dataset_obj_id, "user_id": current_user["_id"]}
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    analysis_payload = _resolve_analysis_payload(dataset, payload.analysis_id)
    if not analysis_payload:
        raise HTTPException(status_code=404, detail="No analysis results found")

    audit_intelligence = dataset.get("audit_intelligence") or {}

    base_fields = _extract_base_fields(dataset)
    target = base_fields["target"]
    sensitive = base_fields["sensitive"]
    privileged = base_fields["privileged"]
    unprivileged = base_fields["unprivileged"]

    di = _safe_num(analysis_payload.get("di"))
    dpd = _safe_num(analysis_payload.get("dpd"))
    accuracy = _safe_num(analysis_payload.get("accuracy"))
    privileged_rate = _safe_num(analysis_payload.get("privileged_rate"))
    unprivileged_rate = _safe_num(analysis_payload.get("unprivileged_rate"))

    risk_block = audit_intelligence.get("risk_scoring") or {}
    compliance_score = _safe_num(risk_block.get("compliance_score"), default=0.0)
    risk_level = str(risk_block.get("risk_level") or _normalize_risk_level(compliance_score))

    mitigation = (analysis_payload.get("mitigation") or dataset.get("mitigation") or {}) if isinstance(analysis_payload, dict) else {}
    corrected_dpd = mitigation.get("projected_dpd", mitigation.get("mitigated_dpd"))
    corrected_acc = mitigation.get("projected_accuracy", mitigation.get("mitigated_accuracy"))
    has_correction_simulation = corrected_dpd is not None

    correction_improvement_ratio = 0.0
    if has_correction_simulation and abs(dpd) > 0:
        correction_improvement_ratio = max(
            0.0,
            (abs(dpd) - abs(_safe_num(corrected_dpd))) / abs(dpd),
        )

    disparity_exceeded = di < DISPARITY_DI_THRESHOLD or abs(dpd) > DISPARITY_DPD_THRESHOLD
    correction_significant = (
        disparity_exceeded
        and has_correction_simulation
        and correction_improvement_ratio >= SIGNIFICANT_CORRECTION_THRESHOLD
        and abs(_safe_num(corrected_dpd)) < abs(dpd)
    )
    advisory_required = disparity_exceeded and has_correction_simulation and not correction_significant

    comparison_matrix = (
        audit_intelligence.get("fairness", {}).get("comparison_matrix", [])
        if isinstance(audit_intelligence, dict)
        else []
    )
    fairness_score = _safe_num(
        audit_intelligence.get("fairness", {}).get("global_fairness_score")
        if isinstance(audit_intelligence, dict)
        else None,
        default=0.0,
    )
    intersectional_combinations = (
        audit_intelligence.get("intersectional", {}).get("combinations", [])
        if isinstance(audit_intelligence, dict)
        else []
    )

    glossary = [
        {
            "term": "Equity ratio (DI)",
            "def": "Compares selection rates between groups. Values below 0.80 indicate potential structural disparity risk.",
        },
        {
            "term": "Demographic disparity (DPD)",
            "def": "Difference in selection rates across groups. Values near 0 indicate more balanced outcomes.",
        },
        {
            "term": "Combined attribute risk",
            "def": "Intersectional analysis across multiple demographic attributes to detect high-risk subgroup outcome patterns.",
        },
    ]

    recommendations = _strategic_recommendations(target, risk_level)

    executive_summary = _build_executive_summary(
        target=target,
        sensitive=sensitive,
        privileged=privileged,
        unprivileged=unprivileged,
        di=di,
        priv_rate=privileged_rate,
        unpriv_rate=unprivileged_rate,
    )

    risk_banner_message = (
        "Dataset shows measurable demographic disparity. Organizational review is recommended before automated deployment."
        if disparity_exceeded
        else "Current outcome disparity is within defined governance thresholds. Continue periodic oversight before scaling automation."
    )

    report_payload = {
        "dataset_name": str(dataset.get("filename") or "Audit Session"),
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d"),
        "fairness_score": fairness_score,
        "di": di,
        "dpd": dpd,
        "accuracy": accuracy,
        "compliance_score": compliance_score,
        "risk_level": risk_level,
        "risk_banner_message": risk_banner_message,
        "target": target,
        "sensitive": sensitive,
        "privileged": privileged,
        "unprivileged": unprivileged,
        "privileged_rate": privileged_rate,
        "unprivileged_rate": unprivileged_rate,
        "executive_summary": executive_summary,
        "comparison_matrix": comparison_matrix,
        "intersectional_combinations": intersectional_combinations,
        "has_correction_simulation": has_correction_simulation,
        "corrected_dpd": _safe_num(corrected_dpd),
        "corrected_acc": _safe_num(corrected_acc),
        "correction_improvement_ratio": correction_improvement_ratio,
        "correction_scenario_name": _map_correction_scenario(str(mitigation.get("technique") or "")),
        "correction_significant": correction_significant,
        "advisory_required": advisory_required,
        "recommendations": recommendations,
        "glossary": glossary,
    }

    pdf_bytes = generate_governance_compliance_pdf(report_payload)

    report_id = str(uuid4())
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"{report_id}.pdf"
    report_path.write_bytes(pdf_bytes)

    metadata = {
        "report_id": report_id,
        "dataset_id": payload.dataset_id,
        "dataset_name": str(dataset.get("filename") or "Audit Session"),
        "analysis_id": payload.analysis_id,
        "user_id": current_user["_id"],
        "generated_at": datetime.utcnow(),
        "risk_level": risk_level,
        "fairness_score": fairness_score,
        "compliance_score": compliance_score,
        "file_path": str(report_path),
    }

    try:
        await reports_collection.insert_one(metadata)
    except Exception:
        pass

    filename = f"fairvision_compliance_report_{payload.dataset_id}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Report-Id": report_id,
        },
    )


@router.get("/history")
async def get_report_history(current_user: dict = Depends(get_current_user)):
    reports = (
        await reports_collection.find({"user_id": current_user["_id"]})
        .sort("generated_at", -1)
        .to_list(length=500)
    )
    return {"reports": [_serialize_report_history(report) for report in reports]}


@router.get("/{report_id}/download")
async def download_generated_report(report_id: str, current_user: dict = Depends(get_current_user)):
    report_doc = await reports_collection.find_one(
        {"report_id": report_id, "user_id": current_user["_id"]}
    )
    if not report_doc:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path_value = report_doc.get("file_path")
    if not file_path_value:
        raise HTTPException(status_code=404, detail="Report file reference is missing")

    file_path = Path(str(file_path_value))
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Stored report file not found")

    filename = f"fairvision_compliance_report_{report_doc.get('dataset_id', 'report')}.pdf"
    return FileResponse(path=str(file_path), media_type="application/pdf", filename=filename)
