import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getCase, listOpenCaseIds } from "../lib/case-store.js";

const ACTIVE = new Set([
  "open",
  "investigating",
  "rca_posted",
  "fixing",
]);

export default defineTool({
  description: prompt`
    List active cases (open through fixing) with short summaries for triage.
  `,
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const ids = await listOpenCaseIds(ctx.host.kv);
    const cases = [];
    for (const id of ids) {
      const c = await getCase(ctx.host.kv, id);
      if (c && ACTIVE.has(c.status)) {
        cases.push({
          id: c.id,
          title: c.title,
          status: c.status,
          service: c.service,
          severity: c.severity,
          summary: c.summary,
          channelId: c.channelId,
          threadTs: c.threadTs,
          fixApproved: Boolean(c.fixApprovedAt),
          hasPr: Boolean(c.prUrl),
          updatedAt: c.updatedAt,
        });
      }
    }
    return { count: cases.length, cases };
  },
});
