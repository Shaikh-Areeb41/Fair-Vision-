from __future__ import annotations

from typing import Any, Dict


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def compute_ethical_risk_score(fairness_payload: Dict[str, Any], drift_payload: Dict[str, Any]) -> Dict[str, Any]:
    aggregates = fairness_payload.get("aggregates", {})
    parity_gap = float(aggregates.get("avg_statistical_parity", 0.0))
    disparate_impact = float(aggregates.get("avg_disparate_impact", 0.0))
    equalized_odds = float(aggregates.get("avg_equalized_odds", 0.0))
    volatility = float(drift_payload.get("volatility", 0.0))

    parity_component = _clamp(1 - parity_gap)
    di_component = _clamp(disparate_impact)
    odds_component = _clamp(1 - equalized_odds)
    stability_component = _clamp(1 - min(1.0, volatility))

    compliance_score = (
        parity_component * 0.30
        + di_component * 0.30
        + odds_component * 0.25
        + stability_component * 0.15
    ) * 100

    if compliance_score >= 75:
        risk_level = "Low Risk"
    elif compliance_score >= 50:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"

    return {
        "compliance_score": round(compliance_score, 2),
        "risk_level": risk_level,
        "components": {
            "statistical_parity_component": round(parity_component, 4),
            "disparate_impact_component": round(di_component, 4),
            "equalized_odds_component": round(odds_component, 4),
            "stability_component": round(stability_component, 4),
        },
    }
