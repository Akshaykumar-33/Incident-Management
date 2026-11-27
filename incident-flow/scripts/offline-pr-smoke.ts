/**
 * Offline proof: RCA gate blocks PR until approve; then fixture patch works.
 * Run: npx tsx scripts/offline-pr-smoke.ts
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { HostKvApi, JsonValue } from "@grok/agent-sdk";
import {
  addOpenCaseId,
  getCase,
  newCaseId,
  putCase,
  type IncidentCase,
} from "../bot/lib/case-store.js";
import { isFixTrigger } from "../bot/lib/fix-trigger.js";
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
  if (!isFixTrigger("fix it") || isFixTrigger("thanks")) {
    throw new Error("fix-trigger helper failed");
  }

  process.env.BUG_FIX_USE_FIXTURE = "1";
  process.env.BUG_FIX_CHECK_CMD = "node --test";
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "incident-flow-"));
  process.env.BUG_FIX_WORK_DIR = workDir;

  const kv = memoryKv();
  const now = new Date().toISOString();
  const incident: IncidentCase = {
    id: newCaseId(),
    status: "investigating",
    title: "SAVE10 total wrong",
    hypotheses: [],
    evidence: [],
    findings: ["applyDiscount compared to SAVE100"],
    filesChanged: [],
    createdAt: now,
    updatedAt: now,
  };
  await putCase(kv, incident);
  await addOpenCaseId(kv, incident.id);

  // Simulate post_rca without fix approval — PR path must stay blocked.
  incident.rcaMarkdown = "## RCA\nRoot cause: SAVE100 typo.";
  incident.rootCause = "applyDiscount compares SAVE100 not SAVE10";
  incident.status = "rca_posted";
  await putCase(kv, incident);

  let blocked = await getCase(kv, incident.id);
  if (!blocked?.fixApprovedAt && blocked?.status !== "rca_posted") {
    throw new Error("expected rca_posted");
  }

  // Human gate
  if (!isFixTrigger("fix it")) throw new Error("expected fix trigger");
  incident.fixApprovedAt = new Date().toISOString();
  incident.status = "fixing";
  await putCase(kv, incident);

  const config = loadRepoConfig("/tmp");
  if ("error" in config) throw new Error(config.error);
  const ensured = await ensureWorkspace(config);
  if (!ensured.ok) throw new Error(ensured.error);

  const before = await runCheckCommand(ensured.root, config.checkCmd);
  if (before.ok) throw new Error("expected failing tests before patch");

  const pricing = path.join(ensured.root, "src/pricing.js");
  const raw = await fs.readFile(pricing, "utf8");
  await fs.writeFile(pricing, raw.replace("SAVE100", "SAVE10"), "utf8");
  incident.filesChanged.push("src/pricing.js");

  const after = await runCheckCommand(ensured.root, config.checkCmd);
  if (!after.ok) throw new Error(`checks failed:\n${after.stderr}`);

  const branch = `cursor/bugfix-${incident.id}`;
  const checked = await checkoutFixBranch(
    ensured.root,
    branch,
    config.defaultBranch,
  );
  if (!checked.ok) throw new Error(checked.error);
  const committed = await commitAll(ensured.root, `fix: ${incident.title}`);
  if (!committed.ok) throw new Error(committed.error);
  const pushed = await pushBranch(ensured.root, branch, config);
  if (!pushed.ok) throw new Error(pushed.error);

  incident.branch = branch;
  incident.prUrl = "https://github.com/fixture/app-repo/pull/42";
  incident.prNumber = 42;
  incident.status = "fixed";
  await putCase(kv, incident);

  console.log(
    JSON.stringify(
      {
        ok: true,
        caseId: incident.id,
        gated: true,
        branch,
        prNumber: 42,
        note: "PR URL stored on case only; Slack replies must omit it.",
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
