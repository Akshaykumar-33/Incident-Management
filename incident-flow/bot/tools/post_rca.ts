import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getCase,
  publicCase,
  putCase,
} from "../lib/case-store.js";
import { fixTriggerHelp } from "../lib/fix-trigger.js";

export default defineTool({
  description: prompt`
    Store the final RCA on the case and set status to rca_posted.
    Does NOT open a PR. After this, wait for a human fix trigger
    ("fix it" / "open PR") before approve_fix and open_fix_pr.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    rcaMarkdown: z.string().min(1).max(8000),
    rootCause: z.string().min(1),
    resolution: z.string().optional(),
  }),
  async execute(input, ctx) {
    const incident = await getCase(ctx.host.kv, input.caseId);
    if (!incident) {
      return { posted: false, reason: "not_found", caseId: input.caseId };
    }

    incident.rcaMarkdown = input.rcaMarkdown;
    incident.rootCause = input.rootCause;
    if (input.resolution) incident.resolution = input.resolution;
    incident.status = "rca_posted";
    incident.updatedAt = new Date().toISOString();
    await putCase(ctx.host.kv, incident);

    return {
      posted: true,
      case: publicCase(incident),
      nextStep: fixTriggerHelp(),
      note: "RCA stored. Do not call open_fix_pr until approve_fix succeeds after a human fix trigger.",
    };
  },
});
