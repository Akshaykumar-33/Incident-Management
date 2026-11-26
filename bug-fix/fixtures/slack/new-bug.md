Slack channel #bugs top-level message:
BUG: Discount code SAVE10 is accepted but the cart total never drops.
Steps: add a $40 item, apply SAVE10, banner says "10% off applied" but
total stays $40. Expected $36.
Thread ts: 1731319000.000100. Channel id: C123BUGS.

Triage as a new bug, ensure the fixture repo, find the root cause in
pricing, apply a minimal fix, run checks, open a draft PR, and reply
with bug/cause/files changed. Do not include any pull request URL in
the reply.
