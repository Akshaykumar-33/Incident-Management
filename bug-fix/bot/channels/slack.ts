import {
  defaultSlackAuth,
  slackChannel,
} from "@grok/agent-sdk/channels/slack";

/**
 * Slack channel (Socket Mode).
 *
 * Tokens (in `.env.local`):
 *   BUG_FIX_SLACK_BOT_TOKEN
 *   BUG_FIX_SLACK_APP_TOKEN
 *
 * Replace the placeholder channel id with your #bugs channel id.
 */
export default slackChannel({
  envPrefix: "BUG_FIX",
  engagement: {
    channelPosts: {
      // TODO: replace C0000000000 with the real #bugs channel id.
      allow: ["C0000000000", "#bugs"],
      posts: "all",
      replies: "allowlisted",
    },
  },
  onChannelPost: async (ctx, message) => {
    const text = message.markdown?.trim() ?? "";
    if (text.length <= 20) {
      return null;
    }
    if (/^(hi|hello|hey|thanks|thx|lol|ok|okay)\b/i.test(text)) {
      return null;
    }
    const auth = defaultSlackAuth(message, ctx);
    if (auth === null) {
      return null;
    }
    return { auth };
  },
  suggestedPrompts: [
    {
      title: "Report bug",
      message:
        "BUG: Discount code SAVE10 is accepted but the cart total never drops. Steps: add item, apply SAVE10, total stays full price.",
    },
    {
      title: "Add screenshot context",
      message:
        "Screenshot shows the banner '10% off applied' but the line total is still $40. Expected $36.",
    },
    {
      title: "Not a bug",
      message: "Thanks! Just checking if anyone is around.",
    },
  ],
});
