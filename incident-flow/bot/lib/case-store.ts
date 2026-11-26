import type { HostKvApi, JsonValue } from "@grok/agent-sdk";

export type CaseStatus =
  | "open"
  | "investigating"
  | "rca_posted"
  | "fixing"
  | "fixed"
  | "blocked"
  | "ignored";

export type IncidentCase = {
  id: string;
  status: CaseStatus;
  channelId?: string;
  threadTs?: string;
  title: string;
  summary?: string;
  service?: string;
  severity?: "low" | "medium" | "high" | "critical";
  symptoms?: string;
  hypotheses: string[];
  evidence: string[];
  rootCause?: string;
  rcaMarkdown?: string;
  resolution?: string;
  findings: string[];
  filesChanged: string[];
  branch?: string;
  prUrl?: string;
  prNumber?: number;
  /** Set when a human says fix it / open PR in the thread. */
  fixApprovedAt?: string;
  fixApprovedBy?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
};

const OPEN_INDEX_KEY = "cases:open";

export function caseKey(id: string): string {
  return `case:${id}`;
}

export function threadKey(channelId: string, threadTs: string): string {
  return `case-thread:${channelId}:${threadTs}`;
}

function asCase(value: JsonValue | undefined): IncidentCase | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, JsonValue>;
  if (typeof record.id !== "string" || typeof record.title !== "string") {
    return undefined;
  }
  return value as unknown as IncidentCase;
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function getCase(
  kv: HostKvApi,
  id: string,
): Promise<IncidentCase | undefined> {
  return asCase(await kv.get(caseKey(id)));
}

export async function putCase(
  kv: HostKvApi,
  incident: IncidentCase,
): Promise<void> {
  await kv.put(caseKey(incident.id), incident as unknown as JsonValue);
}

export async function getCaseIdForThread(
  kv: HostKvApi,
  channelId: string,
  threadTs: string,
): Promise<string | undefined> {
  const value = await kv.get(threadKey(channelId, threadTs));
  return typeof value === "string" ? value : undefined;
}

export async function bindThread(
  kv: HostKvApi,
  channelId: string,
  threadTs: string,
  caseId: string,
): Promise<void> {
  await kv.put(threadKey(channelId, threadTs), caseId);
}

export async function listOpenCaseIds(kv: HostKvApi): Promise<string[]> {
  return asStringArray(await kv.get(OPEN_INDEX_KEY));
}

export async function addOpenCaseId(kv: HostKvApi, id: string): Promise<void> {
  const open = await listOpenCaseIds(kv);
  if (!open.includes(id)) {
    open.push(id);
    await kv.put(OPEN_INDEX_KEY, open);
  }
}

export async function removeOpenCaseId(
  kv: HostKvApi,
  id: string,
): Promise<void> {
  const open = await listOpenCaseIds(kv);
  await kv.put(
    OPEN_INDEX_KEY,
    open.filter((item) => item !== id),
  );
}

export function newCaseId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `case-${stamp}-${rand}`;
}

/** Public case view without PR URL (so models do not paste it into Slack). */
export function publicCase(c: IncidentCase) {
  const { prUrl: _prUrl, ...safe } = c;
  return {
    ...safe,
    hasPr: Boolean(c.prUrl),
    prNumber: c.prNumber,
    awaitingFixApproval: c.status === "rca_posted" && !c.fixApprovedAt,
    fixApproved: Boolean(c.fixApprovedAt),
  };
}
