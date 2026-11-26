import { defineEvalConfig } from "@grok/agent-sdk/evals";

// Offline evals use the committed fixtures/app-repo mirror.
process.env.BUG_FIX_USE_FIXTURE = process.env.BUG_FIX_USE_FIXTURE || "1";
process.env.BUG_FIX_CHECK_CMD =
  process.env.BUG_FIX_CHECK_CMD || "node --test";

export default defineEvalConfig({
  // Cases mutate BUG_FIX_* env; keep serial to avoid cross-talk.
  maxConcurrency: 1,
});
