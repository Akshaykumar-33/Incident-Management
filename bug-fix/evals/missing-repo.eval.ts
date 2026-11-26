import { defineEval, equals, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["fail-closed"],
  description:
    "When the repo is not configured, the agent fails closed without opening a PR.",
  async test(t) {
    delete process.env.BUG_FIX_USE_FIXTURE;
    delete process.env.BUG_FIX_REPO;
    await t.send(
      [
        "Slack channel #bugs top-level message:",
        "BUG: Login button does nothing on mobile Safari.",
        "Thread ts: 1731319000.000300. Channel id: C123BUGS.",
        "BUG_FIX_REPO is unset. Call ensure_repo, then explain you cannot open a PR.",
        "Do not invent a code fix. Do not paste a PR link.",
      ].join("\n"),
    );
    t.succeeded();
    t.calledTool("ensure_repo");
    t.notCalledTool("open_fix_pr");
    t.check(t.reply, includes(/BUG_FIX_REPO|not configured|cannot|unable/i));
    t.check(/github\.com\/.+\/pull\//i.test(t.reply ?? ""), equals(false));
  },
});
