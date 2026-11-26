import { promises as fs } from "node:fs";
import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getBugCase, putBugCase } from "../lib/bug-store.js";
import { loadRepoConfig } from "../lib/repo-config.js";
import { resolveUnderRoot } from "../lib/repo-workspace.js";

export default defineTool({
  description: prompt`
    Apply a minimal text edit in the ensured app repo: replace the first
    occurrence of oldText with newText in a relative path, or write full
    content when replaceAllContent is provided. Tracks filesChanged on
    the bug case when caseId is set.
  `,
  effect: "write",
  inputSchema: z
    .object({
      path: z.string().min(1),
      oldText: z.string().optional(),
      newText: z.string().optional(),
      replaceAllContent: z.string().optional(),
      caseId: z.string().optional(),
    })
    .refine(
      (value) =>
        typeof value.replaceAllContent === "string" ||
        (typeof value.oldText === "string" && typeof value.newText === "string"),
      {
        message:
          "Provide replaceAllContent, or both oldText and newText.",
      },
    ),
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

    let next: string;
    if (typeof input.replaceAllContent === "string") {
      next = input.replaceAllContent;
    } else {
      let current: string;
      try {
        current = await fs.readFile(resolved.abs, "utf8");
      } catch {
        return { ok: false, reason: "not_found", path: resolved.rel };
      }
      const oldText = input.oldText ?? "";
      const newText = input.newText ?? "";
      if (!current.includes(oldText)) {
        return {
          ok: false,
          reason: "old_text_not_found",
          path: resolved.rel,
        };
      }
      next = current.replace(oldText, newText);
    }

    await fs.mkdir(path.dirname(resolved.abs), { recursive: true });
    await fs.writeFile(resolved.abs, next, "utf8");

    if (input.caseId) {
      const bug = await getBugCase(ctx.host.kv, input.caseId);
      if (bug) {
        if (!bug.filesChanged.includes(resolved.rel)) {
          bug.filesChanged.push(resolved.rel);
        }
        if (bug.status === "open") bug.status = "investigating";
        bug.updatedAt = new Date().toISOString();
        await putBugCase(ctx.host.kv, bug);
      }
    }

    return {
      ok: true,
      path: resolved.rel,
      bytes: Buffer.byteLength(next, "utf8"),
    };
  },
});
