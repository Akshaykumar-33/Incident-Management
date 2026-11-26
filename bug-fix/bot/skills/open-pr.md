# Open a draft PR

Gate:

1. `run_checks` must pass (`passed: true`).
2. Case has a clear root cause and `filesChanged`.
3. Call `open_fix_pr` once with a short title/body.
4. Slack reply: bug / cause / files changed. Never paste `prUrl`,
   `github.com/.../pull`, or "PR #N".

If checks fail or the repo is not configured, set `status: blocked`
and explain — do not open a PR.
