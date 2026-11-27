/**
 * Detect human approval to start the code-fix + draft PR phase.
 * Option B: RCA posts first; fix only after an explicit trigger.
 */
const FIX_TRIGGER =
  /\b(fix\s*it|open\s*pr|open\s*a?\s*pr|create\s*pr|please\s*fix|fix\s*karo|pr\s*banao|go\s*ahead\s*and\s*fix)\b/i;

export function isFixTrigger(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return FIX_TRIGGER.test(trimmed);
}

export function fixTriggerHelp(): string {
  return 'Reply in this thread with "fix it" or "open PR" when you want a draft fix PR.';
}
