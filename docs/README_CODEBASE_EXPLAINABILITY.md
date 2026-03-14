# Codebase Explainability Docs

This folder was generated to help you quickly understand module dependencies and where to edit specific behavior.

## Files
- `01_MODULE_CONNECTION_MAP.md`
  - Full backend/frontend module graph and end-to-end feature flows.
- `02_BACKEND_FUNCTION_CONNECTIONS.md`
  - Function-to-function and module-to-module backend dependency map.
- `03_FRONTEND_FUNCTION_CONNECTIONS.md`
  - Page/component/context/api client connection map.
- `04_FILE_LOOKUP_AND_LINE_BY_LINE_GUIDE.md`
  - Practical file-by-file reading order and “where to look” guide.

## Recommended reading order
1. `01_MODULE_CONNECTION_MAP.md`
2. `02_BACKEND_FUNCTION_CONNECTIONS.md`
3. `03_FRONTEND_FUNCTION_CONNECTIONS.md`
4. `04_FILE_LOOKUP_AND_LINE_BY_LINE_GUIDE.md`

## Scope note
- Business logic and feature files are fully covered.
- Generic UI primitive files under `ui_project/src/components/ui/*` are intentionally grouped because they are reusable wrappers, not domain logic.
