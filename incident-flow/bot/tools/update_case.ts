import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getCase,
  publicCase,
  putCase,
  removeOpenCaseId,
} from "../lib/case-store.js";

export default defineTool({
  description: prompt`
    Update a case: status, summary, rootCause, hypotheses, evidence,
    findings, filesChanged, or blockedReason. Idempotent list appends.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    status: z
      .enum([
        "open",
        "investigating",
        "rca_posted",
        "fixing",
        "fixed",
        "blocked",
        "ignored",
      ])
      .optional(),
    title: z.string().min(1).max(160).optional(),
    summary: z.string().optional(),
    service: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    symptoms: z.string().optional(),
    rootCause: z.string().optional(),
    resolution: z.string().optional(),
    blockedReason: z.string().optional(),
    evidence: z.array(z.string()).optional(),
    hypotheses: z.array(z.string()).optional(),
    findings: z.array(z.string()).optional(),
    filesChanged: z.array(z.string()).optional(),
    branch: z.string().optional(),
  }),
  async execute(input, ctx) {
    const incident = await getCase(ctx.host.kv, input.caseId);
    if (!incident) {
      return { updated: false, reason: "not_found", caseId: input.caseId };
    }

    if (input.title) incident.title = input.title;
    if (input.summary) incident.summary = input.summary;
    if (input.service) incident.service = input.service;
    if (input.severity) incident.severity = input.severity;
    if (input.symptoms) incident.symptoms = input.symptoms;
    if (input.rootCause) incident.rootCause = input.rootCause;
    if (input.resolution) incident.resolution = input.resolution;
    if (input.blockedReason) incident.blockedReason = input.blockedReason;
    if (input.branch) incident.branch = input.branch;
    if (input.status) incident.status = input.status;

    const append = (list: string[], items?: string[]) => {
      if (!items) return;
      for (const item of items) {
        if (!list.includes(item)) list.push(item);
      }
    };
    append(incident.evidence, input.evidence);
    append(incident.hypotheses, input.hypotheses);
    append(incident.findings, input.findings);
    append(incident.filesChanged, input.filesChanged);

    incident.updatedAt = new Date().toISOString();
    await putCase(ctx.host.kv, incident);

    if (
      incident.status === "fixed" ||
      incident.status === "ignored" ||
      incident.status === "blocked"
    ) {
      await removeOpenCaseId(ctx.host.kv, incident.id);
    }

    return { updated: true, case: publicCase(incident) };
  },
});
