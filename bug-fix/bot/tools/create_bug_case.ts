import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  addOpenBugId,
  bindThread,
  getBugIdForThread,
  newBugId,
  putBugCase,
  type BugCase,
} from "../lib/bug-store.js";

export default defineTool({
  description: prompt`
    Create a new open bug case and bind it to a Slack thread when
    channelId and threadTs are provided. Call once per new bug report.
  `,
  effect: "write",
  inputSchema: z.object({
    title: z.string().min(1).max(160),
    summary: z.string().optional(),
    channelId: z.string().optional(),
    threadTs: z.string().optional(),
    findings: z.array(z.string()).optional(),
  }),
  async execute(input, ctx) {
    if (input.channelId && input.threadTs) {
      const existingId = await getBugIdForThread(
        ctx.host.kv,
        input.channelId,
        input.threadTs,
      );
      if (existingId) {
        return {
          created: false,
          reason: "thread_already_bound",
          caseId: existingId,
        };
      }
    }

    const now = new Date().toISOString();
    const bug: BugCase = {
      id: newBugId(),
      status: "open",
      channelId: input.channelId,
      threadTs: input.threadTs,
      title: input.title,
      summary: input.summary,
      filesChanged: [],
      findings: input.findings ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await putBugCase(ctx.host.kv, bug);
    await addOpenBugId(ctx.host.kv, bug.id);
    if (input.channelId && input.threadTs) {
      await bindThread(ctx.host.kv, input.channelId, input.threadTs, bug.id);
    }

    return { created: true, bug };
  },
});
