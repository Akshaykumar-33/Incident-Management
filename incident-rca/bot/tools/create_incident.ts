import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  addOpenIncidentId,
  bindThread,
  getIncidentIdForThread,
  newIncidentId,
  putIncident,
  type Incident,
} from "../lib/incident-store.js";

export default defineTool({
  description: prompt`
    Create a new open incident and bind it to a Slack thread when
    channelId and threadTs are provided. Call once per new incident.
  `,
  effect: "write",
  inputSchema: z.object({
    title: z.string().min(1).max(160),
    service: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    symptoms: z.string().optional(),
    channelId: z.string().optional(),
    threadTs: z.string().optional(),
    evidence: z.array(z.string()).optional(),
  }),
  async execute(input, ctx) {
    if (input.channelId && input.threadTs) {
      const existingId = await getIncidentIdForThread(
        ctx.host.kv,
        input.channelId,
        input.threadTs,
      );
      if (existingId) {
        return {
          created: false,
          reason: "thread_already_bound",
          incidentId: existingId,
        };
      }
    }

    const now = new Date().toISOString();
    const incident: Incident = {
      id: newIncidentId(),
      status: "open",
      channelId: input.channelId,
      threadTs: input.threadTs,
      title: input.title,
      service: input.service,
      severity: input.severity,
      symptoms: input.symptoms,
      hypotheses: [],
      evidence: input.evidence ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await putIncident(ctx.host.kv, incident);
    await addOpenIncidentId(ctx.host.kv, incident.id);
    if (input.channelId && input.threadTs) {
      await bindThread(ctx.host.kv, input.channelId, input.threadTs, incident.id);
    }

    return { created: true, incident };
  },
});
