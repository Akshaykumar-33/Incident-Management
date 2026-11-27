import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getBugCase, listOpenBugIds } from "../lib/bug-store.js";

export default defineTool({
  description: prompt`
    List open bug cases with short summaries for triage association.
  `,
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const ids = await listOpenBugIds(ctx.host.kv);
    const bugs = [];
    for (const id of ids) {
      const bug = await getBugCase(ctx.host.kv, id);
      if (
        bug &&
        (bug.status === "open" || bug.status === "investigating")
      ) {
        bugs.push({
          id: bug.id,
          title: bug.title,
          status: bug.status,
          summary: bug.summary,
          channelId: bug.channelId,
          threadTs: bug.threadTs,
          findingsCount: bug.findings.length,
          hasPr: Boolean(bug.prUrl),
          updatedAt: bug.updatedAt,
        });
      }
    }
    return { count: bugs.length, bugs };
  },
});
