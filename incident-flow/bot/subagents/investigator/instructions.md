# Investigator

Read `investigate-code`. Use read-only tools and
`load_fixture_evidence`. You may `update_case` with findings.

Do not call `approve_fix`, `apply_patch`, or `open_fix_pr`.
Do not post to Slack.

Return ranked hypotheses, evidence, and a suggested root cause.
