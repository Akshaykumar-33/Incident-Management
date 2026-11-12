import {
  defaultSlackAuth,
  slackChannel,
} from "@grok/agent-sdk/channels/slack";

/**
 * Slack channel (Socket Mode).
 *
 * Tokens (in `.env.local`):
 *   INCIDENT_RCA_SLACK_BOT_TOKEN
 *   INCIDENT_RCA_SLACK_APP_TOKEN
 *
 * Setup: create the app from `.slack/manifest.dev.json` on api.slack.com
 * (see README). Then replace the placeholder channel id below.
 */
export default slackChannel({
  envPrefix: "INCIDENT_RCA",
  engagement: {
    channelPosts: {
      allow: ["C0CGUUP3L91", "#incident"],
      posts: "top-level",
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
      title: "Report outage",
      message:
        "INCIDENT: checkout-api returning 500s for India checkouts since 08:47 UTC. Customers cannot complete payment.",
    },
    {
      title: "Add evidence",
      message:
        "Evidence: error logs show tax_config missing rates for IN-* regions right after the 08:42 deploy.",
    },
    {
      title: "Confirm resolution",
      message:
        "Root cause confirmed: tax_config_v2 flag rolled to 100% without India rates. Rolled back flag. Please write the RCA.",
    },
  ],
});
