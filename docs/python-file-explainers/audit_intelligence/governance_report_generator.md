# audit_intelligence/governance_report_generator.py

## Overview
- Source file: FV_backend/audit_intelligence/governance_report_generator.py
- Primary role: Fairness intelligence engine module for metrics, intersectional analysis, risk, and explainability.
- Total lines: 625
- Top-level functions: 16
- Classes: 0

## Imports and Dependencies
- from __future__ import annotations
- from io import BytesIO
- from typing import Any, Dict, List, Optional
- import matplotlib
- import matplotlib.pyplot as plt
- import numpy as np
- from reportlab.lib import colors
- from reportlab.lib.pagesizes import A4
- from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
- from reportlab.lib.units import mm
- from reportlab.platypus import HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

## Top-Level Functions (Detailed)
### _safe_num
- Signature: def _safe_num(value, default) -> float
- Location: lines 42-49
- Async: no
- Inputs: value, default
- Return annotation: float
- Docstring: None
- Internal calls: none detected
- External calls: float
- Side effects: Primarily computational / in-memory transformation

### _map_correction_scenario
- Signature: def _map_correction_scenario(raw_name) -> str
- Location: lines 52-58
- Async: no
- Inputs: raw_name
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _normalize_risk_level
- Signature: def _normalize_risk_level(compliance_score) -> str
- Location: lines 61-66
- Async: no
- Inputs: compliance_score
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: none detected
- Side effects: Primarily computational / in-memory transformation

### _sanitize_text
- Signature: def _sanitize_text(value) -> str
- Location: lines 69-70
- Async: no
- Inputs: value
- Return annotation: str
- Docstring: None
- Internal calls: none detected
- External calls: str
- Side effects: Primarily computational / in-memory transformation

### _risk_color
- Signature: def _risk_color(risk_level)
- Location: lines 73-79
- Async: no
- Inputs: risk_level
- Return annotation: not specified
- Docstring: None
- Internal calls: none detected
- External calls: colors.HexColor
- Side effects: Primarily computational / in-memory transformation

### _table
- Signature: def _table(data, col_widths, header_bg) -> Table
- Location: lines 82-103
- Async: no
- Inputs: data, col_widths, header_bg
- Return annotation: Table
- Docstring: None
- Internal calls: _sanitize_text
- External calls: Paragraph, Table, TableStyle, colors.HexColor, enumerate, str, table.setStyle, wrapped_data.append
- Side effects: Primarily computational / in-memory transformation

### _figure_to_buffer
- Signature: def _figure_to_buffer(fig) -> BytesIO
- Location: lines 106-111
- Async: no
- Inputs: fig
- Return annotation: BytesIO
- Docstring: None
- Internal calls: none detected
- External calls: BytesIO, buf.seek, fig.savefig, plt.close
- Side effects: Primarily computational / in-memory transformation

### _placeholder_chart
- Signature: def _placeholder_chart(title, subtitle) -> BytesIO
- Location: lines 114-119
- Async: no
- Inputs: title, subtitle
- Return annotation: BytesIO
- Docstring: None
- Internal calls: _figure_to_buffer
- External calls: ax.axis, ax.text, plt.subplots
- Side effects: Primarily computational / in-memory transformation

### _selection_rate_chart
- Signature: def _selection_rate_chart(privileged, unprivileged, privileged_rate, unprivileged_rate) -> BytesIO
- Location: lines 122-133
- Async: no
- Inputs: privileged, unprivileged, privileged_rate, unprivileged_rate
- Return annotation: BytesIO
- Docstring: None
- Internal calls: _figure_to_buffer
- External calls: ax.bar, ax.grid, ax.set_title, ax.set_ylabel, ax.set_ylim, ax.text, bar.get_width, bar.get_x, max, plt.subplots, zip
- Side effects: Primarily computational / in-memory transformation

