---
description: Form ranked hypotheses and recommended checks from incident context plus fixture evidence.
---

# Investigate

1. Call `get_incident` for the incident id.
2. Call `load_fixture_evidence` (manifest first, then relevant files).
3. Correlate symptoms with deploy timeline, error logs, and recent changes.
4. Produce 2–4 ranked hypotheses. Each needs:
   - hypothesis
   - why it fits (cite fixture filenames, not invented facts)
   - recommended check
5. Call `update_incident` with the new hypotheses (and evidence notes).
6. Reply for Slack: short bullets only. Label evidence as synthetic fixtures.

Do not declare a root cause until a human confirms it.
