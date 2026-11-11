import type { HostKvApi, JsonValue } from "@grok/agent-sdk";

export type IncidentStatus = "open" | "resolved";

export type Incident = {
  id: string;
  status: IncidentStatus;
  channelId?: string;
  threadTs?: string;
  title: string;
  service?: string;
  severity?: "low" | "medium" | "high" | "critical";
  symptoms?: string;
  hypotheses: string[];
  evidence: string[];
  resolution?: string;
  createdAt: string;
  updatedAt: string;
};

const OPEN_INDEX_KEY = "incidents:open";

export function incidentKey(id: string): string {
  return `incident:${id}`;
}

export function threadKey(channelId: string, threadTs: string): string {
  return `thread:${channelId}:${threadTs}`;
}

export function eventDedupeKey(eventId: string): string {
  return `event:${eventId}`;
}

function asIncident(value: JsonValue | undefined): Incident | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, JsonValue>;
  if (typeof record.id !== "string" || typeof record.title !== "string") {
    return undefined;
  }
  return value as unknown as Incident;
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function getIncident(
  kv: HostKvApi,
  id: string,
): Promise<Incident | undefined> {
  return asIncident(await kv.get(incidentKey(id)));
}

export async function putIncident(kv: HostKvApi, incident: Incident): Promise<void> {
  await kv.put(incidentKey(incident.id), incident as unknown as JsonValue);
}

export async function getIncidentIdForThread(
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
  incidentId: string,
): Promise<void> {
  await kv.put(threadKey(channelId, threadTs), incidentId);
}

export async function listOpenIncidentIds(kv: HostKvApi): Promise<string[]> {
  return asStringArray(await kv.get(OPEN_INDEX_KEY));
}

export async function addOpenIncidentId(kv: HostKvApi, id: string): Promise<void> {
  const open = await listOpenIncidentIds(kv);
  if (!open.includes(id)) {
    open.push(id);
    await kv.put(OPEN_INDEX_KEY, open);
  }
}

export async function removeOpenIncidentId(kv: HostKvApi, id: string): Promise<void> {
  const open = await listOpenIncidentIds(kv);
  const next = open.filter((item) => item !== id);
  await kv.put(OPEN_INDEX_KEY, next);
}

export function newIncidentId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `inc-${stamp}-${rand}`;
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
