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

## Slack setup (human gate)

Slack app creation needs your Cursor login and Slack workspace approval. The
channel file is already scaffolded at `bot/channels/slack.ts`.

1. `npx @grok/agent-sdk login`
2. `npx @grok/agent-sdk slack create --dir . --name "Incident RCA" --channel-posts --prefix INCIDENT_RCA`
3. Invite the bot to `#incidents` (or a sandbox channel)
4. Replace `C0000000000` in `bot/channels/slack.ts` with the real channel id
5. `npx @grok/agent-sdk slack doctor --prefix INCIDENT_RCA`
6. `npx @grok/agent-sdk serve --dir . --dev` and post a test incident message

Tokens land in `.env.local` as `INCIDENT_RCA_SLACK_BOT_TOKEN` and
`INCIDENT_RCA_SLACK_APP_TOKEN`. Never commit them.

## Deploy

Only when you ask to deploy:

```bash
npx @grok/agent-sdk deploy --dir . --slug incident-rca
```

## Later: real evidence (MCP)

v1 uses fixture tools only. To attach GitHub/Datadog later, add
`bot/mcp-connections/<name>.ts` with `advertiseTools: true` and keep the same
orchestrator tools/state machine.
