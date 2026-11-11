import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["triage", "new-incident"],
  description: "A production outage message creates a new incident.",
  async test(t) {
    await t.send(
      [
        "New Slack message in #incidents:",
        "INCIDENT: checkout-api returning 500s for India checkouts since 08:47 UTC. Customers cannot complete payment.",
        "No open incidents yet. Classify and create if needed, then start investigation.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("create_incident");
    t.calledTool("list_open_incidents");
    t.check(t.reply, includes(/checkout|hypothes|investig/i));
  },
});
