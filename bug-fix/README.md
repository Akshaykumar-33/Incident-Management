# Bug fix

Cursor Agent SDK (“Grokbot”) agent that watches a Slack bug channel,
investigates a **configurable external app repo** (`BUG_FIX_REPO`),
applies a minimal fix, opens a **draft** PR, and replies in the thread
(without pasting the PR link).

Sibling to `incident-rca/` — RCA and code-fix stay separate.

## What it does

- Wakes on Slack channel posts (and mentions/DMs)
- Triages: new bug / existing / ignore / blocked
- Clones `BUG_FIX_REPO` (or uses `fixtures/app-repo` when
  `BUG_FIX_USE_FIXTURE=1`)
- Searches/edits code, runs `BUG_FIX_CHECK_CMD`, opens a draft PR
- Stores incident state in durable `host.kv`
- Slack replies stay brief and never include the PR URL

## Prerequisites

- Node 22.13+
- Cursor credential for model turns: `npx @grok/agent-sdk login` or `CURSOR_API_KEY`
- For live PRs: `BUG_FIX_REPO=owner/name` + `GITHUB_TOKEN`

## Local loop

```bash
cd bug-fix
export BUG_FIX_USE_FIXTURE=1
npx @grok/agent-sdk validate --dir .
npm run check
npx @grok/agent-sdk tool call ensure_repo --dir . --input '{}'
npx @grok/agent-sdk run --dir . --message "$(cat fixtures/slack/new-bug.md)"
npx @grok/agent-sdk eval --dir . --tag smoke
npx @grok/agent-sdk serve --dir . --mode single --dev
# Playground: http://127.0.0.1:3000/playground
```

## Configure the target repo

```bash
# .env.local
BUG_FIX_REPO=your-org/your-app
BUG_FIX_DEFAULT_BRANCH=main
BUG_FIX_CHECK_CMD=npm test
GITHUB_TOKEN=ghp_...
```

Unset `BUG_FIX_USE_FIXTURE` for live mode. The agent fails closed if
`BUG_FIX_REPO` is missing.

## Slack setup (manual)

1. Create an app from [`.slack/manifest.dev.json`](.slack/manifest.dev.json)
2. Install → copy bot token (`xoxb-…`) and app-level token with
   `connections:write` (`xapp-…`)
3. Put tokens in `.env.local` (see [`env.example`](env.example))
4. Invite the bot to `#bugs` and replace `C0000000000` in
   [`bot/channels/slack.ts`](bot/channels/slack.ts)
5. `npx @grok/agent-sdk slack doctor --prefix BUG_FIX`
6. `npx @grok/agent-sdk serve --dir . --mode single --dev`

Never commit `.env.local` or paste tokens into chat.

## Deploy

Only when you ask to deploy:

```bash
npx @grok/agent-sdk deploy --dir . --slug bug-fix
```

Set deployment secrets: Slack tokens, `BUG_FIX_REPO`, `GITHUB_TOKEN`,
`BUG_FIX_CHECK_CMD`.
