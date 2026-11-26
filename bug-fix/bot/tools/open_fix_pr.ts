import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import {
  getBugCase,
  putBugCase,
  removeOpenBugId,
} from "../lib/bug-store.js";
import { loadRepoConfig } from "../lib/repo-config.js";
import {
  commitAll,
  pushBranch,
  runCheckCommand,
} from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Commit local changes, push a fix branch, and open a draft pull
    request on BUG_FIX_REPO (or record a synthetic draft PR in fixture
    mode). Stores the PR URL on the case only — never include any PR
    URL or github.com/…/pull link in Slack replies. The system surfaces
    the PR separately.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string(),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(4000),
    skipChecks: z.boolean().optional(),
  }),
  async execute(input, ctx) {
    const bug = await getBugCase(ctx.host.kv, input.caseId);
    if (!bug) {
      return { opened: false, reason: "not_found", caseId: input.caseId };
    }
    if (bug.prUrl) {
      return {
        opened: false,
        reason: "already_opened",
        caseId: bug.id,
        prNumber: bug.prNumber,
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

    const branch = bug.branch || `cursor/bugfix-${bug.id}`;
    const committed = await commitAll(
      root,
      `fix: ${input.title}\n\nBug case ${bug.id}`,
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
            "User-Agent": "bug-fix-agent",
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

    bug.branch = branch;
    bug.prUrl = prUrl;
    bug.prNumber = prNumber;
    bug.status = "fixed";
    bug.updatedAt = new Date().toISOString();
    await putBugCase(ctx.host.kv, bug);
    await removeOpenBugId(ctx.host.kv, bug.id);

    return {
      opened: true,
      caseId: bug.id,
      branch,
      headSha: committed.sha,
      prNumber,
      hasPr: true,
      filesChanged: bug.filesChanged,
      note: "Draft PR opened and stored on the case. Do NOT include any PR URL or github.com pull link in the Slack reply. The system attaches the PR automatically.",
    };
  },
});
