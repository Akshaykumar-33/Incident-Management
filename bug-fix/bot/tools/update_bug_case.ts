import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getBugCase, putBugCase, removeOpenBugId } from "../lib/bug-store.js";

export default defineTool({
  description: prompt`
    Update a bug case: status, summary, rootCause, findings, filesChanged,
    or blockedReason. Idempotent finding/file appends skip duplicates.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    status: z
      .enum(["open", "investigating", "fixed", "blocked", "ignored"])
      .optional(),
    title: z.string().min(1).max(160).optional(),
    summary: z.string().optional(),
    rootCause: z.string().optional(),
    blockedReason: z.string().optional(),
    findings: z.array(z.string()).optional(),
    filesChanged: z.array(z.string()).optional(),
    branch: z.string().optional(),
  }),
  async execute(input, ctx) {
    const bug = await getBugCase(ctx.host.kv, input.caseId);
    if (!bug) {
      return { updated: false, reason: "not_found", caseId: input.caseId };
    }

    if (input.title) bug.title = input.title;
    if (input.summary) bug.summary = input.summary;
    if (input.rootCause) bug.rootCause = input.rootCause;
    if (input.blockedReason) bug.blockedReason = input.blockedReason;
    if (input.branch) bug.branch = input.branch;
    if (input.status) bug.status = input.status;

    if (input.findings) {
      for (const item of input.findings) {
        if (!bug.findings.includes(item)) bug.findings.push(item);
      }
    }
    if (input.filesChanged) {
      for (const item of input.filesChanged) {
        if (!bug.filesChanged.includes(item)) bug.filesChanged.push(item);
      }
    }

    bug.updatedAt = new Date().toISOString();
    await putBugCase(ctx.host.kv, bug);

    if (
      bug.status === "fixed" ||
      bug.status === "ignored" ||
      bug.status === "blocked"
    ) {
      await removeOpenBugId(ctx.host.kv, bug.id);
    }

    const { prUrl: _prUrl, ...safe } = bug;
    return {
      updated: true,
      bug: { ...safe, hasPr: Boolean(bug.prUrl), prNumber: bug.prNumber },
    };
  },
});
