# bug-fix

Agent SDK project (`@grok/agent-sdk`). This file is for coding agents
editing the project. The served agent's prompt is `bot/instructions.md`.

## Loop

```bash
export BUG_FIX_USE_FIXTURE=1
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk info --dir . --json
npx @grok/agent-sdk run --dir . --message "..."
npx @grok/agent-sdk eval --dir .
npm run check
```

Run the CLI under Node, never Bun.

## Layout

- `bot/instructions.md` is the always-on prompt.
- `bot/tools/<name>.ts` is one tool per file.
- `bot/lib/` is shared code (repo config, workspace, bug store).
- `fixtures/app-repo/` is the offline target when `BUG_FIX_USE_FIXTURE=1`.
- Live target is `BUG_FIX_REPO=owner/name` plus `GITHUB_TOKEN`.
- `evals/` is filesystem evals. Not `bot/evals/`.

## Do not

- Paste PR URLs into Slack replies (tool + instructions enforce this).
- Point `serve` at the parent monorepo folder.
- Add npm deps on a first cut beyond what the SDK ships.
