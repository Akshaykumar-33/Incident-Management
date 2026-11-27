import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadRepoConfig } from "../lib/repo-config.js";
import {
  checkoutFixBranch,
  ensureWorkspace,
  listTree,
} from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Ensure the configured app repo is cloned (or the offline fixture is
    prepared). Optionally create/reset a fix branch for a bug case.
    Call this before search_code, read_file, apply_patch, or run_checks.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    caseId: z.string().optional(),
    branch: z.string().optional(),
    /** Wipe and re-seed fixture/live checkout before continuing. */
    reset: z.boolean().optional(),
  }),
  async execute(input, ctx) {
    const config = loadRepoConfig(ctx.stateRoot);
    if ("error" in config) {
      return { ok: false, reason: "repo_not_configured", error: config.error };
    }

    if (input.reset) {
      const { promises: fs } = await import("node:fs");
      const path = await import("node:path");
      await fs.rm(path.join(config.workDir, "repo"), {
        recursive: true,
        force: true,
      });
    }

    const ensured = await ensureWorkspace(config);
    if (!ensured.ok) {
      return { ok: false, reason: "workspace_failed", error: ensured.error };
    }

    let branch = input.branch;
    if (!branch && input.caseId) {
      branch = `cursor/bugfix-${input.caseId}`;
    }
    if (branch) {
      const checked = await checkoutFixBranch(
        ensured.root,
        branch,
        config.defaultBranch,
      );
      if (!checked.ok) {
        return {
          ok: false,
          reason: "branch_failed",
          error: checked.error,
          mode: config.mode,
          repo: config.repo,
        };
      }
    }

    const tree = await listTree(ensured.root);
    return {
      ok: true,
      mode: config.mode,
      repo: config.repo,
      defaultBranch: config.defaultBranch,
      branch: branch ?? config.defaultBranch,
      root: ensured.root,
      fileCount: tree.length,
      sampleFiles: tree.slice(0, 40),
      checkCmd: config.checkCmd,
    };
  },
});
