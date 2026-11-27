import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getCase,
  putCase,
  removeOpenCaseId,
} from "../lib/case-store.js";
import { loadRepoConfig } from "../lib/repo-config.js";
import {
  commitAll,
  pushBranch,
  runCheckCommand,
} from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Commit, push, and open a draft PR on BUG_FIX_REPO (or synthetic PR
    in fixture mode). Requires human fix approval via approve_fix after
    RCA. Stores PR URL on the case only — never paste PR links in Slack.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(4000),
    skipChecks: z.boolean().optional(),
  }),
  async execute(input, ctx) {
    const incident = await getCase(ctx.host.kv, input.caseId);
    if (!incident) {
      return { opened: false, reason: "not_found", caseId: input.caseId };
    }
    if (!incident.fixApprovedAt) {
      return {
        opened: false,
        reason: "fix_not_approved",
        status: incident.status,
        hint: "Human must say fix it / open PR; then call approve_fix.",
      };
    }
    if (incident.prUrl) {
      return {
        opened: false,
        reason: "already_opened",
        caseId: incident.id,
        prNumber: incident.prNumber,
        hasPr: true,
        note: "PR already recorded. Do not paste any PR link into Slack.",
      };
    }

    const config = loadRepoConfig(ctx.stateRoot);
    if ("error" in config) {
      return {
        opened: false,
        reason: "repo_not_configured",
        error: config.error,
      };
    }

    const root = path.join(config.workDir, "repo");
    if (!input.skipChecks) {
      const checks = await runCheckCommand(root, config.checkCmd);
      if (!checks.ok) {
        return {
          opened: false,
          reason: "checks_failed",
          exitCode: checks.exitCode,
          stdout: checks.stdout.slice(0, 4000),
          stderr: checks.stderr.slice(0, 2000),
        };
      }
    }

    const branch = incident.branch || `cursor/bugfix-${incident.id}`;
    const committed = await commitAll(
      root,
      `fix: ${input.title}\n\nCase ${incident.id}`,
    );
    if (!committed.ok) {
      return { opened: false, reason: "commit_failed", error: committed.error };
    }

    const pushed = await pushBranch(root, branch, config);
    if (!pushed.ok) {
      return { opened: false, reason: "push_failed", error: pushed.error };
    }

    let prUrl: string;
    let prNumber: number;

    if (config.mode === "fixture") {
      prNumber = Math.floor(Math.random() * 9000) + 1000;
      prUrl = `https://github.com/fixture/app-repo/pull/${prNumber}`;
    } else {
      if (!config.githubToken) {
        return {
          opened: false,
          reason: "missing_token",
          error: "GITHUB_TOKEN is required to open a live draft PR.",
        };
      }
      const api = await fetch(
        `https://api.github.com/repos/${config.repo}/pulls`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${config.githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "incident-flow-agent",
          },
          body: JSON.stringify({
            title: input.title,
            body: input.body,
            head: branch,
            base: config.defaultBranch,
            draft: true,
          }),
        },
      );
      const json = (await api.json()) as {
        html_url?: string;
        number?: number;
        message?: string;
        errors?: unknown;
      };
      if (!api.ok || !json.html_url || typeof json.number !== "number") {
        return {
          opened: false,
          reason: "github_api_failed",
          status: api.status,
          error: json.message ?? "unknown",
          details: json.errors ? JSON.stringify(json.errors) : "",
        };
      }
      prUrl = json.html_url;
      prNumber = json.number;
    }

    incident.branch = branch;
    incident.prUrl = prUrl;
    incident.prNumber = prNumber;
    incident.status = "fixed";
    incident.updatedAt = new Date().toISOString();
    await putCase(ctx.host.kv, incident);
    await removeOpenCaseId(ctx.host.kv, incident.id);

    return {
      opened: true,
      caseId: incident.id,
      branch,
      headSha: committed.sha,
      prNumber,
      hasPr: true,
      filesChanged: incident.filesChanged,
      note: "Draft PR opened and stored on the case. Do NOT include any PR URL in the Slack reply.",
    };
  },
});
