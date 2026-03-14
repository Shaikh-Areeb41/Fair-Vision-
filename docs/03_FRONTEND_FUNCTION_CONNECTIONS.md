# Frontend Function Connections (ui_project/src)

This document focuses on app/business files (not generic `components/ui/*` primitives).

## 1) Bootstrap and route composition

## `main.tsx`
- Configures app root providers: `ThemeProvider`, `ErrorBoundary`, `Toaster`.
- Sets `axios.defaults.baseURL` from `VITE_API_URL` fallback.
- Reads persisted theme and applies early to root HTML.

## `App.tsx`
- `ProtectedLayout(...)`
  - Wraps protected pages with top nav + theme toggle.
- `AppContent()`
  - Uses `useAuth()` for route protection.
  - `handleUploadComplete(...)`
    - Stores `activeDatasetId` in localStorage/sessionStorage and navigates to `/train`.
  - `handleLoadingComplete()`
    - Clears loading state and navigates.
- Exposes protected routes for dashboard/upload/train/mitigation/audit-intelligence/reports/history/settings/admin.

## 2) Auth and API utility layer

## `context/AuthContext.tsx`
- `AuthProvider(...)`
  - Loads session from `getToken()` + `getUser()`.
- `clearSessionState()`
  - Clears `activeDatasetId`, `analysisResults`, `dashboardData`.
- `login(email, password)`
  - Calls `auth.login` from `lib/api.ts`.
  - Persists token/user.
- `register(email, password, name)`
  - Calls `auth.register`, then `login`.
- `loginWithToken(token, oauthUser)`
  - Used by OAuth callback path.
- `logout()`
  - Clears token and session artifacts.
- `useAuth()`
  - Consumer hook for protected pages/components.

## `lib/api.ts`
- Token helpers:
  - `readAuthToken()` -> checks `access_token`, `fv_token`, `token`.
  - `getToken()`, `setToken()`, `removeToken()`, `getUser()`.
- `auth` namespace:
  - `login`, `register`, `verifyEmail`.
- `auditIntelligenceApi` namespace:
  - `runAnalysis(datasetId, payload)`.
  - `getLatest(datasetId)`.
  - `getTimeline()`.
- `reportsApi` namespace:
  - `generateComplianceReport`, `getReportHistory`, `downloadReportById`.
- `adminApi` namespace:
  - `getUsers`, `deleteUser`.

## 3) Page-level feature connections

## `pages/LoginPage.tsx`
- Connects form submission to `AuthContext.login` and `AuthContext.register`.
- Handles social login redirects to backend auth provider routes.
- On success, route transitions handled by app-level auth state.

## `pages/VerifyEmailPage.tsx`
- Calls `auth.verifyEmail` and routes user back to login flow.

## `pages/OAuthCallbackPage.tsx`
- Parses callback query params and exchanges code for app token.
- Uses `loginWithToken` to store session.

## `pages/ResetPasswordPage.tsx`
- Submits reset token + new password to backend auth reset endpoint.

## `pages/UploadPage.tsx`
- Uploads CSV to `/datasets/upload`.
- Saves returned dataset ID to storage.
- Opens `ConfigurationStep` modal for required config.
- On completion, calls parent callback to continue flow.

## `pages/TrainingPage.tsx`
- Reads active dataset ID from props/storage.
- Calls `/analysis/{id}/train`.
- Stores results in `analysisResults` and routes to dashboard.

## `pages/AnalysisPage.tsx`
- Helper display page that maps analysis payload into cards/charts.
- Key helpers: `prepareChartData`, `buildMetricsFromResults`.

## `pages/MitigationPage.tsx`
- Loads dataset analysis context via `/datasets/{id}`.
- Calls `/mitigation/{id}/apply`.
- Renders before/after metrics and chart deltas.
- Uses shared token helper (`getToken`) and normalized API URL.

## `pages/AuditIntelligencePage.tsx`
- Builds request payload from selected attributes and target/outcome.
- Calls `auditIntelligenceApi.runAnalysis(...)`.
- Retrieves latest audit payload for dataset context.
- Renders fairness matrix + intersectional heatmap + explanations.
- Drift is not shown in KPI card UI (kept backend-side for scoring).

## `pages/ReportsPage.tsx`
- Reads analysis/audit context from storage/current dataset state.
- Uses backend-aligned compliance narrative and summary content.
- Calls `reportsApi.generateComplianceReport` for backend PDF.
- Shows and downloads report history using `reportsApi` methods.

## `pages/HistoryPage.tsx`
- Calls `/datasets/history` and renders dataset list.
- Computes quick bias badge from DPD threshold.
- Supports delete (`DELETE /datasets/{id}`) and resume flow.

## `pages/SettingsPage.tsx`
- Displays user profile fields.
- Calls auth password-change endpoint.
- Updates local user state after successful changes.

## `pages/AdminTestPage.tsx`
- Admin-only page calling `adminApi.getUsers` and `adminApi.deleteUser`.

## 4) Core reusable components

## `components/Dashboard.tsx`
- Pulls active dataset details and analysis/mitigation payloads.
- Displays key fairness KPIs and charts.
- Reads fallback analysis from localStorage when needed.

## `components/ConfigurationStep.tsx`
- Fetches columns for selected dataset.
- Validates and submits target/sensitive/privileged/unprivileged values.
- Saves configuration via `/datasets/{id}/configure`.

## `components/FileUpload.tsx`
- Drag/drop and file picker wrapper.
- Emits selected file to Upload page.

## `components/TopNav.tsx`
- Route links and session-level navigation controls.

## `components/LoadingScreen.tsx`
- Transition loading screen for multi-step flows.

## `components/ThemeProvider.tsx`, `components/ThemeToggle.tsx`
- Theme state + selector controls.

## `components/Charts/BiasBarChart.tsx`, `components/Charts/BiasVerticalBar.tsx`
- Chart wrappers used by dashboard/mitigation/reporting views.

## `components/ErrorBoundary.tsx`
- Captures render errors and prevents full app crash.

## 5) Storage keys and where they are used

- `fv_token` / `access_token` / `token`
  - Read via `lib/api.getToken`.
  - Set/cleared in AuthContext login/logout.
- `fv_user`
  - Saved by AuthContext; used for route personalization and auth persistence.
- `activeDatasetId`
  - Set during upload/resume flows; read across training/mitigation/dashboard/audit/report pages.
- `analysisResults`
  - Set in training flow; used as immediate dashboard fallback.
- `dashboardData`
  - Used by dashboard/report page caching and continuity.
- `theme`
  - Applied at startup in `main.tsx` and toggled in Theme components.

## 6) App-specific vs generic file priority

When debugging business logic, prioritize:
1. `pages/*`
2. `context/AuthContext.tsx`
3. `lib/api.ts`
4. `components/Dashboard.tsx`, `components/ConfigurationStep.tsx`

`components/ui/*` are generic visual primitives and usually not where business bugs originate.
