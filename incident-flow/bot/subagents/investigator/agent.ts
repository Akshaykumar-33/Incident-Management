import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Search and read the configured app repo to find the root cause of a bug. Return findings only; do not edit or post to Slack.",
});
