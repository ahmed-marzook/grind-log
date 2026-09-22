import { getPersonTopics, getScheduledDays, type Goal, type LogEntry } from './streaks.js';

export { getPersonTopics };

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

/**
 * The same day-by-day heatmap as `buildCalendarDays`, but rolled up
 * across every topic a person has instead of one — the "overall
 * activity" view (headline streak + top-of-page heatmap), where any
 * topic touched that day should show up, not just one.
 *
 * Per day, completed wins if any topic was completed, then excused, then
 * missed, then not-scheduled — "any goal touched" should read as
 * completed even if some other unrelated topic was also scheduled and
 * skipped that day. This is the opposite priority from
 * `resolveTodayStatus`'s "missed wins," which is deliberately different:
 * that one surfaces what still needs attention *today*, this one records
 * what already happened on a given day. A completed day's minutes/title
 * are summed/joined across every topic completed that day, so the
 * heatmap's intensity reflects total time studied, not just one topic's.
 */
export function buildOverallCalendarDays(
  entries: LogEntry[],
  goals: Goal[],
  person: string,
  range: { from: Date; to: Date }
): CalendarDay[] {
  const topics = getPersonTopics(person, entries, goals);
  if (topics.length === 0) return [];

  const perTopicDays = topics.map((topic) => buildCalendarDays(entries, goals, person, topic, range));

  const days: CalendarDay[] = [];
  const dayCount = perTopicDays[0].length;
  for (let i = 0; i < dayCount; i++) {
    const todaysDays = perTopicDays.map((topicDays) => topicDays[i]);
    const date = todaysDays[0].date;

    let state: DayState;
    if (todaysDays.some((d) => d.state === 'completed')) state = 'completed';
    else if (todaysDays.some((d) => d.state === 'excused')) state = 'excused';
    else if (todaysDays.some((d) => d.state === 'missed')) state = 'missed';
    else state = 'not-scheduled';

    let minutes: number | undefined;
    let title: string | undefined;
    let reason: string | undefined;
    if (state === 'completed') {
      const completedDays = todaysDays.filter((d) => d.state === 'completed');
      minutes = completedDays.reduce((sum, d) => sum + (d.minutes ?? 0), 0);
      title = completedDays
        .map((d) => d.title)
        .filter((t): t is string => Boolean(t))
        .join(', ');
    } else if (state === 'excused') {
      reason = todaysDays.find((d) => d.state === 'excused')?.reason;
    }

    days.push({ date, state, minutes, title, reason });
  }

  return days;
}

/**
 * Visual intensity bucket for a completed day's heatmap fill, scaled by
 * minutes studied. Shared by every calendar-style view (full calendar,
 * dashboard mini-calendar) so the same minutes always render the same
 * shade.
 */
export function levelForMinutes(minutes: number | undefined): 1 | 2 | 3 | 4 {
  if (minutes == null) return 1;
  if (minutes < 20) return 1;
  if (minutes < 40) return 2;
  if (minutes < 60) return 3;
  return 4;
}

/**
 * Share of scheduled days in a window that were completed, as a rounded
 * percentage. Excused days are neutral — they don't break a streak, but
 * they aren't study time either — so they're excluded from both sides of
 * the ratio rather than counted as a hit or a miss. Returns null when the
 * window has no scheduled days at all (nothing to be consistent about).
 */
export function consistencyForWindow(days: CalendarDay[]): number | null {
  let completed = 0;
  let missed = 0;
  for (const day of days) {
    if (day.state === 'completed') completed++;
    else if (day.state === 'missed') missed++;
  }
  const total = completed + missed;
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

/** Hover/tap text for a single calendar day, shared across calendar views. */
export function formatDayTooltip(day: CalendarDay): string {
  switch (day.state) {
    case 'completed':
      return `${day.date}: ${day.title} (${day.minutes} min)`;
    case 'excused':
      return `${day.date}: Excused — ${day.reason}`;
    case 'missed':
      return `${day.date}: Missed`;
    default:
      return `${day.date}: Not scheduled`;
  }
}

/**
 * Pads the front of a day sequence so the first real day lands in its
 * correct weekday column. With `grid-auto-flow: column` and 7 explicit
 * rows, the padded flat array fills column-major — i.e. week by week.
 */
export function padCalendarDaysForGrid(days: CalendarDay[]): (CalendarDay | null)[] {
  if (days.length === 0) return [];
  const firstDow = new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay();
  return [...Array(firstDow).fill(null), ...days];
}
