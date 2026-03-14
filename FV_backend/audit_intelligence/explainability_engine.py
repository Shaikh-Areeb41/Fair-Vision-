"""Explainability engine — produces evidence-based, structured fairness explanations.

Each explanation is a dict containing:
  text              Plain-language summary (backward-compatible with string lists).
  type              "parity" | "intersectional" | "proxy" | "risk"
  title             Short headline.
  severity          "info" | "warning" | "critical"
  affected_attribute  Which sensitive attribute this finding relates to.
  affected_groups   List of {group, rate, count} dicts.
  key_metrics       Dict of metric name -> value.
  recommendations   List of actionable recommendation strings.
  sample_warning    Present only when subgroup size is small.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


LOW_SAMPLE_THRESHOLD = 30
HIGH_PARITY_GAP = 0.15     # statistical parity >= this is "critical"
MEDIUM_PARITY_GAP = 0.05

DI_THRESHOLD = 0.80        # industry 4/5ths rule


def _severity(value: float, medium: float, high: float) -> str:
    if value >= high:
        return "critical"
    if value >= medium:
        return "warning"
    return "info"


def _parity_recommendations(gap: float, attribute: str) -> List[str]:
    if gap < MEDIUM_PARITY_GAP:
        return [
            f"Continue monitoring {attribute} parity quarterly.",
            "Maintain current decision criteria and re-audit when operational volumes change.",
        ]
    recs = [
        f"Investigate root causes of the {gap * 100:.1f}% selection-rate gap on '{attribute}'.",
        "Review intake criteria for proxy variables correlated with this attribute.",
        "Introduce human oversight for borderline decisions near the acceptance threshold.",
    ]
    if gap >= HIGH_PARITY_GAP:
        recs.append(
            "Consider a pre-processing intervention (e.g. reweighing) before retraining the model."
        )
    return recs


def _proxy_recommendations(feature: str, sensitive: str, methods: List[str]) -> List[str]:
    recs = [
        f"Evaluate whether '{feature}' should be removed or transformed before model training.",
        f"The correlation between '{feature}' and '{sensitive}' suggests it may encode demographic information.",
    ]
    if "model_auc" in methods:
        recs.append(
            f"A classifier can predict '{sensitive}' from '{feature}' alone (AUC ≥ 0.70). "
            "This is a strong proxy — removing or auditing this feature is strongly advised."
        )
    if "cramers_v" in methods:
        recs.append(
            f"Cramér's V association between '{feature}' and '{sensitive}' exceeds the threshold. "
            "Review categorical encoding and consider grouping or removing correlated categories."
        )
    return recs


def _intersectional_recommendations(attrs: List[str], deviation: float) -> List[str]:
    label = " × ".join(attrs)
    recs = [
        f"The {label} intersection shows elevated disparity ({deviation * 100:.1f}% deviation from baseline).",
        "Disaggregate historical outcome data by this attribute combination for targeted review.",
    ]
    if deviation >= 0.20:
        recs.append(
            f"Subgroup-specific policy adjustments may be needed for the {label} intersection."
        )
    return recs


def _default_explanation() -> Dict[str, Any]:
    return {
        "text": "No major fairness anomalies were detected with the provided configuration.",
        "type": "info",
        "title": "No significant issues detected",
        "severity": "info",
        "affected_attribute": "all",
        "affected_groups": [],
        "key_metrics": {},
        "recommendations": ["Continue monitoring as new data is collected."],
    }


def generate_fairness_explanations(
    fairness_payload: Dict[str, Any],
    intersectional_payload: Dict[str, Any],
    proxy_payload: Dict[str, Any],
    risk_payload: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Generate structured fairness explanations from all four analysis payloads.

    Compatible API: the returned list can be iterated and each item's ``text``
    field used for backward-compatible plain-text rendering.
    """
    explanations: List[Dict[str, Any]] = []

    # --- 1. Per-attribute statistical parity findings ---
    matrix: List[Dict[str, Any]] = fairness_payload.get("comparison_matrix", [])
    group_breakdown: Dict[str, List[Dict[str, Any]]] = fairness_payload.get(
        "attribute_group_breakdown", {}
    )

    for row in matrix:
        attribute = str(row.get("attribute", "Unknown"))
        gap = float(row.get("statistical_parity", 0.0))
        di = float(row.get("disparate_impact", 1.0))
        fairness_score = float(row.get("fairness_score", 100.0))
        eq_odds = float(row.get("equalized_odds", 0.0))

        groups = group_breakdown.get(attribute, [])
        affected_groups = [
            {
                "group": str(g.get("group")),
                "selection_rate": g.get("selection_rate"),
                "count": g.get("count"),
            }
            for g in groups
        ]

        low_sample_groups = [g for g in groups if (g.get("count") or 0) < LOW_SAMPLE_THRESHOLD]
        sample_warning: Optional[str] = (
            f"{len(low_sample_groups)} group(s) have fewer than {LOW_SAMPLE_THRESHOLD} samples — "
            "fairness conclusions for these groups should be verified with more data."
            if low_sample_groups else None
        )

        if gap < MEDIUM_PARITY_GAP and di >= DI_THRESHOLD:
            title = f"'{attribute}' meets fairness thresholds"
            text = (
                f"Attribute '{attribute}' shows acceptable parity. "
                f"Statistical parity gap: {gap:.3f}, Disparate Impact: {di:.2f}."
            )
            sev = "info"
        elif di < DI_THRESHOLD:
            title = f"'{attribute}' fails the 4/5ths rule (DI = {di:.2f})"
            text = (
                f"Attribute '{attribute}' has a Disparate Impact ratio of {di:.2f}, "
                f"below the 0.80 threshold. Selection-rate gap: {gap * 100:.1f}%."
            )
            sev = _severity(gap, MEDIUM_PARITY_GAP, HIGH_PARITY_GAP)
        else:
            title = f"'{attribute}' has a notable selection-rate gap ({gap * 100:.1f}%)"
            text = (
                f"Attribute '{attribute}' shows a {gap * 100:.1f}% selection-rate disparity. "
                f"Equalized-odds difference: {eq_odds:.3f}. Fairness score: {fairness_score:.1f}/100."
            )
            sev = _severity(gap, MEDIUM_PARITY_GAP, HIGH_PARITY_GAP)

        entry: Dict[str, Any] = {
            "text": text,
            "type": "parity",
            "title": title,
            "severity": sev,
            "affected_attribute": attribute,
            "affected_groups": affected_groups,
            "key_metrics": {
                "statistical_parity": round(gap, 4),
                "disparate_impact": round(di, 4),
                "equalized_odds": round(eq_odds, 4),
                "fairness_score": round(fairness_score, 2),
            },
            "recommendations": _parity_recommendations(gap, attribute),
        }
        if sample_warning:
            entry["sample_warning"] = sample_warning
        explanations.append(entry)

    # --- 2. Worst intersectional subgroup ---
    worst_subgroups: List[Dict[str, Any]] = intersectional_payload.get("worst_subgroups", [])
    if not worst_subgroups:
        # Fallback: scan all heatmap combos for the worst cell
        for combo in intersectional_payload.get("combinations", []):
            for cell in combo.get("heatmap", []):
                if cell.get("is_reliable", True):
                    worst_subgroups.append({**cell, "attributes": combo.get("attributes", [])})

    if worst_subgroups:
        worst = worst_subgroups[0]
        attrs = worst.get("attributes", [])
        attr_label = " × ".join(attrs)
        groups_label = f"{worst.get('x')} / {worst.get('y')}"
        deviation = float(worst.get("deviation", 0.0))
        count = int(worst.get("count", 0))
        p_value = worst.get("p_value")
        sig_note = ""
        if p_value is not None:
            sig_note = f" (p = {p_value:.4f}, {'significant' if worst.get('is_significant') else 'not significant'})"

        text = (
            f"Intersectional hotspot on {attr_label}: subgroup '{groups_label}' "
            f"deviates {deviation * 100:.1f}% from the overall rate{sig_note}. "
            f"Sample size: {count}."
        )
        sev = _severity(deviation, 0.10, 0.20)

        entry = {
            "text": text,
            "type": "intersectional",
            "title": f"Intersectional hotspot: {groups_label}",
            "severity": sev,
            "affected_attribute": attr_label,
            "affected_groups": [{"group": groups_label, "selection_rate": worst.get("selection_rate"), "count": count}],
            "key_metrics": {
                "deviation_from_baseline": round(deviation, 4),
                "selection_rate": round(float(worst.get("selection_rate", 0.0)), 4),
                "severity": round(float(worst.get("severity", 0.0)), 4),
                "p_value": p_value,
            },
            "recommendations": _intersectional_recommendations(attrs, deviation),
        }
        if count < LOW_SAMPLE_THRESHOLD:
            entry["sample_warning"] = f"Sample size {count} is below the {LOW_SAMPLE_THRESHOLD}-row reliability threshold."
        explanations.append(entry)


    # --- 4. Overall risk score ---
    compliance_score = float(risk_payload.get("compliance_score", 0.0))
    risk_level_str = str(risk_payload.get("risk_level", "Unknown"))
    components = risk_payload.get("components", {})

    sev = "critical" if compliance_score < 50 else "warning" if compliance_score < 75 else "info"
    text = (
        f"Ethical compliance score: {compliance_score:.1f}/100 — classified as '{risk_level_str}'. "
        f"Parity component: {components.get('statistical_parity_component', 0):.2f}, "
        f"DI component: {components.get('disparate_impact_component', 0):.2f}, "
        f"Equalized-odds component: {components.get('equalized_odds_component', 0):.2f}, "
        f"Stability component: {components.get('stability_component', 0):.2f}."
    )
    recs_risk = []
    if compliance_score < 50:
        recs_risk = [
            "Immediate governance intervention is recommended.",
            "Suspend deployment until disparity is reduced below acceptable thresholds.",
            "Conduct an independent fairness audit with legal counsel.",
        ]
    elif compliance_score < 75:
        recs_risk = [
            "Schedule a governance review within 30 days.",
            "Implement monitoring dashboards for ongoing disparity tracking.",
        ]
    else:
        recs_risk = [
            "Maintain current governance practices.",
            "Re-run this audit when new data batches are introduced.",
        ]

    explanations.append({
        "text": text,
        "type": "risk",
        "title": f"Overall risk: {risk_level_str} ({compliance_score:.1f}/100)",
        "severity": sev,
        "affected_attribute": "all",
        "affected_groups": [],
        "key_metrics": {
            "compliance_score": round(compliance_score, 2),
            "risk_level": risk_level_str,
            **{k: round(float(v), 4) for k, v in components.items()},
        },
        "recommendations": recs_risk,
    })

    if not explanations:
        explanations.append(_default_explanation())

    return explanations
