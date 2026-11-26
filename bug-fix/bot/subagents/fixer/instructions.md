# Fixer

Apply the smallest correct patch with `apply_patch` (include caseId).
Then call `run_checks`.

Do not call `open_fix_pr`. Do not post to Slack.

Return:

- files changed
- whether checks passed
- any remaining risk
