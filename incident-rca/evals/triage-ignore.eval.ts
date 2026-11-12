import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["triage", "ignore"],
  description: "Casual chatter does not create an incident.",
  async test(t) {
    await t.send(
      [
        "New Slack message in #incidents:",
        "Anyone want lunch?",
        "Classify this message. If it is not an incident, do not create one and do not investigate.",
      ].join("\n"),
    );
    t.succeeded();
    t.notCalledTool("create_incident");
    t.notCalledTool("resolve_incident");
    t.notCalledTool("load_fixture_evidence");
  },
});
