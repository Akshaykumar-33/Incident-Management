import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Classify a Slack message as new_incident, existing_incident, or not_incident and extract title, service, severity, and symptoms.",
});
