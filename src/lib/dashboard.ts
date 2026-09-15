import { buildCalendarDays, getPersonTopics, type DayState } from './calendar.js';
import { calculateStreak, type Goal, type LogEntry } from './streaks.js';

export type TodayStatus = DayState;

export interface StreakSummary {
  topic: string;
  current: number;
  longest: number;
}

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
 * The longest-running current streak across a person's topics — a
 * dashboard card shows one headline number, not every topic's streak.
 * Returns null when the person has no topics at all (e.g. a freshly
 * onboarded person with no logs or goals yet).
 */
export function getBestCurrentStreak(
  person: string,
  entries: LogEntry[],
  goals: Goal[],
  today: Date = new Date()
): StreakSummary | null {
  const topics = getPersonTopics(person, entries, goals);
  let best: StreakSummary | null = null;
  for (const topic of topics) {
    const streak = calculateStreak(entries, goals, person, topic, today);
    if (!best || streak.current > best.current) {
      best = { topic, ...streak };
    }
  }
  return best;
}
