import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description:
    "A clear outage report creates an incident and loads fixture evidence.",
  async test(t) {
    await t.send(
      [
        "Slack channel #incidents top-level message:",
        'INCIDENT: checkout-api returning 500s for India checkouts since 08:47 UTC.',
        "Customers cannot complete payment. Error rate ~12%.",
        "Thread ts: 1731318000.000100. Channel id: C123INCIDENTS.",
        "Triage, create the incident if new, investigate with fixture evidence, and reply with hypotheses.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("create_incident");
    t.calledTool("load_fixture_evidence");
    t.check(t.reply, includes(/hypothes|tax_config|checkout/i));
  },
});
