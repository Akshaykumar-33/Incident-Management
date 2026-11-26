import { defineEval, equals, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description:
    "A clear SAVE10 pricing bug creates a case, patches code, opens a PR, and replies without a PR URL.",
  async test(t) {
    process.env.BUG_FIX_USE_FIXTURE = "1";
    await t.send(
      [
        "Slack channel #bugs top-level message:",
        "BUG: Discount code SAVE10 is accepted but the cart total never drops.",
        'Banner says "10% off applied" but a $40 cart stays $40. Expected $36.',
        "Thread ts: 1731319000.000100. Channel id: C123BUGS.",
        "Triage, create the case, ensure the fixture repo, fix pricing, run checks,",
        "open a draft PR, and reply with bug/cause/files. Do not include any PR URL.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("create_bug_case");
    t.calledTool("ensure_repo");
    t.calledTool("apply_patch");
    t.calledTool("run_checks");
    t.calledTool("open_fix_pr");
    t.check(t.reply, includes(/SAVE10|discount|pricing/i));
    t.check(/github\.com\/.+\/pull\//i.test(t.reply ?? ""), equals(false));
  },
});
