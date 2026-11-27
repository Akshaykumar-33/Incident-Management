# Investigate code

1. Call `ensure_repo` (with caseId) so the workspace and fix branch exist.
2. Use UI text, error strings, component/CSS names from the report as
   `search_code` queries.
3. `read_file` the matching modules. Trace why the symptom happens —
   not only where it appears.
4. Record findings on the case via `update_bug_case`.
5. Prefer one root cause hypothesis before editing.
