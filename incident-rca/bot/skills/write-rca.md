---
description: Draft a short final RCA after an incident is resolved.
---

# Write RCA

1. Call `get_incident` for the resolved incident.
2. Draft an RCA with these sections only:
   - Summary
   - Timeline
   - Root cause
   - Impact
   - Resolution
   - Follow-ups
3. Prefer facts already stored on the incident. Mark fixture-sourced
   evidence as synthetic.
4. Keep the whole RCA under ~40 lines. No executive fluff.
