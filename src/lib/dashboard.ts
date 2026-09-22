import { buildCalendarDays, getPersonTopics, type DayState } from './calendar.js';
import { calculateOverallStreak, type Goal, type LogEntry, type Streak } from './streaks.js';

export type TodayStatus = DayState;

/**
 * A person's single day-state for "today", rolled up across every topic
 * they have. Reuses buildCalendarDays' per-topic day-state logic rather
 * than re-deriving it. When topics disagree, missed wins (it's the one
 * that needs attention), then completed (the best outcome), then excused;
 * a person with nothing scheduled anywhere today falls back to
 * 'not-scheduled'.
 */
export function resolveTodayStatus(
  person: string,
  entries: LogEntry[],
  goals: Goal[],
  today: Date = new Date()
): TodayStatus {
  const topics = getPersonTopics(person, entries, goals);
  const states = topics.map((topic) => {
    const [day] = buildCalendarDays(entries, goals, person, topic, { from: today, to: today });
    return day.state;
  });

  if (states.some((s) => s === 'missed')) return 'missed';
  if (states.some((s) => s === 'completed')) return 'completed';
  if (states.some((s) => s === 'excused')) return 'excused';
  return 'not-scheduled';
}

/**
 * A person's overall streak — any topic touched keeps it alive — for the
 * dashboard card's one headline number. Reuses `calculateOverallStreak`
 * rather than re-deriving it; drilling into a specific topic (the
 * calendar page's topic filter) shows that topic's own streak instead.
 * Returns null when the person has no topics at all (e.g. a freshly
 * onboarded person with no logs or goals yet).
 */
export function getOverallStreak(
  person: string,
  entries: LogEntry[],
  goals: Goal[],
  today: Date = new Date()
): Streak | null {
  const topics = getPersonTopics(person, entries, goals);
  if (topics.length === 0) return null;
  return calculateOverallStreak(entries, goals, person, today);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const ACTIVE_WINDOW_DAYS = 7;

export interface OverviewStats {
  totalPeople: number;
  activePeopleCount: number;
  entriesLoggedToday: number;
  minutesLoggedToday: number;
  bestStreak: (Streak & { person: string }) | null;
}

/**
 * Site-wide numbers for the dashboard's summary strip — every figure is
 * read straight off the log/goal files at build time, nothing live or
 * simulated.
 */
export function computeOverview(
  persons: string[],
  entries: LogEntry[],
  goals: Goal[],
  today: Date = new Date()
): OverviewStats {
  const todayKey = toDateKey(today);
  let entriesLoggedToday = 0;
  let minutesLoggedToday = 0;
  for (const entry of entries) {
    if (toDateKey(entry.date) !== todayKey) continue;
    entriesLoggedToday++;
    if (entry.status === 'completed' && entry.minutes) minutesLoggedToday += entry.minutes;
  }

  const todayUtc = startOfUtcDay(today);
  const activeSince = new Date(todayUtc);
  activeSince.setUTCDate(activeSince.getUTCDate() - (ACTIVE_WINDOW_DAYS - 1));
  const activePeople = new Set<string>();
  for (const entry of entries) {
    const day = startOfUtcDay(entry.date);
    if (day.getTime() >= activeSince.getTime() && day.getTime() <= todayUtc.getTime()) {
      activePeople.add(entry.person);
    }
  }

  let bestStreak: (Streak & { person: string }) | null = null;
  for (const person of persons) {
    const streak = getOverallStreak(person, entries, goals, today);
    if (streak && streak.current > 0 && (!bestStreak || streak.current > bestStreak.current)) {
      bestStreak = { person, ...streak };
    }
  }

  return {
    totalPeople: persons.length,
    activePeopleCount: activePeople.size,
    entriesLoggedToday,
    minutesLoggedToday,
    bestStreak,
  };
}

/**
 * A person's single most recent log entry, of any status — for a "last
 * seen" line on their card. Ignores entries dated after `today` (e.g. an
 * example/template file with a future date) since "most recent" should
 * mean the most recent thing that actually happened.
 */
export function getMostRecentEntry(
  person: string,
  entries: LogEntry[],
  today: Date = new Date()
): LogEntry | null {
  const todayUtc = startOfUtcDay(today);
  let latest: LogEntry | null = null;
  for (const entry of entries) {
    if (entry.person !== person) continue;
    if (startOfUtcDay(entry.date).getTime() > todayUtc.getTime()) continue;
    if (!latest || entry.date.getTime() > latest.date.getTime()) latest = entry;
  }
  return latest;
}

/**
 * The most recent entries across every person, newest first — a real
 * activity feed built from the same markdown files, not a live ticker.
 * Ignores entries dated after `today` for the same reason as
 * `getMostRecentEntry`.
 */
export function buildRecentActivity(
  entries: LogEntry[],
  limit: number,
  today: Date = new Date()
): LogEntry[] {
  const todayUtc = startOfUtcDay(today);
  return entries
    .filter((entry) => startOfUtcDay(entry.date).getTime() <= todayUtc.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
