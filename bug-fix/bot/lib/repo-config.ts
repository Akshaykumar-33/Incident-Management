import os from "node:os";
import path from "node:path";

export type RepoMode = "fixture" | "live";

export type RepoConfig = {
  mode: RepoMode;
  /** owner/name for live, or fixtures/app-repo for fixture mode. */
  repo: string;
  owner?: string;
  name?: string;
  defaultBranch: string;
  workDir: string;
  checkCmd: string;
  githubToken?: string;
};

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function defaultWorkDir(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return path.join(os.homedir(), ".cache", "cursor-bug-fix", safe);
}

/**
 * Resolve target repo settings from env.
 *
 * Live: BUG_FIX_REPO=owner/name
 * Fixture/offline: BUG_FIX_USE_FIXTURE=1 or BUG_FIX_REPO=fixtures/app-repo
 *
 * Work dir defaults to `~/.cache/cursor-bug-fix/<slug>` so tools share one
 * checkout across turns (override with BUG_FIX_WORK_DIR).
 */
export function loadRepoConfig(_stateRoot: string): RepoConfig | { error: string } {
  const useFixture =
    process.env.BUG_FIX_USE_FIXTURE === "1" ||
    process.env.BUG_FIX_USE_FIXTURE === "true";
  const rawRepo = (process.env.BUG_FIX_REPO ?? "").trim();
  const defaultBranch =
    (process.env.BUG_FIX_DEFAULT_BRANCH ?? "main").trim() || "main";
  const checkCmd =
    (process.env.BUG_FIX_CHECK_CMD ?? "node --test").trim() || "node --test";
  const githubToken =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    undefined;

  if (useFixture || rawRepo === "fixtures/app-repo" || rawRepo === "") {
    if (!useFixture && rawRepo === "") {
      return {
        error:
          "BUG_FIX_REPO is unset. Set BUG_FIX_REPO=owner/name for live fixes, or BUG_FIX_USE_FIXTURE=1 for offline/evals.",
      };
    }
    const workDir = trimSlash(
      (process.env.BUG_FIX_WORK_DIR ?? "").trim() ||
        defaultWorkDir("fixtures-app-repo"),
    );
    return {
      mode: "fixture",
      repo: "fixtures/app-repo",
      defaultBranch,
      workDir,
      checkCmd,
      githubToken,
    };
  }

  const cleaned = rawRepo
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^github\.com\//i, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length !== 2) {
    return {
      error: `BUG_FIX_REPO must be owner/name (got ${JSON.stringify(rawRepo)}).`,
    };
  }

  const repo = `${parts[0]}/${parts[1]}`;
  const workDir = trimSlash(
    (process.env.BUG_FIX_WORK_DIR ?? "").trim() || defaultWorkDir(repo),
  );

  return {
    mode: "live",
    repo,
    owner: parts[0],
    name: parts[1],
    defaultBranch,
    workDir,
    checkCmd,
    githubToken,
  };
}
