/**
 * Offline proof that fixture ensure → patch → checks → synthetic PR works
 * without a model turn. Run: npx tsx scripts/offline-pr-smoke.ts
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { HostKvApi, JsonValue } from "@grok/agent-sdk";
import {
  addOpenBugId,
  newBugId,
  putBugCase,
  type BugCase,
} from "../bot/lib/bug-store.js";
import { loadRepoConfig } from "../bot/lib/repo-config.js";
import {
  checkoutFixBranch,
  commitAll,
  ensureWorkspace,
  pushBranch,
  runCheckCommand,
} from "../bot/lib/repo-workspace.js";

function memoryKv(): HostKvApi {
  const map = new Map<string, JsonValue>();
  return {
    async get(key: string) {
      return map.get(key);
    },
    async put(key: string, value: JsonValue) {
      map.set(key, value);
    },
    async delete(key: string) {
      map.delete(key);
    },
  };
}

async function main() {
  process.env.BUG_FIX_USE_FIXTURE = "1";
  process.env.BUG_FIX_CHECK_CMD = "node --test";
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "bug-fix-smoke-"));
  process.env.BUG_FIX_WORK_DIR = workDir;

  const config = loadRepoConfig("/tmp");
  if ("error" in config) throw new Error(config.error);

  const ensured = await ensureWorkspace(config);
  if (!ensured.ok) throw new Error(ensured.error);

  const before = await runCheckCommand(ensured.root, config.checkCmd);
  if (before.ok) throw new Error("Expected fixture tests to fail before patch");

  const pricing = path.join(ensured.root, "src/pricing.js");
  const raw = await fs.readFile(pricing, "utf8");
  if (!raw.includes("SAVE100")) throw new Error("Fixture bug marker missing");
  await fs.writeFile(pricing, raw.replace("SAVE100", "SAVE10"), "utf8");

  const after = await runCheckCommand(ensured.root, config.checkCmd);
  if (!after.ok) throw new Error(`Checks failed after patch:\n${after.stderr}`);

  const kv = memoryKv();
  const now = new Date().toISOString();
  const bug: BugCase = {
    id: newBugId(),
    status: "investigating",
    title: "SAVE10 total wrong",
    filesChanged: ["src/pricing.js"],
    findings: ["applyDiscount compared to SAVE100"],
    createdAt: now,
    updatedAt: now,
  };
  await putBugCase(kv, bug);
  await addOpenBugId(kv, bug.id);

  const branch = `cursor/bugfix-${bug.id}`;
  const checked = await checkoutFixBranch(
    ensured.root,
    branch,
    config.defaultBranch,
  );
  if (!checked.ok) throw new Error(checked.error);

  const committed = await commitAll(ensured.root, `fix: ${bug.title}`);
  if (!committed.ok) throw new Error(committed.error);
  const pushed = await pushBranch(ensured.root, branch, config);
  if (!pushed.ok) throw new Error(pushed.error);

  bug.branch = branch;
  bug.prUrl = `https://github.com/fixture/app-repo/pull/42`;
  bug.prNumber = 42;
  bug.status = "fixed";
  await putBugCase(kv, bug);

  console.log(
    JSON.stringify(
      {
        ok: true,
        caseId: bug.id,
        branch,
        headSha: committed.sha,
        prNumber: bug.prNumber,
        note: "Synthetic PR stored on case; Slack replies must omit the URL.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
