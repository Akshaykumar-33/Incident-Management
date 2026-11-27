import { promises as fs } from "node:fs";
import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadRepoConfig } from "../lib/repo-config.js";
import { resolveUnderRoot } from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Read a UTF-8 text file from the ensured app repo by relative path.
    Optionally return a line range (1-indexed, inclusive).
  `,
  effect: "read",
  inputSchema: z.object({
    path: z.string().min(1),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
  }),
  async execute(input, ctx) {
    const config = loadRepoConfig(ctx.stateRoot);
    if ("error" in config) {
      return { ok: false, reason: "repo_not_configured", error: config.error };
    }
    const root = path.join(config.workDir, "repo");
    const resolved = resolveUnderRoot(root, input.path);
    if (!resolved.ok) {
      return { ok: false, reason: "bad_path", error: resolved.error };
    }

    let content: string;
    try {
      content = await fs.readFile(resolved.abs, "utf8");
    } catch {
      return { ok: false, reason: "not_found", path: resolved.rel };
    }
    if (content.includes("\0")) {
      return { ok: false, reason: "binary_file", path: resolved.rel };
    }

    const lines = content.split(/\r?\n/);
    const start = input.startLine ?? 1;
    const end = input.endLine ?? lines.length;
    const slice = lines.slice(Math.max(0, start - 1), Math.max(start - 1, end));
    return {
      ok: true,
      path: resolved.rel,
      startLine: start,
      endLine: Math.min(end, lines.length),
      content: slice.join("\n"),
      totalLines: lines.length,
    };
  },
});
