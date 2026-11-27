# Investigate

1. `get_case` for context.
2. `load_fixture_evidence` (manifest, then relevant files) when useful.
3. For code defects, you may `ensure_repo` + `search_code` + `read_file`
   **read-only** during investigation. Do **not** `apply_patch` until
   `approve_fix` succeeds.
4. Produce 2–4 ranked hypotheses; `update_case` with hypotheses/evidence.
5. Do not declare root cause until the human confirms or evidence is clear
   enough for RCA.
