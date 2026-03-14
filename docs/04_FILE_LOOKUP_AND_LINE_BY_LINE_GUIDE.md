# File Lookup + Line-by-Line Explainability Guide

You asked for detailed explainability so you can quickly find the exact place to change behavior. This guide gives a practical line-by-line reading strategy for each important file.

> Note: The project contains many generic UI primitive files under `ui_project/src/components/ui/*`. Those are design-system wrappers; they are intentionally grouped instead of expanded line-by-line because they are reusable presentational scaffolding, not fairness/business logic.

## 1) How to read any file line-by-line (repeatable method)

For each file, read in this order:
1. Imports and constants: identify dependencies and hidden config assumptions.
2. Data types/models: identify expected shapes and payload contracts.
3. Helper functions: identify transformations and guardrails.
4. Main function/component/endpoint: identify control flow and branching.
5. Side effects: DB writes, file writes, storage writes, API calls, navigation.
6. Return shape/UI rendering: identify what downstream modules consume.

Use these questions:
- What inputs does this file trust?
- What outputs does this file guarantee?
- Which module would break if I changed this return shape?
- Is ownership/auth checked before data access?

## 2) Backend file-by-file explainability index

## Core app wiring
- `FV_backend/main.py`
  - Read startup hooks first (`startup_indexes`, `bootstrap_admin_user`), then router includes, then CORS.
  - Change here when adding/removing routers or startup initialization.

- `FV_backend/database.py`
  - Read client/db/collection exports.
  - Change here for DB name, collection naming, or connection lifecycle.

- `FV_backend/security.py`
  - Read token expiration constants, hash/verify functions, token create/verify functions.
  - Change here for JWT policy or password handling.

- `FV_backend/models.py`
  - Read validators and field aliases.
  - Change here for request schema or password policy updates.

## Routers
- `FV_backend/routers/auth.py`
  - Read `get_current_user` dependency first (used project-wide).
  - Then login/register/verify/reset/change password/OAuth endpoints.
  - Edit here for auth APIs, verification behavior, OAuth callback handling.

- `FV_backend/routers/datasets.py`
  - Read endpoint signatures and mapping to `dataset_service`.
  - Edit here when request/response contracts for dataset APIs change.

- `FV_backend/routers/analysis.py`
  - Thin endpoint wrapper around analysis service.
  - Edit here only for endpoint-level validation/mapping.

- `FV_backend/routers/mitigation.py`
  - Thin endpoint wrapper around mitigation service.
  - Edit here for endpoint contract or auth dependency changes.

- `FV_backend/routers/audit_intelligence.py`
  - Read helpers (`_validate_columns`, `_extract_history_points`) before main orchestrator endpoint.
  - Edit here to change orchestration sequence or response payload structure.

- `FV_backend/routers/reports.py`
  - Read payload resolver and summary/recommendation builders, then generate/download/history endpoints.
  - Edit here when report payload fields or report selection rules change.

- `FV_backend/routers/admin.py`
  - Read admin access check and cascade-delete path.
  - Edit here for admin policy and diagnostics tooling.

## Services
- `FV_backend/services/dataset_service.py`
  - Read object-id helpers and serializer first.
  - Then read full storage path logic (`store_full_dataset`, `load_full_dataset`, `store_preview`).
  - Edit here for CSV persistence, ownership-safe retrieval, or dataset schema storage.

- `FV_backend/services/ml_utils.py`
  - Read cleaning and encoding helpers first.
  - Then read fit and metric computation functions.
  - Edit here for model/metric math and group-rule parsing.

- `FV_backend/services/analysis_service.py`
  - Read end-to-end pipeline from loading data to storing `analysis` block.
  - Edit here for analysis metric definitions and training flow behavior.

- `FV_backend/services/mitigation_service.py`
  - Read threshold search invocation and projected metric output.
  - Edit here for mitigation algorithm details.

## Audit intelligence modules
- `FV_backend/audit_intelligence/fairness_metrics.py`
  - Read per-attribute stats loop, then fairness aggregate formula.
  - Drift function is below and feeds risk scoring stability component.

- `FV_backend/audit_intelligence/intersectional_analysis.py`
  - Read cell builder + significance test + ranking helpers, then main orchestrator.
  - Edit here for heatmap severity logic and subgroup reliability thresholds.

- `FV_backend/audit_intelligence/risk_scoring.py`
  - Read component extraction then weighted compliance formula.
  - Edit here to rebalance risk score component weights/thresholds.

- `FV_backend/audit_intelligence/explainability_engine.py`
  - Read threshold helpers then recommendation builders then main generator.
  - Edit here for narrative severity thresholds and recommendation phrasing.

- `FV_backend/audit_intelligence/governance_report_generator.py`
  - Read helper chart/table functions first, then main PDF generator body.
  - Intersectional explanatory paragraph is generated under heatmap via `_intersectional_outcome_summary`.

- `FV_backend/audit_intelligence/utils/preprocessing.py`
  - Read sanitation and binary coercion utilities.
  - Edit here when handling new data formats or missing-value policies.

## Scripts/tests
- `FV_backend/scripts/generate_intersectional_bias_datasets.py`
  - Standalone synthetic generator (not runtime).
