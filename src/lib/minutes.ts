import type { LogEntry } from './streaks.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS
  );
}

export interface TopicMinutes {
  topic: string;
  minutes: number;
  sessions: number;
}

export interface MinutesSummary {
  /** All-time minutes across every completed entry. */
  total: number;
  /** Minutes logged over the last 7 days, today included. */
  last7: number;
  /** Minutes logged over the last 30 days, today included. */
  last30: number;
  sessions: number;
  /** All-time per-topic totals, most minutes first. */
  byTopic: TopicMinutes[];
}

/**
 * Time-spent rollup for one person. Only `completed` entries carry
 * `minutes`; excused days contribute nothing. `last7`/`last30` depend on
 * `today`, so on the static site call this from a client `<script>` with
 * the viewer's real date (see CLAUDE.md) rather than from frontmatter.
 */
export function summarizeMinutes(
  entries: LogEntry[],
  person: string,
  today: Date = new Date()
): MinutesSummary {
  const todayDay = utcDayNumber(today);
  const byTopic = new Map<string, TopicMinutes>();
  const summary: MinutesSummary = { total: 0, last7: 0, last30: 0, sessions: 0, byTopic: [] };

  for (const entry of entries) {
    if (entry.person !== person || entry.status !== 'completed') continue;
    const minutes = entry.minutes ?? 0;
    const age = todayDay - utcDayNumber(entry.date);
    summary.total += minutes;
    summary.sessions += 1;
    // Future-dated entries (age < 0) count toward all-time totals only.
    if (age >= 0 && age < 7) summary.last7 += minutes;
    if (age >= 0 && age < 30) summary.last30 += minutes;

    const topic = entry.topic ?? '';
    const current = byTopic.get(topic) ?? { topic, minutes: 0, sessions: 0 };
    current.minutes += minutes;
    current.sessions += 1;
    byTopic.set(topic, current);
  }

  summary.byTopic = [...byTopic.values()].sort(
    (a, b) => b.minutes - a.minutes || a.topic.localeCompare(b.topic)
  );
  return summary;
}
