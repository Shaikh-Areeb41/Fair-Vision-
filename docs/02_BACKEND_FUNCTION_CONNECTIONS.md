# Backend Function Connections (FV_backend)

This file lists module-level and function-level connections so you can trace exactly where logic originates and where it is consumed.

## main.py
- `get_allowed_origins()`
  - Used by FastAPI CORS middleware initialization.
  - Why: allow local/dev/prod frontend origins.
- `bootstrap_admin_user()`
  - Called from startup event.
  - Uses `users_collection` + `get_password_hash`.
  - Why: ensure admin account exists for admin routes.
- `startup_indexes()`
  - Startup hook creating unique/compound indexes.
  - Why: uniqueness guarantees and query performance.

## security.py
- `_prehash_password(password)`
  - Internal helper for bcrypt input hardening.
- `verify_password(plain_password, hashed_password)`
  - Called in `routers/auth.py` login/change-password.
- `get_password_hash(password)`
  - Called in registration, admin bootstrap, reset/change password.
- `create_access_token(data)`
  - Called in login and OAuth callback response generation.
- `create_password_reset_token(email)` / `verify_password_reset_token(token)`
  - Called by forgot/reset password endpoints.

## routers/auth.py
- `get_current_user(...)`
  - Dependency function consumed by protected routes across routers.
  - Connected routers: datasets, analysis, mitigation, audit_intelligence, reports, admin.
- `register(...)`
  - Calls `get_password_hash`, `users_collection.insert_one`, `send_verification_email`.
- `login(...)`
  - Calls `users_collection.find_one`, `verify_password`, `create_access_token`.
- `verify_email(...)`
  - Updates `emailVerified` fields in `users_collection`.
- `change_password(...)`
  - Uses `get_current_user`, `verify_password`, `get_password_hash`.
- `forgot_password(...)` and `reset_password(...)`
  - Use reset token helpers and email sender.
- `google_login/google_callback`, `github_login/github_callback`
  - OAuth transport + token issuance.

## routers/datasets.py
- `upload_dataset_endpoint(...)`
  - Calls `services.dataset_service.upload_dataset`.
- `get_user_history(...)`
  - Calls `list_datasets_for_owner` + `serialize_dataset`.
- `get_dataset_details(id, current_user)`
  - Calls `get_dataset_for_owner` + `serialize_dataset`.
- `configure_dataset(id, config, current_user)`
  - Calls `save_dataset_configuration`.
- `delete_dataset_endpoint(id, current_user)`
  - Calls `delete_dataset_for_owner`.

## routers/analysis.py
- `train_model(dataset_id, current_user)`
  - Calls `services.analysis_service.run_analysis(dataset_id, owner_id)`.
  - Why: keep HTTP handler thin and isolate business logic.

## routers/mitigation.py
- `apply_mitigation(dataset_id, current_user)`
  - Calls `services.mitigation_service.run_mitigation(dataset_id, owner_id)`.

## routers/audit_intelligence.py
- `_parse_dataset_id(...)`
  - Validates ObjectId from URL.
- `_validate_columns(...)`
  - Ensures requested attributes/outcome exist in dataset columns.
- `_extract_history_points(...)`
  - Pulls historical fairness values from user datasets.
- `_build_noop_proxy_payload(...)`
  - Placeholder proxy analysis payload (for UI compatibility).
- `run_audit_intelligence(...)`
  - Main orchestrator calling:
    1. `compute_multi_attribute_fairness`
    2. `analyze_intersectional_bias`
    3. `compute_fairness_drift`
    4. `compute_ethical_risk_score`
    5. `generate_fairness_explanations`
  - Persists result to `datasets_collection` (`audit_intelligence`, `audit_intelligence_history`).
- `get_latest_audit_intelligence(...)`
  - Reads persisted `dataset.audit_intelligence`.
- `get_audit_timeline(...)`
  - Returns cross-dataset historical points.

## routers/reports.py
- `_resolve_analysis_payload(dataset, analysis_id)`
  - Selects which analysis block to report (latest/current/specified).
- `_extract_base_fields(dataset)`
  - Pulls target/sensitive/privileged/unprivileged config.
- `_build_executive_summary(...)`
  - Summary paragraph constructor for governance PDF.
- `_strategic_recommendations(target, risk_level)`
  - Narrative recommendations by risk posture.
- `generate_report(payload, current_user)`
  - Calls `generate_governance_compliance_pdf(report_payload)`.
  - Persists report metadata in `reports_collection`.
- `get_report_history(...)` / `download_generated_report(...)`
  - Metadata listing + stored PDF retrieval.

## routers/admin.py
- `_ensure_test_admin(current_user)`
  - Blocks non-admin access.
- `list_users(...)`
  - Reads users and per-user dataset count.
