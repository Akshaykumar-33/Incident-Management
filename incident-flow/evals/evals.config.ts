import { defineEvalConfig } from "@grok/agent-sdk/evals";

process.env.BUG_FIX_USE_FIXTURE = process.env.BUG_FIX_USE_FIXTURE || "1";
process.env.BUG_FIX_CHECK_CMD =
  process.env.BUG_FIX_CHECK_CMD || "node --test";

export default defineEvalConfig({
  maxConcurrency: 1,
});
