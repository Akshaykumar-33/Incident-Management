import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

const ALLOWED = new Set([
  "deploy-timeline.json",
  "error-logs.txt",
  "recent-changes.md",
  "manifest.json",
]);

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export default defineTool({
  description: prompt`
    Load synthetic incident fixture evidence from fixtures/evidence/.
    Use during investigation before declaring root cause. Omit filename
    to load the manifest.
  `,
  effect: "read",
  inputSchema: z.object({
    filename: z.string().optional(),
  }),
  async execute({ filename }) {
    const fixturesDir = path.join(PROJECT_ROOT, "fixtures", "evidence");
    if (!filename) {
      try {
        const raw = await fs.readFile(
          path.join(fixturesDir, "manifest.json"),
          "utf8",
        );
        return { source: "fixture", filename: "manifest.json", content: raw };
      } catch {
        return {
          source: "fixture",
          error: "manifest_missing",
          hint: "Expected fixtures/evidence/manifest.json.",
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
      return { source: "fixture", error: "not_found", filename: base };
    }
  },
});