- `delete_user(...)`
  - Cascades delete across users/datasets/reports.

## services/dataset_service.py
- `normalize_dataset_name(name)`
  - Used to enforce consistent dataset naming key.
- `serialize_dataset(doc)`
  - Converts Mongo object to API-friendly shape (`id` instead of `_id`).
- `ensure_valid_object_id(value, detail)`
  - Shared ObjectId validation helper.
- `store_full_dataset(df, owner_id, filename)`
  - Writes CSV to disk storage.
- `load_full_dataset(dataset_doc)`
  - Reads disk CSV; falls back to legacy fields when needed.
- `store_preview(df, limit)`
  - Compact preview rows for fast UI rendering.
- `upload_dataset(content, filename, owner_id)`
  - Validation + full/preview persistence + metadata insert.
- `list_datasets_for_owner(owner_id)` / `get_dataset_for_owner(dataset_id, owner_id)`
  - Ownership-safe retrieval APIs.
- `save_dataset_configuration(dataset_id, owner_id, config)`
  - Writes target/sensitive group config.
- `delete_dataset_for_owner(dataset_id, owner_id)`
  - Deletes DB record and related stored file if present.

## services/ml_utils.py
- `clean_training_dataframe(df)`
  - Shared null/invalid row cleanup.
- `apply_privileged_group_rules(...)`
  - Parses privileged-group rules (`>`, `>=`, comma values, exact match).
- `encode_dataset(df, target_col, sensitive_col)`
  - Label-encodes categorical features and target/sensitive columns.
- `fit_logistic_classifier(X, y)`
  - Model fit utility reused by analysis/mitigation services.
- `compute_group_metrics(...)`, `compute_binary_group_metrics(...)`
  - Fairness group metrics reusable helpers.
- `find_threshold_for_target_rate(probabilities, target_rate)`
  - Mitigation threshold search utility.

## services/analysis_service.py
- `run_analysis(dataset_id, owner_id)`
  - Calls `get_dataset_for_owner`, `load_full_dataset`, `ml_utils` helpers.
  - Computes fairness metrics and stores `dataset.analysis`.

## services/mitigation_service.py
- `run_mitigation(dataset_id, owner_id)`
  - Calls `get_dataset_for_owner`, `load_full_dataset`, `ml_utils` helpers.
  - Applies threshold optimization and stores `dataset.mitigation`.

## audit_intelligence/fairness_metrics.py
- `compute_multi_attribute_fairness(...)`
  - Called by router orchestrator; source for matrix/global fairness/aggregates.
- `compute_fairness_drift(history_points, current_score)`
  - Called by router orchestrator and consumed by risk scoring.

## audit_intelligence/intersectional_analysis.py
- `_significance_test(...)`
  - Statistical significance for subgroup deviation reliability.
- `_build_cell(...)`
  - Creates a single heatmap cell with severity/deviation/count.
- `_build_sunburst(...)`
  - Hierarchical data for visual summarization.
- `_rank_worst_subgroups(...)`
  - Sorts highest-deviation subgroup risks.
- `analyze_intersectional_bias(...)`
  - Main pairwise intersectional analysis entry point.

## audit_intelligence/risk_scoring.py
- `compute_ethical_risk_score(fairness_payload, drift_payload)`
  - Combines parity/DI/equalized-odds/stability into compliance score + risk level.
  - Output consumed by `audit_intelligence` endpoint and `reports` endpoint.

## audit_intelligence/explainability_engine.py
- `generate_fairness_explanations(...)`
  - Produces structured explanation cards consumed by UI and report summary payload.

## audit_intelligence/governance_report_generator.py
- Chart/table helpers (`_selection_rate_chart`, `_attribute_fairness_chart`, `_intersectional_heatmap_chart`, etc.)
  - Called only by final generator.
- `_intersectional_outcome_summary(combinations)`
  - Narrative explanation under heatmap in generated report.
- `generate_governance_compliance_pdf(report_payload)`
  - Final PDF bytes producer called by `routers/reports.py`.

## audit_intelligence/utils/preprocessing.py
- Data sanitation/classification/coercion helpers used by fairness and intersectional modules.

## scripts/generate_intersectional_bias_datasets.py
- Standalone data generator for demo/testing datasets.
- Not called by runtime API; used manually.

---

## Runtime connection shortcuts
- If endpoint fails with 401 -> inspect `routers/auth.py:get_current_user` + frontend token path.
- If metrics seem wrong -> inspect `analysis_service.py` + `ml_utils.py`.
- If risk level seems wrong -> inspect `risk_scoring.py` and drift contribution from `fairness_metrics.py`.
- If PDF content seems wrong -> inspect `routers/reports.py` payload mapping then `governance_report_generator.py` rendering.
