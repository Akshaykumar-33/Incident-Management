---
description: Draft a short final RCA after root cause is clear; then call post_rca.
---

# Write RCA

1. Call `get_case` for the case id.
2. Draft an RCA with only:
   - Summary
   - Timeline
   - Root cause
   - Impact
   - Resolution / mitigation
   - Follow-ups (include: wait for human `fix it` before a PR)
3. Prefer facts on the case. Mark fixture evidence as synthetic.
4. Keep under ~40 lines.
5. Call `post_rca` — do **not** open a PR from this skill.
