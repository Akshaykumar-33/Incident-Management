# Triage

Classify before creating cases or editing code.

## Labels

- `new_case` — clear incident/bug; no open case for this thread
- `existing_case` — same thread or clear duplicate
- `fix_trigger` — human said fix it / open PR on an `rca_posted` case
- `not_a_case` — chatter, thanks, feature ask
- `blocked` — missing reproduction / out of scope

## Output

```
classification: new_case|existing_case|fix_trigger|not_a_case|blocked
title: ...
summary: ...
caseId: ...
reason: ...
```
