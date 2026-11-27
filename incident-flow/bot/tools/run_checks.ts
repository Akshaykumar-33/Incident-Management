import path from "node:path";
import { promises as fs } from "node:fs";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadRepoConfig } from "../lib/repo-config.js";
import { runCheckCommand } from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Run the configured check command (BUG_FIX_CHECK_CMD, default
    "node --test") in the ensured app repo. Require a passing result
    before open_fix_pr.
  `,
  effect: "read",
  inputSchema: z.object({
    command: z.string().optional(),
  }),
  async execute(input, ctx) {
    const config = loadRepoConfig(ctx.stateRoot);
    if ("error" in config) {
      return { ok: false, reason: "repo_not_configured", error: config.error };
    }
    const root = path.join(config.workDir, "repo");
    try {
      await fs.access(root);
    } catch {
      return {
        ok: false,
        reason: "workspace_missing",
        error: "Call ensure_repo first.",
      };
    }

    const command = input.command?.trim() || config.checkCmd;
    const result = await runCheckCommand(root, command);
    return {
      ok: result.ok,
      passed: result.ok,
      exitCode: result.exitCode,
      command,
      stdout: result.stdout.slice(0, 8000),
      stderr: result.stderr.slice(0, 4000),
    };
  },
});
