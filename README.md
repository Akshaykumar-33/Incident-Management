# Incident-Management

## Run this (one bot, one UI)

```bash
cd incident-flow
npm install
export BUG_FIX_USE_FIXTURE=1
npx @grok/agent-sdk login
npx @grok/agent-sdk serve --dir . --mode single --dev
# http://127.0.0.1:3000/playground
```

Flow: report → RCA → you type **`fix it`** → draft PR (link not pasted in Slack).

| Folder | Role |
| --- | --- |
| [`incident-flow/`](incident-flow/) | **Use this** — unified RCA + human-gated fix |
| [`bug-fix/`](bug-fix/) | Older standalone fix agent (superseded) |

Details: [`incident-flow/README.md`](incident-flow/README.md).
