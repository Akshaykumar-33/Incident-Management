# Triage bug reports

Classify the Slack message before creating cases or editing code.

## Labels

Return exactly one:

- `new_bug` — clear defect with symptoms; no open case for this thread
- `existing_bug` — same thread or clear duplicate of an open case
- `not_a_bug` — chatter, thanks, questions without a defect, feature ask
- `blocked` — bug-like but missing reproduction or outside the repo

## Extract

- title (≤80 chars)
- summary (symptoms, expected vs actual, steps)
- channelId / threadTs when present in the prompt

## Output block

```
classification: new_bug|existing_bug|not_a_bug|blocked
title: ...
summary: ...
caseId: ...   # when existing
reason: ...
```
