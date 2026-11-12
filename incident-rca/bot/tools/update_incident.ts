import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getIncident, putIncident } from "../lib/incident-store.js";

export default defineTool({
  description: prompt`
    Append evidence or hypotheses, or refresh title/service/severity/
    symptoms on an open incident. Idempotent appends skip duplicates.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    incidentId: z.string(),
    title: z.string().min(1).max(160).optional(),
    service: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    symptoms: z.string().optional(),
    evidence: z.array(z.string()).optional(),
    hypotheses: z.array(z.string()).optional(),
  }),
  async execute(input, ctx) {
    const incident = await getIncident(ctx.host.kv, input.incidentId);
    if (!incident) {
      return { updated: false, reason: "not_found", incidentId: input.incidentId };
    }
    if (incident.status !== "open") {
      return {
        updated: false,
        reason: "not_open",
        incidentId: input.incidentId,
        status: incident.status,
      };
    }

    if (input.title) incident.title = input.title;
    if (input.service) incident.service = input.service;
    if (input.severity) incident.severity = input.severity;
    if (input.symptoms) incident.symptoms = input.symptoms;

    if (input.evidence) {
      for (const item of input.evidence) {
        if (!incident.evidence.includes(item)) {
          incident.evidence.push(item);
        }
      }
    }
    if (input.hypotheses) {
      for (const item of input.hypotheses) {
        if (!incident.hypotheses.includes(item)) {
          incident.hypotheses.push(item);
        }
      }
    }

    incident.updatedAt = new Date().toISOString();
    await putIncident(ctx.host.kv, incident);
    return { updated: true, incident };
  },
});
