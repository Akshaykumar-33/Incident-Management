import { defineEval, equals, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["fix", "gate"],
  description:
    "After RCA context, a fix it message approves fix and opens a draft PR without pasting the URL.",
  async test(t) {
    process.env.BUG_FIX_USE_FIXTURE = "1";
    await t.send(
      [
        "Continue case case-demo in Slack thread C123INCIDENT / 1731319000.000100.",
        "Case already exists conceptually: title SAVE10 pricing bug,",
        "rootCause applyDiscount compares SAVE100 not SAVE10, status will be set via tools.",
        "First create_case for SAVE10, post_rca with that root cause,",
        'then process human message: "fix it".',
        "approve_fix, ensure_repo, apply_patch SAVE100→SAVE10 in src/pricing.js,",
        "run_checks, open_fix_pr. Reply without any PR URL.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("post_rca");
    t.calledTool("approve_fix");
    t.calledTool("open_fix_pr");
    t.check(t.reply, includes(/SAVE10|pricing|discount/i));
    t.check(/github\.com\/.+\/pull\//i.test(t.reply ?? ""), equals(false));
  },
});
