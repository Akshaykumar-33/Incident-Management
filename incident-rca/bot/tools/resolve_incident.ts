import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getIncident,
  putIncident,
  removeOpenIncidentId,
} from "../lib/incident-store.js";

export default defineTool({
  description: prompt`
    Mark an incident resolved with the confirmed root cause. Safe to
    call again with the same resolution.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    incidentId: z.string(),
    resolution: z.string().min(1),
    evidence: z.array(z.string()).optional(),
  }),
  async execute(input, ctx) {
    const incident = await getIncident(ctx.host.kv, input.incidentId);
    if (!incident) {
      return { resolved: false, reason: "not_found", incidentId: input.incidentId };
    }

    if (input.evidence) {
      for (const item of input.evidence) {
        if (!incident.evidence.includes(item)) {
          incident.evidence.push(item);
        }
      }
    }

    incident.status = "resolved";
    incident.resolution = input.resolution;
    incident.updatedAt = new Date().toISOString();
    await putIncident(ctx.host.kv, incident);
    await removeOpenIncidentId(ctx.host.kv, incident.id);
    return { resolved: true, incident };
  },
});
