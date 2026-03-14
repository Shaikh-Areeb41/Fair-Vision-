from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


DISPARITY_DI_THRESHOLD = 0.8
DISPARITY_DPD_THRESHOLD = 0.1

_TABLE_STYLES = getSampleStyleSheet()
_TABLE_HEADER_PARAGRAPH = ParagraphStyle(
    "TableHeaderParagraph",
    parent=_TABLE_STYLES["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    leading=11,
    textColor=colors.HexColor("#1A1A1A"),
    wordWrap="CJK",
)
_TABLE_BODY_PARAGRAPH = ParagraphStyle(
    "TableBodyParagraph",
    parent=_TABLE_STYLES["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=11,
    textColor=colors.HexColor("#1F2937"),
    wordWrap="CJK",
)


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


def _sanitize_text(value: str) -> str:
    return str(value or "").replace("**", "")


def _risk_color(risk_level: str):
    normalized = (risk_level or "").lower()
    if "low" in normalized:
        return colors.HexColor("#1f7a1f"), colors.HexColor("#E7F8EA")
    if "high" in normalized:
        return colors.HexColor("#9A1A1A"), colors.HexColor("#FDECEC")
    return colors.HexColor("#8A5A00"), colors.HexColor("#FFF4E5")


def _table(data: List[List[str]], col_widths: List[float], header_bg=colors.HexColor("#F4F6F8")) -> Table:
    wrapped_data: List[List[Paragraph]] = []
    for row_idx, row in enumerate(data):
        paragraph_style = _TABLE_HEADER_PARAGRAPH if row_idx == 0 else _TABLE_BODY_PARAGRAPH
        wrapped_row: List[Paragraph] = [Paragraph(_sanitize_text(str(cell)), paragraph_style) for cell in row]
        wrapped_data.append(wrapped_row)

    table = Table(wrapped_data, colWidths=col_widths, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1A1A1A")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9DDE3")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    table.setStyle(TableStyle(style))
    return table


def _figure_to_buffer(fig) -> BytesIO:
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def _placeholder_chart(title: str, subtitle: str) -> BytesIO:
    fig, ax = plt.subplots(figsize=(8, 3.2))
    ax.axis("off")
    ax.text(0.5, 0.6, title, ha="center", va="center", fontsize=12, fontweight="bold")
    ax.text(0.5, 0.35, subtitle, ha="center", va="center", fontsize=10)
    return _figure_to_buffer(fig)


def _selection_rate_chart(privileged: str, unprivileged: str, privileged_rate: float, unprivileged_rate: float) -> BytesIO:
    fig, ax = plt.subplots(figsize=(8, 3.6))
    groups = [privileged, unprivileged]
    rates = [max(0.0, privileged_rate * 100), max(0.0, unprivileged_rate * 100)]
    bars = ax.bar(groups, rates, color=["#1D4ED8", "#0EA5E9"], width=0.6)
    ax.set_title("Selection Rate Comparison by Demographic Group", fontsize=12, fontweight="bold")
    ax.set_ylabel("Selection Rate (%)")
    ax.set_ylim(0, max(100, max(rates) + 10))
    ax.grid(axis="y", alpha=0.25)
    for bar, value in zip(bars, rates):
        ax.text(bar.get_x() + bar.get_width() / 2, value + 1.0, f"{value:.1f}%", ha="center", fontsize=9)
    return _figure_to_buffer(fig)


def _attribute_fairness_chart(matrix: List[Dict[str, Any]]) -> BytesIO:
    if not matrix:
        return _placeholder_chart("Fairness Score by Attribute", "No attribute-level fairness data available")

    selected = matrix[:10]
    attributes = [str(row.get("attribute") or "Unknown") for row in selected]
    raw_scores = [_safe_num(row.get("fairness_score")) for row in selected]
    use_percent_scale = max(raw_scores) > 1.5
    scores = [score / 100 if use_percent_scale else score for score in raw_scores]
    scores = [max(0.0, min(1.0, score)) for score in scores]

    fig, ax = plt.subplots(figsize=(8, 3.8))
    bars = ax.bar(attributes, scores, color="#10B981", width=0.6)
    ax.set_title("Fairness Score Comparison Across Attributes", fontsize=12, fontweight="bold")
    ax.set_ylabel("Fairness Score")
    ax.set_ylim(0, 1.0)
    ax.grid(axis="y", alpha=0.25)
    ax.tick_params(axis="x", rotation=25)
    for bar, value in zip(bars, scores):
        ax.text(bar.get_x() + bar.get_width() / 2, min(0.98, value + 0.03), f"{value:.2f}", ha="center", fontsize=8)
    return _figure_to_buffer(fig)


def _disparity_before_after_chart(dpd: float, corrected_dpd: float, has_correction_simulation: bool) -> BytesIO:
    before_value = abs(dpd)
    after_value = abs(corrected_dpd) if has_correction_simulation else abs(dpd)

    fig, ax = plt.subplots(figsize=(8, 3.6))
    labels = ["Before structural correction", "After structural correction"]
    values = [before_value, after_value]
    colors_list = ["#DC2626", "#2563EB" if not has_correction_simulation else "#16A34A"]
    bars = ax.bar(labels, values, color=colors_list, width=0.55)
    ax.set_title("Disparity Before vs After Structural Correction", fontsize=12, fontweight="bold")
    ax.set_ylabel("Absolute Disparity (DPD)")
    ax.set_ylim(0, max(0.3, max(values) * 1.35 if max(values) > 0 else 0.3))
    ax.grid(axis="y", alpha=0.25)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, value + 0.01, f"{value:.3f}", ha="center", fontsize=9)
    return _figure_to_buffer(fig)


def _intersectional_heatmap_chart(combinations: List[Dict[str, Any]]) -> BytesIO:
    if not combinations:
        return _placeholder_chart("Intersectional Bias Heatmap", "No multi-attribute intersectional data available")

    combo = combinations[0]
    heatmap_cells = combo.get("heatmap") or []
    attributes = combo.get("attributes") or ["Attribute A", "Attribute B"]
    if not heatmap_cells:
        return _placeholder_chart("Intersectional Bias Heatmap", "No subgroup cells found for heatmap rendering")

    x_labels = sorted({str(cell.get("x", "-")) for cell in heatmap_cells})
    y_labels = sorted({str(cell.get("y", "-")) for cell in heatmap_cells})
    matrix = np.full((len(y_labels), len(x_labels)), np.nan)

    x_index = {label: idx for idx, label in enumerate(x_labels)}
    y_index = {label: idx for idx, label in enumerate(y_labels)}
    for cell in heatmap_cells:
        x_label = str(cell.get("x", "-"))
        y_label = str(cell.get("y", "-"))
        matrix[y_index[y_label], x_index[x_label]] = _safe_num(cell.get("severity"))

    fig, ax = plt.subplots(figsize=(8, 4.2))
    im = ax.imshow(matrix, cmap="RdYlGn_r", vmin=0, vmax=1, aspect="auto")
    ax.set_title(
        f"Intersectional Risk Heatmap ({attributes[0]} + {attributes[1] if len(attributes) > 1 else 'Attribute'})",
        fontsize=12,
        fontweight="bold",
    )
    ax.set_xticks(np.arange(len(x_labels)))
    if len(y_labels) > 12:
        tick_indices = np.linspace(0, len(y_labels) - 1, 12, dtype=int)
        ax.set_yticks(tick_indices)
        ax.set_yticklabels([y_labels[idx] for idx in tick_indices])
    else:
        ax.set_yticks(np.arange(len(y_labels)))
        ax.set_yticklabels(y_labels)
    ax.set_xticklabels(x_labels, rotation=30, ha="right")
    ax.tick_params(axis="y", labelsize=8)
    ax.tick_params(axis="x", labelsize=10)
    plt.colorbar(im, ax=ax, fraction=0.03, pad=0.04, label="Severity")

    # Add cell labels only for smaller heatmaps to preserve readability
    if len(y_labels) * len(x_labels) <= 36:
        for row_idx in range(len(y_labels)):
            for col_idx in range(len(x_labels)):
                value = matrix[row_idx, col_idx]
                if np.isnan(value):
                    continue
                ax.text(col_idx, row_idx, f"{value:.2f}", ha="center", va="center", color="black", fontsize=8)

    return _figure_to_buffer(fig)


def _intersectional_outcome_summary(combinations: List[Dict[str, Any]]) -> str:
    if not combinations:
        return (
            "This heatmap maps combined subgroup risk severity from 0.00 (lower concern) to 1.00 (higher concern). "
            "Rows and columns represent subgroup values for the selected demographic attributes. "
            "No intersectional outcomes were available in this run, so no concentrated subgroup risk could be quantified."
        )

    selected_combo = combinations[0] if isinstance(combinations[0], dict) else {}
    attributes = selected_combo.get("attributes") or ["Attribute A", "Attribute B"]
    heatmap_cells = selected_combo.get("heatmap") or []
    if not heatmap_cells:
        return (
            "This heatmap maps combined subgroup risk severity from 0.00 (lower concern) to 1.00 (higher concern). "
            "Rows and columns represent subgroup values for the selected demographic attributes. "
            "No subgroup outcome cells were available to summarize for this report."
        )

    highest_cell = None
    high_severity_count = 0
    valid_values: List[float] = []

    for cell in heatmap_cells:
        severity = _safe_num(cell.get("severity"), default=np.nan)
        if np.isnan(severity):
            continue
        valid_values.append(severity)
        if severity >= 0.80:
            high_severity_count += 1
        if highest_cell is None or severity > _safe_num(highest_cell.get("severity"), default=-1.0):
            highest_cell = cell

    if not valid_values or highest_cell is None:
        return (
            "This heatmap maps combined subgroup risk severity from 0.00 (lower concern) to 1.00 (higher concern). "
            "Rows and columns represent subgroup values for the selected demographic attributes. "
            "Outcome cells were present but did not include valid severity values for interpretation."
        )

    attr_x = str(attributes[0]) if len(attributes) > 0 else "Attribute A"
    attr_y = str(attributes[1]) if len(attributes) > 1 else "Attribute B"
    highest_x = str(highest_cell.get("x", "-"))
    highest_y = str(highest_cell.get("y", "-"))
    highest_severity = _safe_num(highest_cell.get("severity"))
    avg_severity = sum(valid_values) / len(valid_values)

    return (
        f"This heatmap maps combined subgroup risk severity from 0.00 (lower concern) to 1.00 (higher concern), where warmer colors indicate elevated disparity concentration. "
        f"Columns represent {attr_x} categories and rows represent {attr_y} categories. "
        f"In this report, the highest-risk intersection is {attr_x}='{highest_x}' with {attr_y}='{highest_y}' (severity {highest_severity:.2f}). "
        f"{high_severity_count} subgroup cell(s) are in the high-severity zone (>= 0.80), and the average severity across valid intersections is {avg_severity:.2f}."
    )


def _image_flowable(image_buffer: BytesIO, width_mm: float = 170, height_mm: float = 72) -> Image:
    return Image(image_buffer, width=width_mm * mm, height=height_mm * mm)


def _metric_interpretation(di: float, dpd: float, accuracy: float) -> List[List[str]]:
    di_interpretation = "Meets fairness threshold" if di >= DISPARITY_DI_THRESHOLD else "Below fairness threshold"
    dpd_interpretation = "Low disparity" if abs(dpd) <= 0.10 else "Moderate to high disparity"
    accuracy_interpretation = "Acceptable operational consistency" if accuracy >= 0.60 else "Requires operational review"
    return [
        ["Metric", "Value", "Interpretation"],
        ["Disparate Impact (DI)", f"{di:.3f}", di_interpretation],
        ["Demographic Parity Difference (DPD)", f"{dpd:.3f}", dpd_interpretation],
        ["Outcome Consistency", f"{accuracy * 100:.1f}%", accuracy_interpretation],
    ]


def generate_governance_compliance_pdf(report_payload: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title="FairVision Governance Audit Report",
    )

    styles = getSampleStyleSheet()
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=colors.HexColor("#111827"),
        spaceBefore=6,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937"),
    )
    small_style = ParagraphStyle(
        "Small",
        parent=body_style,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
    )
    banner_title_style = ParagraphStyle(
        "BannerTitle",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#111827"),
        spaceBefore=0,
        spaceAfter=0,
    )
    banner_body_style = ParagraphStyle(
        "BannerBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937"),
        wordWrap="CJK",
        spaceBefore=0,
        spaceAfter=0,
    )

    dataset_name = str(report_payload.get("dataset_name") or "Audit Session")
    generated_at = str(report_payload.get("generated_at") or "")
    fairness_score = _safe_num(report_payload.get("fairness_score"), default=0.0)
    compliance_score = _safe_num(report_payload.get("compliance_score"), default=0.0)
    risk_level = str(report_payload.get("risk_level") or _normalize_risk_level(compliance_score))

    di = _safe_num(report_payload.get("di"))
    dpd = _safe_num(report_payload.get("dpd"))
    accuracy = _safe_num(report_payload.get("accuracy"))

    target = str(report_payload.get("target") or "Organizational Outcome")
    sensitive = str(report_payload.get("sensitive") or "Demographic Attribute")
    privileged = str(report_payload.get("privileged") or "Privileged Group")
    unprivileged = str(report_payload.get("unprivileged") or "Underrepresented Group")
    privileged_rate = _safe_num(report_payload.get("privileged_rate"))
    unprivileged_rate = _safe_num(report_payload.get("unprivileged_rate"))

    executive_summary = _sanitize_text(str(report_payload.get("executive_summary") or ""))
    risk_banner_message = _sanitize_text(
        str(
            report_payload.get("risk_banner_message")
            or "Dataset shows measurable demographic disparity. Organizational review is recommended before automated decision deployment."
        )
    )

    matrix: List[Dict[str, Any]] = list(report_payload.get("comparison_matrix") or [])
    combinations: List[Dict[str, Any]] = list(report_payload.get("intersectional_combinations") or [])

    has_correction_simulation = bool(report_payload.get("has_correction_simulation"))
    corrected_dpd = _safe_num(report_payload.get("corrected_dpd"))
    corrected_acc = _safe_num(report_payload.get("corrected_acc"))
    correction_improvement_ratio = _safe_num(report_payload.get("correction_improvement_ratio"))
    correction_scenario_name = _map_correction_scenario(str(report_payload.get("correction_scenario_name") or ""))

    correction_significant = bool(report_payload.get("correction_significant"))
    advisory_required = bool(report_payload.get("advisory_required"))
    recommendations: List[Dict[str, str]] = list(report_payload.get("recommendations") or [])
    glossary: List[Dict[str, str]] = list(report_payload.get("glossary") or [])

    risk_text_color, risk_bg_color = _risk_color(risk_level)

    selection_chart = _selection_rate_chart(privileged, unprivileged, privileged_rate, unprivileged_rate)
    attribute_chart = _attribute_fairness_chart(matrix)
    disparity_chart = _disparity_before_after_chart(dpd, corrected_dpd, has_correction_simulation)
    intersectional_chart = _intersectional_heatmap_chart(combinations)

    story = []

    # Cover Page
    story.append(Paragraph("FairVision Governance Audit Report", styles["Title"]))
    story.append(Spacer(1, 3 * mm))
    cover_table = _table(
        [
            ["Dataset", dataset_name],
            ["Generated", generated_at],
            ["Ethical Risk Level", risk_level],
            ["Global Fairness Score", f"{fairness_score:.2f}"],
            ["Compliance Score", f"{compliance_score:.2f}"],
        ],
        [45 * mm, 120 * mm],
    )
    cover_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F4F6F8")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ]
        )
    )
    story.append(cover_table)
    story.append(Spacer(1, 5 * mm))

    banner = Table(
        [
            [Paragraph(f"ETHICAL RISK LEVEL: {risk_level.upper()}", banner_title_style)],
            [Paragraph(risk_banner_message, banner_body_style)],
        ],
        colWidths=[165 * mm],
    )
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), risk_bg_color),
                ("TEXTCOLOR", (0, 0), (-1, 0), risk_text_color),
                ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#1F2937")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, 0), 13),
                ("FONTSIZE", (0, 1), (-1, 1), 10),
                ("BOX", (0, 0), (-1, -1), 0.8, risk_text_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(banner)
    story.append(PageBreak())

    # Executive Dashboard
    story.append(Paragraph("Executive Dashboard", section_title_style))
    dashboard = _table(
        [
            [
                "Global Fairness Score",
                "Compliance Score",
                "Ethical Risk Level",
            ],
            [
                f"{fairness_score:.2f}",
                f"{compliance_score:.2f}",
                risk_level,
            ],
        ],
        [55 * mm, 55 * mm, 55 * mm],
    )
    dashboard.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (-1, 1), 14),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(dashboard)
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#D1D5DB"), thickness=0.7))
    story.append(Spacer(1, 2 * mm))

    # Executive Summary
    story.append(Paragraph("Executive Summary", section_title_style))
    story.append(Paragraph(executive_summary, body_style))

    # Organizational Context
    story.append(Paragraph("Organizational Context", section_title_style))
    context_table = _table(
        [
            ["Outcome process", target],
            ["Primary demographic attribute", sensitive],
            ["Reference groups", f"{privileged} and {unprivileged}"],
        ],
        [55 * mm, 110 * mm],
    )
    context_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F4F6F8"))]))
    story.append(context_table)
    story.append(Spacer(1, 2 * mm))

    # Representation Audit with chart
    story.append(Paragraph("Representation Audit", section_title_style))
    story.append(Paragraph(
        "Historical decision outcomes are assessed by subgroup to surface structural imbalance in selection rates.",
        body_style,
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(_image_flowable(selection_chart))

    # Outcome Disparity Analysis with metrics table and attribute chart
    story.append(Paragraph("Outcome Disparity Analysis", section_title_style))
    story.append(Paragraph(
        "Key fairness indicators are summarized below with governance-focused interpretation.",
        body_style,
    ))
    story.append(Spacer(1, 1.5 * mm))
    story.append(_table(_metric_interpretation(di, dpd, accuracy), [53 * mm, 28 * mm, 84 * mm]))
    story.append(Spacer(1, 2 * mm))
    story.append(_image_flowable(attribute_chart))

    # Intersectional Risk Analysis with heatmap
    story.append(Paragraph("Intersectional Risk Analysis", section_title_style))
    story.append(Paragraph(
        "Combined-attribute subgroup analysis highlights concentrated risk pockets that single-attribute views may not reveal.",
        body_style,
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(_image_flowable(intersectional_chart, height_mm=78))
    story.append(Spacer(1, 1.5 * mm))
    story.append(Paragraph(_intersectional_outcome_summary(combinations), body_style))

    # Structural Outcome Gap statement
    selection_gap = (privileged_rate - unprivileged_rate) * 100
    story.append(Paragraph("Structural Outcome Gap", section_title_style))
    story.append(
        Paragraph(
            (
                f"{privileged} outcomes are observed at {privileged_rate * 100:.1f}% while {unprivileged} outcomes are observed at "
                f"{unprivileged_rate * 100:.1f}%. This produces a selection gap of {selection_gap:.1f} percentage points."
            ),
            body_style,
        )
    )

    # Compliance Assessment
    story.append(Paragraph("Compliance Assessment", section_title_style))
    disparity_exceeded = di < DISPARITY_DI_THRESHOLD or abs(dpd) > DISPARITY_DPD_THRESHOLD
    compliance_rows = [
        ["Compliance score", f"{compliance_score:.2f} / 100"],
        ["Risk level", risk_level],
        ["Assessment", "Disparity exceeds acceptable operating thresholds" if disparity_exceeded else "Disparity remains within acceptable operating thresholds"],
    ]
    compliance_table = _table([["Indicator", "Value"], *compliance_rows], [55 * mm, 110 * mm])
    story.append(compliance_table)

    # Corrective Strategy Evaluation (conditional) with chart
    if has_correction_simulation:
        story.append(Paragraph("Corrective Strategy Evaluation", section_title_style))
        story.append(
            Paragraph(
                f"Scenario assessed: {correction_scenario_name}. This evaluates whether operational structural correction materially reduces disparity.",
                body_style,
            )
        )
        strategy_table = _table(
            [
                ["Indicator", "Value"],
                ["Projected disparity after correction", f"{corrected_dpd:.3f}"],
                ["Projected operational consistency", f"{corrected_acc * 100:.1f}%"],
                ["Estimated disparity reduction", f"{correction_improvement_ratio * 100:.1f}%"],
            ],
            [70 * mm, 95 * mm],
        )
        story.append(strategy_table)
        story.append(Spacer(1, 2 * mm))
        story.append(_image_flowable(disparity_chart))

    # Governance Recommendations (conditional)
    if correction_significant or advisory_required:
        story.append(Paragraph("Governance Recommendations", section_title_style))
        if correction_significant:
            recommendation_rows = [["Recommendation", "Operational Action"]]
            for entry in recommendations:
                recommendation_rows.append(
                    [
                        _sanitize_text(str(entry.get("title") or "Recommendation")),
                        _sanitize_text(str(entry.get("content") or "")),
                    ]
                )
            recommendation_rows.append(
                ["Governance cadence", "Maintain quarterly subgroup-level monitoring and documented review of adverse outcomes."]
            )
            story.append(_table(recommendation_rows, [42 * mm, 123 * mm]))
        else:
            story.append(
                Paragraph(
                    "Structural correction simulation showed limited disparity reduction. Conduct a deeper structural review of policy criteria, process routing, and historical decision governance before compliance sign-off.",
                    body_style,
                )
            )

    # Glossary as table
    story.append(Paragraph("Glossary", section_title_style))
    glossary_rows = [["Term", "Definition"]]
    for item in glossary:
        glossary_rows.append([
            _sanitize_text(str(item.get("term") or "")),
            _sanitize_text(str(item.get("def") or "")),
        ])
    story.append(_table(glossary_rows, [45 * mm, 120 * mm]))

    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Prepared by FairVision Governance Intelligence Platform", small_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
