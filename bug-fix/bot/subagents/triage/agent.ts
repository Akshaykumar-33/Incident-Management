import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Classify a Slack message as new_bug, existing_bug, not_a_bug, or blocked and extract title/summary.",
});
