# Open a draft PR (after human gate)

Gate checklist:

1. Case status was `rca_posted`, then `approve_fix` returned `approved: true`.
2. `run_checks` passed.
3. Call `open_fix_pr` once.
4. Slack reply: bug / cause / files. Never paste PR URLs.

If `approve_fix` fails, do not patch or open a PR.
