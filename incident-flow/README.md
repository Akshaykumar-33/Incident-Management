# Incident flow

**One** Agent SDK (“Grokbot”) bot for Slack:

1. Triage + investigate  
2. Post **RCA**  
3. Wait for human **`fix it` / `open PR`**  
4. Draft fix PR on `BUG_FIX_REPO` (no PR link in Slack)

This replaces running separate RCA and bug-fix playgrounds for the same channel.

## Local loop

```bash
cd incident-flow
npm install
export BUG_FIX_USE_FIXTURE=1
npx @grok/agent-sdk login          # needed for playground chat
npx @grok/agent-sdk validate --dir .
npm run check
npm run smoke:offline
npx @grok/agent-sdk serve --dir . --mode single --dev
# Playground: http://127.0.0.1:3000/playground
```

Playground: pehle incident bhejo → RCA aaye → phir alag message: `fix it`.

## Config

```bash
# .env.local
INCIDENT_FLOW_SLACK_BOT_TOKEN=xoxb-...
INCIDENT_FLOW_SLACK_APP_TOKEN=xapp-...
BUG_FIX_REPO=owner/name          # live fixes
BUG_FIX_DEFAULT_BRANCH=main
BUG_FIX_CHECK_CMD=npm test
GITHUB_TOKEN=ghp_...
# BUG_FIX_USE_FIXTURE=1          # offline only
```

Replace `C0000000000` in `bot/channels/slack.ts` with your `#incident` id.

## Human gate (option B)

After `post_rca`, tools refuse `apply_patch` / `open_fix_pr` until
`approve_fix` sees a fix-trigger message (`fix it`, `open PR`, `fix karo`).
