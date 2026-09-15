export type DayAbbrev = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface LogEntry {
  date: Date;
  person: string;
  status: 'completed' | 'excused';
  topic?: string;
  reason?: string;
  minutes?: number;
  title?: string;
  tags?: string[];
}

export interface Goal {
  person: string;
  topic: string;
  title: string;
  status: 'pending' | 'in-progress' | 'achieved' | 'cancelled';
  scheduled_days?: DayAbbrev[];
  started?: Date;
  target_date?: Date;
  updated: Date;
}

export interface Streak {
  current: number;
  longest: number;
}

const ALL_DAYS: DayAbbrev[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_INDEX_TO_ABBREV: DayAbbrev[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Resolves which days count toward a person+topic's streak, from that
 * topic's in-progress goal. Falls back to "every day counts" when there's
 * no matching goal or the goal doesn't declare scheduled_days — never a
 * hardcoded default pattern.
 */
export function getScheduledDays(person: string, topic: string, goals: Goal[]): DayAbbrev[] {
  const goal = goals.find(
    (g) => g.person === person && g.topic === topic && g.status === 'in-progress'
  );
  if (goal?.scheduled_days && goal.scheduled_days.length > 0) {
    return goal.scheduled_days;
  }
  return ALL_DAYS;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayAbbrev(date: Date): DayAbbrev {
  return DAY_INDEX_TO_ABBREV[date.getUTCDay()];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function calculateStreak(
  entries: LogEntry[],
  goals: Goal[],
  person: string,
  topic: string,
  today: Date = new Date()
): Streak {
  const scheduledDays = new Set(getScheduledDays(person, topic, goals));

  // A completed entry only counts toward its own topic's streak. An
  // excused entry has no topic (you did no studying that day at all), so
  // it counts as covering whichever topic's streak is being asked about.
  const coveredDates = new Set<string>();
  for (const entry of entries) {
    if (entry.person !== person) continue;
    if (entry.status === 'completed' && entry.topic !== topic) continue;
    coveredDates.add(toDateKey(entry.date));
  }

  if (coveredDates.size === 0) {
    return { current: 0, longest: 0 };
  }

  const todayUtc = startOfUtcDay(today);
  const earliest = Array.from(coveredDates).reduce((min, key) => {
    const d = startOfUtcDay(new Date(`${key}T00:00:00.000Z`));
    return d.getTime() < min.getTime() ? d : min;
  }, todayUtc);

  // Build the chronological sequence of scheduled-day outcomes (true =
  // covered by a completed/excused entry, false = missed). Days that
  // aren't scheduled are skipped entirely — they neither count nor break
  // a streak.
  const scheduledOutcomes: boolean[] = [];
  const cursor = new Date(earliest);
  while (cursor.getTime() <= todayUtc.getTime()) {
    if (scheduledDays.has(dayAbbrev(cursor))) {
      scheduledOutcomes.push(coveredDates.has(toDateKey(cursor)));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  let longest = 0;
  let running = 0;
  for (const outcome of scheduledOutcomes) {
    running = outcome ? running + 1 : 0;
    if (running > longest) longest = running;
  }

  let current = 0;
  for (let i = scheduledOutcomes.length - 1; i >= 0; i--) {
    if (!scheduledOutcomes[i]) break;
    current++;
  }

  return { current, longest };
}
