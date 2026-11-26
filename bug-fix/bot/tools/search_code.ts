import { promises as fs } from "node:fs";
import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadRepoConfig } from "../lib/repo-config.js";
import { listTree, resolveUnderRoot } from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Search text files in the ensured app repo for a case-insensitive
    substring or simple regex. Call ensure_repo first.
  `,
  effect: "read",
  inputSchema: z.object({
    query: z.string().min(1).max(200),
    regex: z.boolean().optional(),
    maxMatches: z.number().int().min(1).max(100).optional(),
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

    let pattern: RegExp;
    try {
      pattern = input.regex
        ? new RegExp(input.query, "i")
        : new RegExp(
            input.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i",
          );
    } catch {
      return { ok: false, reason: "bad_regex", error: "Invalid regex." };
    }

    const maxMatches = input.maxMatches ?? 40;
    const files = await listTree(root, 500);
    const matches: Array<{
      path: string;
      line: number;
      text: string;
    }> = [];

    for (const rel of files) {
      if (matches.length >= maxMatches) break;
      const resolved = resolveUnderRoot(root, rel);
      if (!resolved.ok) continue;
      let content: string;
      try {
        content = await fs.readFile(resolved.abs, "utf8");
      } catch {
        continue;
      }
      if (content.includes("\0")) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxMatches) break;
        if (pattern.test(lines[i]!)) {
          matches.push({
            path: rel,
            line: i + 1,
            text: lines[i]!.slice(0, 240),
          });
        }
      }
    }

    return { ok: true, query: input.query, matchCount: matches.length, matches };
  },
});
