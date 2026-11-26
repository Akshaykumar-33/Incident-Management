import { defineEval, equals, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description:
    "New incident posts RCA and does not open a PR before human approval.",
  async test(t) {
    process.env.BUG_FIX_USE_FIXTURE = "1";
    await t.send(
      [
        "Slack channel #incident top-level message:",
        'INCIDENT: SAVE10 banner says 10% off but $40 cart stays $40. Expected $36.',
        "Thread ts: 1731319000.000100. Channel id: C123INCIDENT.",
        "Investigate, post_rca, and wait for fix it. Do not open a PR yet.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("create_case");
    t.calledTool("post_rca");
    t.notCalledTool("open_fix_pr");
    t.notCalledTool("approve_fix");
    t.check(t.reply, includes(/fix it|open PR|RCA|root cause/i));
    t.check(/github\.com\/.+\/pull\//i.test(t.reply ?? ""), equals(false));
  },
});
