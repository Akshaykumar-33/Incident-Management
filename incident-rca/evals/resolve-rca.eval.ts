import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["resolve", "rca"],
  description:
    "Human-confirmed root cause resolves the incident and produces an RCA.",
  async test(t) {
    await t.send(
      [
        "Continue the checkout-api India 500s incident.",
        "First create the incident for checkout-api India checkout 500s if needed,",
        "add evidence that tax_config_v2 lacked India rates, then process this human message:",
        '"Root cause confirmed: tax_config_v2 rolled to 100% without India region rates.',
        'We rolled the flag back to 5% and errors cleared. Please generate the final RCA."',
        "Resolve the incident and post an RCA with Summary, Root cause, Impact, Resolution, Follow-ups.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("create_incident");
    t.calledTool("resolve_incident");
    t.check(t.reply, includes(/root cause/i));
    t.check(t.reply, includes(/tax_config/i));
  },
});
