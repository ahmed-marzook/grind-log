import { getScheduledDays, type Goal, type LogEntry } from './streaks.js';

export type DayState = 'completed' | 'excused' | 'missed' | 'not-scheduled';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  state: DayState;
  minutes?: number;
  title?: string;
  reason?: string;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const DAY_INDEX_TO_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function dayAbbrev(date: Date) {
  return DAY_INDEX_TO_ABBREV[date.getUTCDay()];
}

/**
 * Topics a person actually uses, drawn from their own logs and goals —
 * never a static list — for populating a filter dynamically.
 */
export function getPersonTopics(person: string, entries: LogEntry[], goals: Goal[]): string[] {
  const topics = new Set<string>();
  for (const entry of entries) {
    if (entry.person === person && entry.topic) topics.add(entry.topic);
  }
  for (const goal of goals) {
    if (goal.person === person) topics.add(goal.topic);
  }
  return Array.from(topics).sort();
}

/**
 * Builds the day-by-day state sequence for a person+topic heatmap, from
 * `range.from` through `range.to` inclusive (`to` should never be in the
 * future — there is no "future" state, only scheduled/not-scheduled).
 */
export function buildCalendarDays(
  entries: LogEntry[],
  goals: Goal[],
  person: string,
  topic: string,
  range: { from: Date; to: Date }
): CalendarDay[] {
  const scheduledDays = new Set(getScheduledDays(person, topic, goals));

  const byDate = new Map<string, LogEntry>();
  for (const entry of entries) {
    if (entry.person !== person) continue;
    if (entry.status === 'completed' && entry.topic !== topic) continue;
    byDate.set(toDateKey(entry.date), entry);
  }

  const days: CalendarDay[] = [];
  const cursor = startOfUtcDay(range.from);
  const end = startOfUtcDay(range.to);
  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor);
    const scheduled = scheduledDays.has(dayAbbrev(cursor));
    const entry = byDate.get(key);

    let state: DayState;
    if (!scheduled) {
      state = 'not-scheduled';
    } else if (entry?.status === 'completed') {
      state = 'completed';
    } else if (entry?.status === 'excused') {
      state = 'excused';
    } else {
      state = 'missed';
    }

    days.push({
      date: key,
      state,
      minutes: entry?.status === 'completed' ? entry.minutes : undefined,
      title: entry?.status === 'completed' ? entry.title : undefined,
      reason: entry?.status === 'excused' ? entry.reason : undefined,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}
