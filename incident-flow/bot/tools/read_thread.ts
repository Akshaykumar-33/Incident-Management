import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { isFixTrigger } from "../lib/fix-trigger.js";

type SlackMessage = {
  ts?: string;
  thread_ts?: string;
  user?: string;
  text?: string;
  bot_id?: string;
  files?: Array<{
    id?: string;
    name?: string;
    mimetype?: string;
    filetype?: string;
    url_private?: string;
  }>;
};

export default defineTool({
  description: prompt`
    Read the full Slack thread (parent + replies) including file/image
    metadata. Flags whether the latest human message is a fix trigger.
    If the parent is gone, report gone=true and do not post to Slack.
  `,
  effect: "read",
  inputSchema: z.object({
    channelId: z.string().min(1),
    threadTs: z.string().min(1),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  async execute(input, ctx) {
    let client;
    try {
      client = await ctx.host.slack.getClient();
    } catch (err) {
      return {
        ok: false,
        reason: "slack_unavailable",
        error: String(err),
        hint: "Use the message text from the turn instead.",
      };
    }

    try {
      const result = (await client.conversations.replies({
        channel: input.channelId,
        ts: input.threadTs,
        limit: input.limit ?? 100,
        inclusive: true,
      })) as {
        ok?: boolean;
        error?: string;
        messages?: SlackMessage[];
      };

      if (!result.ok || !result.messages || result.messages.length === 0) {
        return {
          ok: false,
          gone: true,
          reason: "thread_missing",
          error: result.error ?? "no_messages",
          note: "Do not post to Slack when the parent thread is gone.",
        };
      }

      const messages = result.messages.map((msg) => ({
        ts: msg.ts,
        threadTs: msg.thread_ts ?? msg.ts,
        user: msg.user,
        botId: msg.bot_id,
        text: msg.text ?? "",
        isFixTrigger: isFixTrigger(msg.text ?? ""),
        files: (msg.files ?? []).map((file) => ({
          id: file.id,
          name: file.name,
          mimetype: file.mimetype,
          filetype: file.filetype,
          hasPrivateUrl: Boolean(file.url_private),
        })),
      }));

      const latestHuman = [...messages]
        .reverse()
        .find((m) => !m.botId && m.text.trim().length > 0);

      return {
        ok: true,
        gone: false,
        channelId: input.channelId,
        threadTs: input.threadTs,
        messageCount: messages.length,
        parent: messages[0],
        latestHuman,
        latestIsFixTrigger: Boolean(latestHuman?.isFixTrigger),
        messages,
      };
    } catch (err) {
      return {
        ok: false,
        gone: true,
        reason: "slack_error",
        error: String(err),
        note: "Do not post to Slack when the thread cannot be read.",
      };
    }
  },
});
