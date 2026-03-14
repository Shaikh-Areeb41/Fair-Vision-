"""Intersectional bias analysis (beginner-friendly implementation).

This module keeps the same output schema used by the API/UI while using
clear, small helper functions and straightforward control flow.
"""

from __future__ import annotations

from itertools import combinations
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency

from audit_intelligence.utils.preprocessing import (
    LOW_SAMPLE_THRESHOLD,
    bootstrap_confidence_interval,
    coerce_binary_series,
)


def _significance_test(
    subgroup_size: int,
    subgroup_positives: int,
    total_size: int,
    total_positives: int,
) -> float:
    """Return p-value (chi-square) for whether the subgroup rate differs from the overall rate."""
    try:
        total_negatives = total_size - total_positives
        subgroup_negatives = subgroup_size - subgroup_positives
        rest_positives = total_positives - subgroup_positives
        rest_negatives = total_negatives - subgroup_negatives

        if any(v < 0 for v in [subgroup_negatives, rest_positives, rest_negatives]):
            return 1.0

        contingency = [
            [subgroup_positives, subgroup_negatives],
            [rest_positives, rest_negatives],
        ]
        if min(np.array(contingency).flatten()) < 1:
            return 1.0

        _, p_value, _, _ = chi2_contingency(contingency, correction=False)
        return float(p_value)
    except Exception:
        return 1.0


def _build_cell(
    group_a: Any,
    group_b: Any,
    subgroup_outcome: pd.Series,
    overall_rate: float,
    total_size: int,
    total_positives: int,
) -> Dict[str, Any]:
    size = int(len(subgroup_outcome))
    positives = int(subgroup_outcome.sum())
    subgroup_rate = float(subgroup_outcome.mean()) if size > 0 else 0.0
    deviation = abs(subgroup_rate - overall_rate)
    is_reliable = size >= LOW_SAMPLE_THRESHOLD

    if is_reliable:
        p_value = _significance_test(size, positives, total_size, total_positives)
        is_significant = p_value < 0.05
    else:
        p_value = 1.0
        is_significant = False

    if is_reliable and size > 1:
        ci_lo, ci_hi = bootstrap_confidence_interval(subgroup_outcome, iterations=250)
    else:
        ci_lo, ci_hi = subgroup_rate, subgroup_rate

    cell: Dict[str, Any] = {
        "x": str(group_a),
        "y": str(group_b),
        "count": size,
        "selection_rate": round(subgroup_rate, 4),
        "deviation": round(deviation, 4),
        "severity": round(min(1.0, deviation * 3.0), 4),
        "is_reliable": is_reliable,
        "is_significant": is_significant,
        "p_value": round(float(p_value), 4),
        "ci_lower": round(float(ci_lo), 4),
        "ci_upper": round(float(ci_hi), 4),
    }

    if not is_reliable:
        cell["reliability_warning"] = (
            f"Low sample size ({size}). Interpret with caution (< {LOW_SAMPLE_THRESHOLD} rows)."
        )

    return cell


def _build_sunburst(
    df: pd.DataFrame,
    outcome: pd.Series,
    sensitive_attributes: List[str],
) -> List[Dict[str, Any]]:
    if len(sensitive_attributes) < 2:
        return []

    first_attr = sensitive_attributes[0]
    second_attr = sensitive_attributes[1]
    nodes: List[Dict[str, Any]] = []

    for first_val, first_df in df.groupby(first_attr, dropna=False):
        first_outcome = outcome.loc[first_df.index]
        first_rate = float(first_outcome.mean()) if len(first_outcome) else 0.0

        children: List[Dict[str, Any]] = []
        for second_val, second_df in first_df.groupby(second_attr, dropna=False):
            second_outcome = outcome.loc[second_df.index]
            second_rate = float(second_outcome.mean()) if len(second_outcome) else 0.0
            children.append(
                {
                    "name": f"{second_attr}:{second_val}",
                    "value": int(len(second_df)),
                    "selection_rate": round(second_rate, 4),
                }
            )

        nodes.append(
            {
                "name": f"{first_attr}:{first_val}",
                "value": int(len(first_df)),
                "selection_rate": round(first_rate, 4),
                "children": children,
            }
        )

    return nodes


def _rank_worst_subgroups(combinations_payload: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    reliable_cells: List[Dict[str, Any]] = []
    for combo in combinations_payload:
        attrs = combo.get("attributes", [])
        for cell in combo.get("heatmap", []):
            if cell.get("is_reliable"):
                reliable_cells.append({**cell, "attributes": attrs})

    reliable_cells.sort(key=lambda item: item.get("deviation", 0.0), reverse=True)
    return reliable_cells[:5]


def analyze_intersectional_bias(
    df: pd.DataFrame,
    sensitive_attributes: List[str],
    outcome_column: str,
    positive_label: Optional[Any] = None,
) -> Dict[str, Any]:
    """Analyse bias at the intersection of pairs of sensitive attributes.

    Returns
    -------
    Dict with keys:
    - ``overall_selection_rate``
    - ``combinations`` — list of pairwise intersectional analyses
    - ``sunburst``      — hierarchical breakdown for sunburst chart
    - ``worst_subgroups`` — top-5 highest-disparity reliable subgroups
    """
    outcome = coerce_binary_series(df[outcome_column], positive_label)
    overall_rate = float(outcome.mean()) if len(outcome) else 0.0
    total_size = len(df)
    total_positives = int(outcome.sum())

    combinations_payload: List[Dict[str, Any]] = []
    for attr_a, attr_b in combinations(sensitive_attributes, 2):
        cells: List[Dict[str, Any]] = []
        for (group_a, group_b), group_df in df.groupby([attr_a, attr_b], dropna=False):
            subgroup_outcome = outcome.loc[group_df.index]
            cells.append(
                _build_cell(
                    group_a=group_a,
                    group_b=group_b,
                    subgroup_outcome=subgroup_outcome,
                    overall_rate=overall_rate,
                    total_size=total_size,
                    total_positives=total_positives,
                )
            )
        combinations_payload.append({"attributes": [attr_a, attr_b], "heatmap": cells})

    sunburst_nodes = _build_sunburst(df, outcome, sensitive_attributes)
    worst_subgroups = _rank_worst_subgroups(combinations_payload)

    return {
        "overall_selection_rate": round(overall_rate, 4),
        "combinations": combinations_payload,
        "sunburst": sunburst_nodes,
        "worst_subgroups": worst_subgroups,
    }
