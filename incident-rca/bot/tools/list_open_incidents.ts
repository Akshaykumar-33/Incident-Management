import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getIncident,
  listOpenIncidentIds,
} from "../lib/incident-store.js";

export default defineTool({
  description: prompt`
    List open incidents with short summaries for triage association.
  `,
  effect: "read",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const ids = await listOpenIncidentIds(ctx.host.kv);
    const incidents = [];
    for (const id of ids) {
      const incident = await getIncident(ctx.host.kv, id);
      if (incident && incident.status === "open") {
        incidents.push({
          id: incident.id,
          title: incident.title,
          service: incident.service,
          severity: incident.severity,
          symptoms: incident.symptoms,
          channelId: incident.channelId,
          threadTs: incident.threadTs,
          evidenceCount: incident.evidence.length,
          hypothesisCount: incident.hypotheses.length,
          updatedAt: incident.updatedAt,
        });
      }
    }
    return { count: incidents.length, incidents };
  },
});
