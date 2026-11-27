import type { HostKvApi, JsonValue } from "@grok/agent-sdk";

export type BugStatus =
  | "open"
  | "investigating"
  | "fixed"
  | "blocked"
  | "ignored";

export type BugCase = {
  id: string;
  status: BugStatus;
  channelId?: string;
  threadTs?: string;
  title: string;
  summary?: string;
  rootCause?: string;
  filesChanged: string[];
  findings: string[];
  branch?: string;
  prUrl?: string;
  prNumber?: number;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
};

const OPEN_INDEX_KEY = "bugs:open";

export function bugKey(id: string): string {
  return `bug:${id}`;
}

export function threadKey(channelId: string, threadTs: string): string {
  return `bug-thread:${channelId}:${threadTs}`;
}

export function eventDedupeKey(eventId: string): string {
  return `bug-event:${eventId}`;
}

function asBugCase(value: JsonValue | undefined): BugCase | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, JsonValue>;
  if (typeof record.id !== "string" || typeof record.title !== "string") {
    return undefined;
  }
  return value as unknown as BugCase;
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function getBugCase(
  kv: HostKvApi,
  id: string,
): Promise<BugCase | undefined> {
  return asBugCase(await kv.get(bugKey(id)));
}

export async function putBugCase(kv: HostKvApi, bug: BugCase): Promise<void> {
  await kv.put(bugKey(bug.id), bug as unknown as JsonValue);
}

export async function getBugIdForThread(
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
  bugId: string,
): Promise<void> {
  await kv.put(threadKey(channelId, threadTs), bugId);
}

export async function listOpenBugIds(kv: HostKvApi): Promise<string[]> {
  return asStringArray(await kv.get(OPEN_INDEX_KEY));
}

export async function addOpenBugId(kv: HostKvApi, id: string): Promise<void> {
  const open = await listOpenBugIds(kv);
  if (!open.includes(id)) {
    open.push(id);
    await kv.put(OPEN_INDEX_KEY, open);
  }
}

export async function removeOpenBugId(kv: HostKvApi, id: string): Promise<void> {
  const open = await listOpenBugIds(kv);
  await kv.put(
    OPEN_INDEX_KEY,
    open.filter((item) => item !== id),
  );
}

export function newBugId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `bug-${stamp}-${rand}`;
}

export async function markEventSeen(
  kv: HostKvApi,
  eventId: string,
): Promise<{ duplicate: boolean }> {
  const key = eventDedupeKey(eventId);
  const existing = await kv.get(key);
  if (existing !== undefined) {
    return { duplicate: true };
  }
  await kv.put(key, true);
  return { duplicate: false };
}
