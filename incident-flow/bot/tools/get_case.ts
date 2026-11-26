import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getCase,
  getCaseIdForThread,
  publicCase,
} from "../lib/case-store.js";
import { fixTriggerHelp } from "../lib/fix-trigger.js";

export default defineTool({
  description: prompt`
    Load one case by id, or by Slack channelId + threadTs. PR URLs are
    omitted. When status is rca_posted, includes how to approve a fix.
  `,
  effect: "read",
  inputSchema: z
    .object({
      caseId: z.string().optional(),
      channelId: z.string().optional(),
      threadTs: z.string().optional(),
    })
    .refine(
      (value) =>
        Boolean(value.caseId) ||
        (Boolean(value.channelId) && Boolean(value.threadTs)),
      { message: "Provide caseId, or both channelId and threadTs." },
    ),
  async execute(input, ctx) {
    let id = input.caseId;
    if (!id && input.channelId && input.threadTs) {
      id = await getCaseIdForThread(
        ctx.host.kv,
        input.channelId,
        input.threadTs,
      );
    }
    if (!id) return { found: false };
    const incident = await getCase(ctx.host.kv, id);
    if (!incident) return { found: false, caseId: id };
    return {
      found: true,
      case: publicCase(incident),
      nextStep:
        incident.status === "rca_posted" && !incident.fixApprovedAt
          ? fixTriggerHelp()
          : undefined,
    };
  },
});
