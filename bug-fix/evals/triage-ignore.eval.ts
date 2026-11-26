import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["triage"],
  description: "Chatter does not create a bug case or open a PR.",
  async test(t) {
    process.env.BUG_FIX_USE_FIXTURE = "1";
    await t.send(
      [
        "Slack channel #bugs top-level message:",
        "hi thanks!",
        "Thread ts: 1731319000.000200. Channel id: C123BUGS.",
        "Classify only. Do not create a case or open a PR.",
      ].join("\n"),
    );
    t.succeeded();
    t.notCalledTool("create_bug_case");
    t.notCalledTool("open_fix_pr");
    t.notCalledTool("apply_patch");
  },
});
