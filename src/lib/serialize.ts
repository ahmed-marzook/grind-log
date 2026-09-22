import type { Goal, LogEntry } from './streaks.js';

export type SerializedLogEntry = Omit<LogEntry, 'date'> & { date: string };
export type SerializedGoal = Omit<Goal, 'started' | 'target_date' | 'updated'> & {
  started?: string;
  target_date?: string;
  updated: string;
};

/** Turns entries back from their JSON-embedded form (ISO date strings) into real Dates. */
export function reviveLogEntries(raw: SerializedLogEntry[]): LogEntry[] {
  return raw.map((entry) => ({ ...entry, date: new Date(entry.date) }));
}

/** Turns goals back from their JSON-embedded form (ISO date strings) into real Dates. */
export function reviveGoals(raw: SerializedGoal[]): Goal[] {
  return raw.map((goal) => ({
    ...goal,
    started: goal.started ? new Date(goal.started) : undefined,
    target_date: goal.target_date ? new Date(goal.target_date) : undefined,
    updated: new Date(goal.updated),
  }));
}

/**
 * JSON for embedding in a `<script type="application/json">` island. Escapes
 * `<` so a value containing `</script>` (e.g. a title or note) can't break
 * out of the tag.
 */
export function toScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
