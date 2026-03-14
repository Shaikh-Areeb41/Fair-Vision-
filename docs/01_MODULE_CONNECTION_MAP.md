# Fair Vision 4 — Module Connection Map

This document explains how modules connect across backend and frontend, why they are connected, and where each feature flows.

## 1) Top-Level Architecture

```text
ui_project (React + TypeScript)
  -> calls REST API (/api/*)
FV_backend (FastAPI + services + audit_intelligence)
  -> reads/writes MongoDB (users, datasets, reports)
  -> reads/writes CSV files on disk (stored_datasets)
```

### Why this split exists
- Frontend handles interaction, state, and visual explanations.
- Backend owns security, data ownership checks, metric computation, mitigation, and report generation.
- MongoDB stores metadata + analysis artifacts; filesystem stores full uploaded CSV files.

## 2) Backend Module Graph

## Entry + wiring
- `FV_backend/main.py`
  - Includes routers: `auth`, `datasets`, `analysis`, `mitigation`, `audit_intelligence`, `reports`, `admin`.
  - Creates indexes and bootstraps admin user on startup.
  - Sets CORS allowed origins.

## Persistence and security
- `FV_backend/database.py`
  - Exposes Mongo collections: `users_collection`, `datasets_collection`, `reports_collection`.
- `FV_backend/security.py`
  - Password hashing + verification, JWT token creation/verification, password reset token.
- `FV_backend/models.py`
  - Request/response validation models (user and dataset schemas).

## HTTP routing layer
- `FV_backend/routers/auth.py`
  - Login/register/verify/reset/change password + Google/GitHub OAuth.
  - Depends on `security.py` and `database.py`.
- `FV_backend/routers/datasets.py`
  - Upload/history/get/configure/delete dataset.
  - Delegates to `services/dataset_service.py`.
- `FV_backend/routers/analysis.py`
  - Triggers model/fairness analysis.
  - Delegates to `services/analysis_service.py`.
- `FV_backend/routers/mitigation.py`
  - Applies mitigation scenario.
  - Delegates to `services/mitigation_service.py`.
- `FV_backend/routers/audit_intelligence.py`
  - Orchestrates advanced fairness analysis pipeline.
  - Calls fairness/intersectional/drift/risk/explainability modules.
- `FV_backend/routers/reports.py`
  - Builds governance report payload and streams generated PDF.
  - Calls `audit_intelligence/governance_report_generator.py`.
- `FV_backend/routers/admin.py`
  - Admin-only user listing/deletion with ownership-safe cascading delete.

## Service layer
- `FV_backend/services/dataset_service.py`
  - Dataset ownership enforcement, CSV storage/load, preview generation, config persistence.
- `FV_backend/services/analysis_service.py`
  - Main model analysis + fairness metric output.
- `FV_backend/services/mitigation_service.py`
  - Threshold-based mitigation simulation.
- `FV_backend/services/ml_utils.py`
  - Shared preprocessing, encoding, model fit, metric helpers.

## Fairness intelligence layer
- `FV_backend/audit_intelligence/fairness_metrics.py`
  - Multi-attribute fairness matrix + global score.
- `FV_backend/audit_intelligence/intersectional_analysis.py`
  - Pairwise subgroup heatmap, significance, worst-subgroup extraction.
- `FV_backend/audit_intelligence/risk_scoring.py`
  - Compliance score and risk level from fairness + drift stability.
- `FV_backend/audit_intelligence/explainability_engine.py`
  - Human-readable findings/recommendations.
- `FV_backend/audit_intelligence/governance_report_generator.py`
  - PDF layout/charts/tables, section narrative.
- `FV_backend/audit_intelligence/utils/preprocessing.py`
  - Shared normalization and binary coercion utilities.

## 3) Frontend Module Graph

## App shell + routing
- `ui_project/src/main.tsx`
  - Boots app, theme provider, error boundary, toaster, axios base URL default.
- `ui_project/src/App.tsx`
  - Defines protected/unprotected routes and app navigation transitions.

## Auth/session context
- `ui_project/src/context/AuthContext.tsx`
  - Owns user session lifecycle (`login`, `register`, `loginWithToken`, `logout`).
  - Persists auth token/user in localStorage.

## API client + domain helpers
- `ui_project/src/lib/api.ts`
  - Shared token read/write, auth header construction, typed API helpers.

