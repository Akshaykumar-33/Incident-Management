# Incident RCA

Cursor Agent SDK (“Grokbot”) agent that watches a Slack incident channel,
triages messages, investigates with synthetic fixture evidence, and posts a
final RCA.

## What it does

- Wakes on Slack channel posts (and mentions/DMs)
- Triages: new incident / existing / ignore
- Stores incident state in durable `host.kv`
- Investigates using sandbox fixtures under `bot/sandbox/workspace/fixtures/`
- Writes a short RCA after a human confirms root cause

## Layout

See `AGENTS.md` and `bot/`. Subagents: `triage`, `investigator`, `documentation`.

## Prerequisites

- Node 22.13+
- Cursor credential for model turns: `npx @grok/agent-sdk login` or `CURSOR_API_KEY`

## Local loop

```bash
cd incident-rca
npx @grok/agent-sdk validate --dir .
npm run check
npx @grok/agent-sdk tool call create_incident --dir . --input '{"title":"checkout 500s","service":"checkout-api","severity":"high"}'
npx @grok/agent-sdk run --dir . --message "$(cat fixtures/slack/new-incident.md)"
npx @grok/agent-sdk eval --dir . --tag smoke
npx @grok/agent-sdk serve --dir . --mode single --dev
# Playground: http://127.0.0.1:3000/playground
```

## Slack setup (manual — no Cursor team required)

`slack create` needs a Cursor team. If `cursor.com/dashboard` redirects to
`grok.com`, skip that wizard and use api.slack.com instead.

1. Open https://api.slack.com/apps → **Create New App** → **From a manifest**
2. Paste [`.slack/manifest.dev.json`](.slack/manifest.dev.json) → Create
3. **OAuth & Permissions** → Install to Workspace → copy **Bot User OAuth Token** (`xoxb-…`)
4. **Basic Information** → App-Level Tokens → Create Token with scope `connections:write` (`xapp-…`)
5. Create `incident-rca/.env.local` (see [`env.example`](env.example)):

```bash
INCIDENT_RCA_SLACK_BOT_TOKEN=xoxb-...
INCIDENT_RCA_SLACK_APP_TOKEN=xapp-...
```

6. Invite the bot to your incidents channel
7. Send the channel ID (`C…`) so we can replace `C0000000000` in `bot/channels/slack.ts`
8. Check + run:

```bash
npx @grok/agent-sdk slack doctor --prefix INCIDENT_RCA
npx @grok/agent-sdk serve --dir . --mode single --dev --host 0.0.0.0 --port 3456
```

Never commit `.env.local` or paste tokens into chat.

## Deploy

Only when you ask to deploy:

```bash
npx @grok/agent-sdk deploy --dir . --slug incident-rca
```

## Later: real evidence (MCP)

v1 uses fixture tools only. To attach GitHub/Datadog later, add
`bot/mcp-connections/<name>.ts` with `advertiseTools: true` and keep the same
orchestrator tools/state machine.
