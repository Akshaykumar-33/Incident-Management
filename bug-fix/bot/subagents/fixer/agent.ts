import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Apply a minimal code fix in the ensured app repo and run checks. Do not open PRs or post to Slack.",
});
