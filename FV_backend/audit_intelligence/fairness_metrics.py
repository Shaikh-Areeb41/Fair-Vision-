from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from audit_intelligence.utils.preprocessing import coerce_binary_series as _to_binary


def _bounded(value: float) -> float:
    return max(0.0, min(1.0, value))


def compute_multi_attribute_fairness(
    df: pd.DataFrame,
    sensitive_attributes: List[str],
    outcome_column: str,
    actual_column: Optional[str] = None,
    positive_label: Optional[Any] = None,
) -> Dict[str, Any]:
    outcome = _to_binary(df[outcome_column], positive_label=positive_label)
    actual = _to_binary(df[actual_column], positive_label=positive_label) if actual_column else None

    matrix: List[Dict[str, Any]] = []
    per_attribute_groups: Dict[str, List[Dict[str, Any]]] = {}

    for attribute in sensitive_attributes:
        group_stats: List[Dict[str, Any]] = []
        grouped = df.groupby(attribute, dropna=False)

        for group_name, group_df in grouped:
            group_index = group_df.index
            group_outcome = outcome.loc[group_index]
            size = int(len(group_outcome))
            selection_rate = float(group_outcome.mean()) if size else 0.0

            tpr = None
            if actual is not None:
                group_actual = actual.loc[group_index]
                positives = group_actual == 1
                if positives.any():
                    tpr = float(group_outcome[positives].mean())

            group_stats.append(
                {
                    "group": str(group_name),
                    "count": size,
                    "selection_rate": round(selection_rate, 4),
                    "true_positive_rate": round(tpr, 4) if tpr is not None else None,
                }
            )

        rates = [entry["selection_rate"] for entry in group_stats]
        max_rate = max(rates) if rates else 0.0
        min_rate = min(rates) if rates else 0.0
        statistical_parity_diff = float(max_rate - min_rate)
        disparate_impact_ratio = float((min_rate / max_rate) if max_rate > 0 else 1.0)

        tprs = [entry["true_positive_rate"] for entry in group_stats if entry["true_positive_rate"] is not None]
        equalized_odds_diff = float(max(tprs) - min(tprs)) if len(tprs) >= 2 else 0.0

        fairness_score = (
            _bounded(1 - statistical_parity_diff) * 0.4
            + _bounded(disparate_impact_ratio) * 0.35
            + _bounded(1 - equalized_odds_diff) * 0.25
        ) * 100

        matrix.append(
            {
                "attribute": attribute,
                "statistical_parity": round(statistical_parity_diff, 4),
                "disparate_impact": round(disparate_impact_ratio, 4),
                "equalized_odds": round(equalized_odds_diff, 4),
                "fairness_score": round(fairness_score, 2),
            }
        )
        per_attribute_groups[attribute] = group_stats

    if not matrix:
        return {
            "comparison_matrix": [],
            "attribute_group_breakdown": {},
            "global_fairness_score": 0.0,
            "aggregates": {"avg_statistical_parity": 0.0, "avg_disparate_impact": 0.0, "avg_equalized_odds": 0.0},
        }

    avg_statistical_parity = float(np.mean([row["statistical_parity"] for row in matrix]))
    avg_disparate_impact = float(np.mean([row["disparate_impact"] for row in matrix]))
    avg_equalized_odds = float(np.mean([row["equalized_odds"] for row in matrix]))
    global_fairness_score = float(np.mean([row["fairness_score"] for row in matrix]))

    return {
        "comparison_matrix": matrix,
        "attribute_group_breakdown": per_attribute_groups,
        "global_fairness_score": round(global_fairness_score, 2),
        "aggregates": {
            "avg_statistical_parity": round(avg_statistical_parity, 4),
            "avg_disparate_impact": round(avg_disparate_impact, 4),
            "avg_equalized_odds": round(avg_equalized_odds, 4),
        },
    }


def compute_fairness_drift(history_points: List[Dict[str, Any]], current_score: float) -> Dict[str, Any]:
    normalized = [float(point.get("global_fairness_score", 0.0)) for point in history_points if point.get("global_fairness_score") is not None]
    if not normalized:
        return {
            "current_score": round(current_score, 2),
            "previous_score": None,
            "score_change": 0.0,
            "trend": "stable",
            "volatility": 0.0,
            "timeline": [],
        }

    previous_score = normalized[-1]
    score_change = float(current_score - previous_score)
    trend = "improving" if score_change > 1 else "degrading" if score_change < -1 else "stable"
    volatility = float(np.std(normalized)) if len(normalized) > 1 else 0.0

    timeline = [
        {
            "dataset_id": str(point.get("dataset_id", "")),
            "timestamp": point.get("timestamp"),
            "global_fairness_score": round(float(point.get("global_fairness_score", 0.0)), 2),
            "risk_classification": point.get("risk_classification"),
        }
        for point in history_points
    ]

    return {
        "current_score": round(current_score, 2),
        "previous_score": round(previous_score, 2),
        "score_change": round(score_change, 2),
        "trend": trend,
        "volatility": round(volatility, 4),
        "timeline": timeline,
    }