- `FV_backend/tests/*.py`
  - Contract checks for fairness metrics, intersectional behavior, ownership, preprocessing.

## 3) Frontend file-by-file explainability index

## App shell and context
- `ui_project/src/main.tsx`
  - Root providers, axios base URL, early theme bootstrap.

- `ui_project/src/App.tsx`
  - Route ownership and protected layout.
  - Upload completion navigation handoff to training flow.

- `ui_project/src/context/AuthContext.tsx`
  - Session lifecycle and storage management.
  - First place to inspect for login/logout/session persistence issues.

- `ui_project/src/lib/api.ts`
  - All centralized API wrappers and token-header logic.
  - First place to inspect for 401/auth mismatch issues.

## Pages
- `ui_project/src/pages/LoginPage.tsx`
  - Form validation + login/register/oAuth triggers.

- `ui_project/src/pages/VerifyEmailPage.tsx`
  - Email verification code flow.

- `ui_project/src/pages/OAuthCallbackPage.tsx`
  - Provider callback token exchange and session setup.

- `ui_project/src/pages/ResetPasswordPage.tsx`
  - Password reset submit flow.

- `ui_project/src/pages/UploadPage.tsx`
  - CSV upload + dataset ID persistence + config modal opening.

- `ui_project/src/pages/TrainingPage.tsx`
  - Analysis trigger and result caching/navigation.

- `ui_project/src/pages/AnalysisPage.tsx`
  - Analysis payload formatting for display cards/charts.

- `ui_project/src/pages/MitigationPage.tsx`
  - Dataset fetch and mitigation apply flow.
  - Uses shared token helper + normalized API path.

- `ui_project/src/pages/AuditIntelligencePage.tsx`
  - Multi-attribute selection form, run analysis, render matrix/heatmap/explanations.
  - Drift KPI card is intentionally hidden from primary UI.

- `ui_project/src/pages/ReportsPage.tsx`
  - Governance view + report generation/download/history behavior.

- `ui_project/src/pages/HistoryPage.tsx`
  - Dataset history list and delete/resume actions.

- `ui_project/src/pages/SettingsPage.tsx`
  - User profile/security changes.

- `ui_project/src/pages/AdminTestPage.tsx`
  - Admin-only user management operations.

## App components
- `ui_project/src/components/Dashboard.tsx`
  - Aggregates dataset metadata and fairness metrics into primary dashboard cards/charts.

- `ui_project/src/components/ConfigurationStep.tsx`
  - Column loading and dataset config persistence.

- `ui_project/src/components/FileUpload.tsx`
  - Drag/drop wrapper and file object handoff.

- `ui_project/src/components/TopNav.tsx`
  - Global navigation links.

- `ui_project/src/components/LoadingScreen.tsx`
  - Transitional loading visuals.

- `ui_project/src/components/ThemeProvider.tsx`
- `ui_project/src/components/ThemeToggle.tsx`
  - Theme state and selector UI.

- `ui_project/src/components/ErrorBoundary.tsx`
  - Runtime safety fallback.

- `ui_project/src/components/Charts/BiasBarChart.tsx`
- `ui_project/src/components/Charts/BiasVerticalBar.tsx`
  - Reusable fairness metric chart wrappers.

## 4) Connection checklist by task (what file to open first)

- Fix login/401 issues
  - `ui_project/src/lib/api.ts`
  - `ui_project/src/context/AuthContext.tsx`
  - `FV_backend/routers/auth.py`

- Fix upload/config/columns issues
  - `ui_project/src/pages/UploadPage.tsx`
  - `ui_project/src/components/ConfigurationStep.tsx`
  - `FV_backend/routers/datasets.py`
  - `FV_backend/services/dataset_service.py`

- Fix analysis metrics issues
  - `ui_project/src/pages/TrainingPage.tsx`
  - `FV_backend/services/analysis_service.py`
  - `FV_backend/services/ml_utils.py`

- Fix mitigation issues
  - `ui_project/src/pages/MitigationPage.tsx`
  - `FV_backend/services/mitigation_service.py`

- Fix intersectional heatmap/report content
  - `ui_project/src/pages/AuditIntelligencePage.tsx`
  - `FV_backend/audit_intelligence/intersectional_analysis.py`
  - `FV_backend/audit_intelligence/governance_report_generator.py`

- Fix risk/compliance logic
  - `FV_backend/audit_intelligence/risk_scoring.py`
  - `FV_backend/audit_intelligence/fairness_metrics.py`
  - `FV_backend/routers/audit_intelligence.py`

- Fix report PDF generation/download
  - `ui_project/src/pages/ReportsPage.tsx`
  - `FV_backend/routers/reports.py`
  - `FV_backend/audit_intelligence/governance_report_generator.py`

## 5) Known duplicate/legacy candidates to review
- `ui_project/src/components/UploadPage.tsx` appears to mirror `pages/UploadPage.tsx`.
- `ui_project/src/components/TrainingPage.tsx` appears to mirror `pages/TrainingPage.tsx`.
- `components/ui/*` is extensive primitive library; changes there affect many screens globally.

---

If you want true full line-by-line annotations for every source file, the next step is to generate one markdown per file under `docs/file-notes/` with exact code-block commentary. That is possible, but very large (many docs) and best done in phases (backend first, then frontend pages/components, then UI primitives).
