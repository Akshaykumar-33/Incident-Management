# Incident-Management

Agent SDK (“Grokbot”) agents for Slack incident and bug workflows.

| Agent | Path | Role |
| --- | --- | --- |
| Bug fix | [`bug-fix/`](bug-fix/) | Watch Slack bugs, investigate `BUG_FIX_REPO`, draft fix PR |

`incident-rca/` (Slack triage → RCA) lives on a separate branch/PR and stays
a sibling agent — RCA and code-fix are not merged into one bot.

See [`bug-fix/README.md`](bug-fix/README.md) for local serve, Slack tokens,
`BUG_FIX_REPO=owner/name`, and deploy notes.
