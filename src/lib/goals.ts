import type { Goal, LogEntry } from './streaks.js';

export type GoalStatus = Goal['status'];

/**
 * Canonical display order for the four *tracked* goal statuses — `idea`
 * is deliberately excluded. This is a fixed property of the schema's own
 * enum, not a per-person or per-topic schedule — it never varies with the
 * data, unlike topics or scheduled days.
 */
export const STATUS_ORDER: readonly Exclude<GoalStatus, 'idea'>[] = [
  'in-progress',
  'pending',
  'achieved',
  'cancelled',
];

export function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
  keys: readonly K[]
): Record<K, T[]> {
  const grouped = Object.fromEntries(keys.map((key) => [key, [] as T[]])) as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    // Items whose key isn't one of `keys` are skipped rather than
    // throwing — lets callers group by a subset of a wider status enum
    // (e.g. the four "active" goal statuses, leaving `idea` goals for a
    // separate section) without pre-filtering first.
    if (key in grouped) grouped[key].push(item);
  }
  return grouped;
}

export function countBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
  keys: readonly K[]
): Record<K, number> {
  const grouped = groupBy(items, keyFn, keys);
  return Object.fromEntries(keys.map((key) => [key, grouped[key].length])) as Record<K, number>;
}

const STATUS_SUMMARY_LABEL: Record<Exclude<GoalStatus, 'idea'>, string> = {
  'in-progress': 'in progress',
  pending: 'pending',
  achieved: 'achieved',
  cancelled: 'cancelled',
};

/**
 * A one-line "2 in progress, 1 achieved" rollup of a person's goals by
 * status. Shared by stats.astro's per-person rollup and the dashboard
 * card on index.astro so the aggregation lives in one place.
 */
export function summarizeGoalsByStatus(goals: { status: GoalStatus }[]): string {
  const counts = countBy(goals, (g) => g.status, STATUS_ORDER);
  const parts = STATUS_ORDER.filter((status) => counts[status] > 0).map(
    (status) => `${counts[status]} ${STATUS_SUMMARY_LABEL[status]}`
  );
  return parts.length > 0 ? parts.join(', ') : 'no goals yet';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS
  );
}

export interface GoalActivity {
  sessions: number;
  minutes: number;
}

/**
 * Completed sessions logged toward a goal: same person + topic, on or
 * after `started` (all of that topic's history if no start date is set).
 */
export function getGoalActivity(goal: Goal, entries: LogEntry[]): GoalActivity {
  const startDay = goal.started ? utcDayNumber(goal.started) : -Infinity;
  const activity: GoalActivity = { sessions: 0, minutes: 0 };
  for (const entry of entries) {
    if (
      entry.person === goal.person &&
      entry.topic === goal.topic &&
      entry.status === 'completed' &&
      utcDayNumber(entry.date) >= startDay
    ) {
      activity.sessions += 1;
      activity.minutes += entry.minutes ?? 0;
    }
  }
  return activity;
}

export type GoalTimelineTone = 'neutral' | 'soon' | 'overdue';

export interface GoalTimeline {
  label: string;
  tone: GoalTimelineTone;
}

/** Days out from a target date that count as "due soon". */
const DUE_SOON_DAYS = 7;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * "Day 12 · 5 days left"-style progress line for a goal, relative to
 * `today`. Only open goals (pending / in-progress) count down or go
 * overdue — an achieved or cancelled goal is finished, so its target is
 * history, not a deadline. Returns null when there's nothing to say.
 * Depends on `today`, so call it from a client `<script>` on the site.
 */
export function describeGoalTimeline(
  goal: Pick<Goal, 'status' | 'started' | 'target_date'>,
  today: Date = new Date()
): GoalTimeline | null {
  if (goal.status !== 'pending' && goal.status !== 'in-progress') return null;
  const todayDay = utcDayNumber(today);
  const parts: string[] = [];
  let tone: GoalTimelineTone = 'neutral';

  if (goal.started) {
    const elapsed = todayDay - utcDayNumber(goal.started);
    parts.push(elapsed >= 0 ? `Day ${elapsed + 1}` : `Starts in ${plural(-elapsed, 'day')}`);
  }
  if (goal.target_date) {
    const remaining = utcDayNumber(goal.target_date) - todayDay;
    if (remaining < 0) {
      parts.push(`${plural(-remaining, 'day')} overdue`);
      tone = 'overdue';
    } else if (remaining === 0) {
      parts.push('Due today');
      tone = 'soon';
    } else {
      parts.push(`${plural(remaining, 'day')} left`);
      if (remaining <= DUE_SOON_DAYS) tone = 'soon';
    }
  }
  return parts.length > 0 ? { label: parts.join(' · '), tone } : null;
}
