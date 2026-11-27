import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getCase,
  publicCase,
  putCase,
} from "../lib/case-store.js";
import { isFixTrigger } from "../lib/fix-trigger.js";

export default defineTool({
  description: prompt`
    Record human approval to start code fix + draft PR. Pass the raw
    Slack message text. Succeeds only when the text matches a fix
    trigger (fix it / open PR / fix karo) AND the case status is
    rca_posted (or already fixing). Sets status to fixing.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    messageText: z.string().min(1),
    approvedBy: z.string().optional(),
  }),
  async execute(input, ctx) {
    if (!isFixTrigger(input.messageText)) {
      return {
        approved: false,
        reason: "not_a_fix_trigger",
        hint: 'Need a message like "fix it" or "open PR".',
      };
    }

    const incident = await getCase(ctx.host.kv, input.caseId);
    if (!incident) {
      return { approved: false, reason: "not_found", caseId: input.caseId };
    }

    if (incident.status === "fixed" && incident.prUrl) {
      return {
        approved: false,
        reason: "already_fixed",
        case: publicCase(incident),
      };
    }

    if (
      incident.status !== "rca_posted" &&
      incident.status !== "fixing"
    ) {
      return {
        approved: false,
        reason: "rca_required_first",
        status: incident.status,
        hint: "Post the RCA with post_rca before approving a fix.",
      };
    }

    if (!incident.fixApprovedAt) {
      incident.fixApprovedAt = new Date().toISOString();
      incident.fixApprovedBy = input.approvedBy;
    }
    incident.status = "fixing";
    incident.updatedAt = new Date().toISOString();
    await putCase(ctx.host.kv, incident);

    return {
      approved: true,
      case: publicCase(incident),
      note: "Human gate passed. You may ensure_repo, apply_patch, run_checks, then open_fix_pr.",
    };
  },
});
