---
description: Classify Slack messages as new incident, existing incident, or not an incident.
---

# Triage rubric

## Classifications

| Label | When |
| --- | --- |
| `new_incident` | Clear production impact, outage, error spike, or customer-facing failure, and it does not match an open incident |
| `existing_incident` | Message adds evidence, status, or questions about an already open incident (same thread, or matching service + symptom) |
| `not_incident` | Social chatter, questions with no impact, planning, or unrelated ops talk |

## Extract

- `title`: short, concrete (max ~12 words)
- `service`: named service or component when stated
- `severity`: `low` | `medium` | `high` | `critical`
- `symptoms`: one or two sentences of observed impact

## Severity guide

- `critical`: total outage or data loss
- `high`: major feature broken for many users
- `medium`: partial degradation or elevated errors
- `low`: minor or contained issue

## Output for the parent

Return a compact block the parent can act on:

```text
classification: new_incident|existing_incident|not_incident
incidentId: <id or none>
title: ...
service: ...
severity: ...
symptoms: ...
reason: <one sentence>
```
