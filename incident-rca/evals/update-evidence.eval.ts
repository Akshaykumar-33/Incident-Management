import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["update", "existing-incident"],
  description:
    "Thread evidence on an open incident updates state and re-evaluates.",
  async test(t) {
    await t.send(
      [
        "Slack thread follow-up on an open checkout-api incident.",
        "First ensure an open incident exists for checkout-api India 500s",
        "(create if needed with channel C123INCIDENTS thread 1731318000.000100).",
        "Then process this new thread message:",
        '"Update: logs show tax_config missing rates for IN-* right after the 08:42 deploy."',
        "Update the incident with this evidence and re-investigate.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("update_incident");
    t.check(t.reply, includes(/tax_config|hypothes|deploy/i));
  },
});