## Page modules (feature entry points)
- `ui_project/src/pages/LoginPage.tsx`
- `ui_project/src/pages/VerifyEmailPage.tsx`
- `ui_project/src/pages/OAuthCallbackPage.tsx`
- `ui_project/src/pages/ResetPasswordPage.tsx`
- `ui_project/src/pages/UploadPage.tsx`
- `ui_project/src/pages/TrainingPage.tsx`
- `ui_project/src/pages/AnalysisPage.tsx` (legacy/supportive display page)
- `ui_project/src/pages/MitigationPage.tsx`
- `ui_project/src/pages/AuditIntelligencePage.tsx`
- `ui_project/src/pages/ReportsPage.tsx`
- `ui_project/src/pages/HistoryPage.tsx`
- `ui_project/src/pages/SettingsPage.tsx`
- `ui_project/src/pages/AdminTestPage.tsx`

## Reusable app components
- `ui_project/src/components/Dashboard.tsx`
- `ui_project/src/components/ConfigurationStep.tsx`
- `ui_project/src/components/FileUpload.tsx`
- `ui_project/src/components/TopNav.tsx`
- `ui_project/src/components/ThemeProvider.tsx`
- `ui_project/src/components/ThemeToggle.tsx`
- `ui_project/src/components/ErrorBoundary.tsx`
- `ui_project/src/components/LoadingScreen.tsx`
- `ui_project/src/components/Charts/BiasBarChart.tsx`
- `ui_project/src/components/Charts/BiasVerticalBar.tsx`

## UI primitive library (design-system wrappers)
- `ui_project/src/components/ui/*`
  - Generic presentational wrappers (button, dialog, tabs, etc.).
  - These are not business logic modules, so they are connected via imports only.

## 4) End-to-End Flows

## Auth flow
1. `LoginPage` or OAuth callback -> `AuthContext` -> `lib/api.auth.*`.
2. Backend `auth.py` validates, returns JWT.
3. Frontend stores token and user; protected routes unlock in `App.tsx`.

## Upload + configure flow
1. `UploadPage` uploads CSV -> `POST /api/datasets/upload`.
2. Backend `datasets.py` -> `dataset_service.upload_dataset` stores full file + metadata.
3. `ConfigurationStep` saves target/sensitive/privileged/unprivileged -> `POST /api/datasets/{id}/configure`.

## Analysis flow
1. `TrainingPage` -> `POST /api/analysis/{dataset_id}/train`.
2. Backend `analysis.py` -> `analysis_service.run_analysis` -> `ml_utils`.
3. Result stored and displayed in `Dashboard`/related pages.

## Mitigation flow
1. `MitigationPage` -> `POST /api/mitigation/{dataset_id}/apply`.
2. Backend `mitigation.py` -> `mitigation_service.run_mitigation`.
3. UI shows before/after fairness metrics.

## Audit intelligence flow
1. `AuditIntelligencePage` -> `POST /api/audit-intelligence/{dataset_id}/analyze`.
2. Backend sequence:
   - `compute_multi_attribute_fairness`
   - `analyze_intersectional_bias`
   - `compute_fairness_drift`
   - `compute_ethical_risk_score`
   - `generate_fairness_explanations`
3. Composite result persisted in dataset and rendered in UI.

## Report generation flow
1. `ReportsPage` -> `POST /api/reports/generate`.
2. Backend `reports.py` composes payload from dataset analysis + audit intelligence + mitigation.
3. `governance_report_generator.py` builds PDF bytes.
4. Frontend downloads file and can show report history via `GET /api/reports/history`.

## 5) Notable connection decisions
- Drift is computed in backend for risk stability and governance scoring.
- Drift is intentionally not shown in primary Audit Intelligence KPI card UI.
- Token retrieval is centralized (`lib/api.getToken`) and should be reused by page-level calls.
- All data-sensitive routes rely on ownership from `get_current_user` in backend dependencies.

## 6) Quick “where to look” map
- Authentication problems: `routers/auth.py`, `context/AuthContext.tsx`, `lib/api.ts`, `pages/LoginPage.tsx`.
- Dataset upload/config issues: `routers/datasets.py`, `services/dataset_service.py`, `pages/UploadPage.tsx`, `components/ConfigurationStep.tsx`.
- Model fairness metrics mismatch: `services/analysis_service.py`, `services/ml_utils.py`, `components/Dashboard.tsx`.
- Mitigation mismatch: `services/mitigation_service.py`, `pages/MitigationPage.tsx`.
- Intersectional heatmap/report mismatch: `audit_intelligence/intersectional_analysis.py`, `audit_intelligence/governance_report_generator.py`, `pages/AuditIntelligencePage.tsx`, `pages/ReportsPage.tsx`.
- Compliance/risk score logic: `audit_intelligence/risk_scoring.py`, `routers/audit_intelligence.py`, `routers/reports.py`.
