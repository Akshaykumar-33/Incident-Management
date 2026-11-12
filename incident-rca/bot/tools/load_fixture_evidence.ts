import { promises as fs } from "node:fs";
import path from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

const ALLOWED = new Set([
  "deploy-timeline.json",
  "error-logs.txt",
  "recent-changes.md",
  "manifest.json",
]);

export default defineTool({
  description: prompt`
    Load synthetic fixture evidence from the sandbox workspace
    fixtures/ directory. Use before forming hypotheses. Pass a
    filename, or omit to load the manifest of available fixtures.
  `,
  effect: "read",
  inputSchema: z.object({
    filename: z.string().optional(),
  }),
  async execute({ filename }, ctx) {
    const fixturesDir = path.join(ctx.workspaceDir, "fixtures");
    if (!filename) {
      try {
        const manifestPath = path.join(fixturesDir, "manifest.json");
        const raw = await fs.readFile(manifestPath, "utf8");
        return { source: "fixture", filename: "manifest.json", content: raw };
      } catch {
        return {
          source: "fixture",
          error: "manifest_missing",
          hint: "Expected fixtures/manifest.json in the workspace.",
        };
      }
    }

    const base = path.basename(filename);
    if (!ALLOWED.has(base)) {
      return {
        source: "fixture",
        error: "filename_not_allowed",
        allowed: [...ALLOWED],
      };
    }

    try {
      const raw = await fs.readFile(path.join(fixturesDir, base), "utf8");
      return { source: "fixture", filename: base, content: raw };
    } catch {
      return {
        source: "fixture",
        error: "not_found",
        filename: base,
      };
    }
  },
});
