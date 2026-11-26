import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getBugCase, getBugIdForThread } from "../lib/bug-store.js";

export default defineTool({
  description: prompt`
    Load one bug case by id, or by Slack channelId + threadTs binding.
    PR URLs are omitted from the response so they are not pasted into Slack.
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
      id = await getBugIdForThread(
        ctx.host.kv,
        input.channelId,
        input.threadTs,
      );
    }
    if (!id) {
      return { found: false };
    }
    const bug = await getBugCase(ctx.host.kv, id);
    if (!bug) {
      return { found: false, caseId: id };
    }
    const { prUrl: _prUrl, ...safe } = bug;
    return {
      found: true,
      bug: {
        ...safe,
        hasPr: Boolean(bug.prUrl),
        prNumber: bug.prNumber,
      },
    };
  },
});
