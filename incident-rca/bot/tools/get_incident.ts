import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getIncident,
  getIncidentIdForThread,
} from "../lib/incident-store.js";

export default defineTool({
  description: prompt`
    Load one incident by id, or by Slack channelId + threadTs binding.
  `,
  effect: "read",
  inputSchema: z
    .object({
      incidentId: z.string().optional(),
      channelId: z.string().optional(),
      threadTs: z.string().optional(),
    })
    .refine(
      (value) =>
        Boolean(value.incidentId) ||
        (Boolean(value.channelId) && Boolean(value.threadTs)),
      { message: "Provide incidentId, or both channelId and threadTs." },
    ),
  async execute(input, ctx) {
    let id = input.incidentId;
    if (!id && input.channelId && input.threadTs) {
      id = await getIncidentIdForThread(
        ctx.host.kv,
        input.channelId,
        input.threadTs,
      );
    }
    if (!id) {
      return { found: false };
    }
    const incident = await getIncident(ctx.host.kv, id);
    if (!incident) {
      return { found: false, incidentId: id };
    }
    return { found: true, incident };
  },
});