### _attribute_fairness_chart
- Signature: def _attribute_fairness_chart(matrix) -> BytesIO
- Location: lines 136-156
- Async: no
- Inputs: matrix
- Return annotation: BytesIO
- Docstring: None
- Internal calls: _figure_to_buffer, _placeholder_chart, _safe_num
- External calls: ax.bar, ax.grid, ax.set_title, ax.set_ylabel, ax.set_ylim, ax.text, ax.tick_params, bar.get_width, bar.get_x, max, min, plt.subplots, row.get, str, zip
- Side effects: Primarily computational / in-memory transformation

### _disparity_before_after_chart
- Signature: def _disparity_before_after_chart(dpd, corrected_dpd, has_correction_simulation) -> BytesIO
- Location: lines 159-174
- Async: no
- Inputs: dpd, corrected_dpd, has_correction_simulation
- Return annotation: BytesIO
- Docstring: None
- Internal calls: _figure_to_buffer
- External calls: abs, ax.bar, ax.grid, ax.set_title, ax.set_ylabel, ax.set_ylim, ax.text, bar.get_width, bar.get_x, max, plt.subplots, zip
- Side effects: Primarily computational / in-memory transformation

### _intersectional_heatmap_chart
- Signature: def _intersectional_heatmap_chart(combinations) -> BytesIO
- Location: lines 177-227
- Async: no
- Inputs: combinations
- Return annotation: BytesIO
- Docstring: None
- Internal calls: _figure_to_buffer, _placeholder_chart, _safe_num
- External calls: ax.imshow, ax.set_title, ax.set_xticklabels, ax.set_xticks, ax.set_yticklabels, ax.set_yticks, ax.text, ax.tick_params, cell.get, combo.get, enumerate, len, np.arange, np.full, np.isnan, np.linspace, plt.colorbar, plt.subplots, range, sorted, str
- Side effects: Primarily computational / in-memory transformation

### _intersectional_outcome_summary
- Signature: def _intersectional_outcome_summary(combinations) -> str
- Location: lines 230-281
- Async: no
- Inputs: combinations
- Return annotation: str
- Docstring: None
- Internal calls: _safe_num
- External calls: cell.get, highest_cell.get, isinstance, len, np.isnan, selected_combo.get, str, sum, valid_values.append
- Side effects: Primarily computational / in-memory transformation

### _image_flowable
- Signature: def _image_flowable(image_buffer, width_mm, height_mm) -> Image
- Location: lines 284-285
- Async: no
- Inputs: image_buffer, width_mm, height_mm
- Return annotation: Image
- Docstring: None
- Internal calls: none detected
- External calls: Image
- Side effects: Primarily computational / in-memory transformation

### _metric_interpretation
- Signature: def _metric_interpretation(di, dpd, accuracy) -> List[List[str]]
- Location: lines 288-297
- Async: no
- Inputs: di, dpd, accuracy
- Return annotation: List[List[str]]
- Docstring: None
- Internal calls: none detected
- External calls: abs
- Side effects: Primarily computational / in-memory transformation

### generate_governance_compliance_pdf
- Signature: def generate_governance_compliance_pdf(report_payload) -> bytes
- Location: lines 300-625
- Async: no
- Inputs: report_payload
- Return annotation: bytes
- Docstring: None
- Internal calls: _attribute_fairness_chart, _disparity_before_after_chart, _image_flowable, _intersectional_heatmap_chart, _intersectional_outcome_summary, _map_correction_scenario, _metric_interpretation, _normalize_risk_level, _risk_color, _safe_num, _sanitize_text, _selection_rate_chart, _table
- External calls: BytesIO, HRFlowable, PageBreak, Paragraph, ParagraphStyle, SimpleDocTemplate, Spacer, Table, TableStyle, abs, banner.setStyle, bool, buffer.read, buffer.seek, colors.HexColor, context_table.setStyle, cover_table.setStyle, dashboard.setStyle, doc.build, entry.get, getSampleStyleSheet, glossary_rows.append, item.get, list, recommendation_rows.append, report_payload.get, risk_level.upper, story.append, str
- Side effects: Primarily computational / in-memory transformation


## Classes and Methods (Detailed)
- No classes defined.

## Connection Notes
- Use Internal calls to see function-to-function links inside this module.
- Use External calls to see dependencies on imported modules/services/utilities.
- For API behavior, trace router functions to their service calls and then to DB/file operations.
