# incident-flow

Unified Agent SDK project: RCA, then human `fix it`, then draft PR.

```bash
export BUG_FIX_USE_FIXTURE=1
npx @grok/agent-sdk validate --dir .
npm run check
npm run smoke:offline
npx @grok/agent-sdk serve --dir . --mode single --dev
```

Serve only this directory (not the parent repo, not `bug-fix/` for the same channel).
