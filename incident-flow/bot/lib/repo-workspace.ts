import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RepoConfig } from "./repo-config.js";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function fixtureAppRoot(): string {
  return path.join(PROJECT_ROOT, "fixtures", "app-repo");
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }
}

async function runGit(
  cwd: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Ensure a writable checkout exists for the configured repo.
 * Returns the absolute work directory (repo root).
 */
export async function ensureWorkspace(
  config: RepoConfig,
): Promise<{ ok: true; root: string } | { ok: false; error: string }> {
  const root = path.join(config.workDir, "repo");
  await fs.mkdir(config.workDir, { recursive: true });

  if (config.mode === "fixture") {
    const source = fixtureAppRoot();
    if (!(await pathExists(source))) {
      return { ok: false, error: `Fixture app missing at ${source}` };
    }
    const alreadyReady = await pathExists(path.join(root, ".git"));
    if (!alreadyReady) {
      if (await pathExists(root)) {
        await fs.rm(root, { recursive: true, force: true });
      }
      await copyDir(source, root);
      try {
        await runGit(root, ["init", "-b", config.defaultBranch]);
        await runGit(root, ["config", "user.email", "bug-fix@local"]);
        await runGit(root, ["config", "user.name", "bug-fix"]);
        await runGit(root, ["add", "-A"]);
        await runGit(root, ["commit", "-m", "fixture baseline"]);
      } catch (err) {
        return {
          ok: false,
          error: `Failed to init fixture git repo: ${String(err)}`,
        };
      }
    }
    return { ok: true, root };
  }

  const cloneUrl = config.githubToken
    ? `https://x-access-token:${config.githubToken}@github.com/${config.repo}.git`
    : `https://github.com/${config.repo}.git`;

  try {
    if (await pathExists(path.join(root, ".git"))) {
      await runGit(root, ["fetch", "origin", config.defaultBranch]);
      await runGit(root, ["checkout", config.defaultBranch]);
      await runGit(root, ["reset", "--hard", `origin/${config.defaultBranch}`]);
    } else {
      if (await pathExists(root)) {
        await fs.rm(root, { recursive: true, force: true });
      }
      await execFileAsync(
        "git",
        [
          "clone",
          "--branch",
          config.defaultBranch,
          "--single-branch",
          cloneUrl,
          root,
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      );
    }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to clone/update ${config.repo}: ${String(err)}`,
    };
  }

  return { ok: true, root };
}

export function resolveUnderRoot(
  root: string,
  relativePath: string,
): { ok: true; abs: string; rel: string } | { ok: false; error: string } {
  const cleaned = relativePath.replace(/\\/g, "/");
  if (
    cleaned.startsWith("/") ||
    cleaned.includes("\0") ||
    cleaned.split("/").includes("..")
  ) {
    return { ok: false, error: "Path escapes the workspace." };
  }
  const abs = path.resolve(root, cleaned);
  const relToRoot = path.relative(root, abs);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
    return { ok: false, error: "Path escapes the workspace." };
  }
  return { ok: true, abs, rel: relToRoot.split(path.sep).join("/") };
}

export async function listTree(
  root: string,
  maxEntries = 200,
): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (out.length >= maxEntries) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (out.length >= maxEntries) return;
      if (
        entry.name === ".git" ||
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist"
      ) {
        continue;
      }
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        out.push(rel);
      }
    }
  }

  await walk(root);
  return out;
}

export async function checkoutFixBranch(
  root: string,
  branch: string,
  baseBranch: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await runGit(root, ["checkout", baseBranch]);
    await runGit(root, ["checkout", "-B", branch]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function commitAll(
  root: string,
  message: string,
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  try {
    await runGit(root, ["config", "user.email", "bug-fix@cursor.local"]);
    await runGit(root, ["config", "user.name", "bug-fix"]);
    await runGit(root, ["add", "-A"]);
    const status = await runGit(root, ["status", "--porcelain"]);
    if (!status.stdout.trim()) {
      const rev = await runGit(root, ["rev-parse", "HEAD"]);
      return { ok: true, sha: rev.stdout.trim() };
    }
    await runGit(root, ["commit", "-m", message]);
    const rev = await runGit(root, ["rev-parse", "HEAD"]);
    return { ok: true, sha: rev.stdout.trim() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function pushBranch(
  root: string,
  branch: string,
  config: RepoConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (config.mode === "fixture") {
    return { ok: true };
  }
  if (!config.githubToken) {
    return { ok: false, error: "GITHUB_TOKEN (or GH_TOKEN) is required to push." };
  }
  const remote = `https://x-access-token:${config.githubToken}@github.com/${config.repo}.git`;
  try {
    await runGit(root, ["remote", "set-url", "origin", remote]);
    await runGit(root, ["push", "-u", "origin", `HEAD:refs/heads/${branch}`, "--force"]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function runCheckCommand(
  root: string,
  command: string,
): Promise<{ ok: boolean; exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-lc", command], {
      cwd: root,
      maxBuffer: 5 * 1024 * 1024,
    });
    return { ok: true, exitCode: 0, stdout, stderr };
  } catch (err) {
    const failure = err as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      ok: false,
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? failure.message ?? String(err),
    };
  }
}
