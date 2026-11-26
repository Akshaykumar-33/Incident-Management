import {
  defaultSlackAuth,
  slackChannel,
} from "@grok/agent-sdk/channels/slack";

/**
 * Tokens in `.env.local`:
 *   INCIDENT_FLOW_SLACK_BOT_TOKEN
 *   INCIDENT_FLOW_SLACK_APP_TOKEN
 *
 * Replace C0000000000 with your #incident channel id.
 */
export default slackChannel({
  envPrefix: "INCIDENT_FLOW",
  engagement: {
    channelPosts: {
      allow: ["C0000000000", "#incident"],
      posts: "all",
      replies: "allowlisted",
    },
  },
  onChannelPost: async (ctx, message) => {
    const text = message.markdown?.trim() ?? "";
    if (text.length <= 8) {
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
      title: "Report incident",
      message:
        "INCIDENT: Discount code SAVE10 shows '10% off applied' but a $40 cart stays $40. Expected $36. Started after today's pricing deploy.",
    },
    {
      title: "Confirm root cause",
      message:
        "Root cause confirmed: applyDiscount compares against SAVE100 instead of SAVE10. Please write the RCA.",
    },
    {
      title: "Approve fix",
      message: "fix it",
    },
  ],
});
