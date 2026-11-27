import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Draft the final RCA markdown after root cause is clear. Does not open PRs or post to Slack.",
});
