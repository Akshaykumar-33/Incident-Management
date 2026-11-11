import {
  defaultSlackAuth,
  slackChannel,
} from "@grok/agent-sdk/channels/slack";

/**
 * Slack Socket Mode channel for the incident orchestrator.
 *
 * Human setup (once):
 * 1. `npx @grok/agent-sdk login`
 * 2. `npx @grok/agent-sdk slack create --dir . --name "Incident RCA" --channel-posts --prefix INCIDENT_RCA`
 * 3. Invite the bot to your incidents channel
 * 4. Replace the placeholder channel id below with the real `C…` id
 *    (Slack → channel details → copy channel ID), then re-serve/deploy
 */
export default slackChannel({
  envPrefix: "INCIDENT_RCA",
  engagement: {
    channelPosts: {
      // Placeholder until slack create + channel invite. Mentions still work
      // in any channel the bot has joined.
      allow: ["C0000000000", "#incidents"],
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
