import { describe, expect, it } from 'vitest';
import { summarizeMinutes } from './minutes.js';
import type { LogEntry } from './streaks.js';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const done = (date: string, topic: string, minutes: number, person = 'p'): LogEntry => ({
  date: d(date),
  person,
  status: 'completed',
  topic,
  minutes,
  title: 't',
});

describe('summarizeMinutes', () => {
  const today = d('2026-09-30');

  it('totals all-time, last 7 days and last 30 days, with per-topic breakdown', () => {
    const entries: LogEntry[] = [
      done('2026-09-30', 'dsa', 30), // today
      done('2026-09-24', 'dsa', 20), // 6 days ago — inside 7
      done('2026-09-23', 'python', 45), // 7 days ago — outside 7, inside 30
      done('2026-08-01', 'python', 60), // outside 30
      { date: d('2026-09-29'), person: 'p', status: 'excused', reason: 'sick' },
      done('2026-09-30', 'dsa', 999, 'someone-else'),
    ];
    const summary = summarizeMinutes(entries, 'p', today);
    expect(summary.total).toBe(155);
    expect(summary.last7).toBe(50);
    expect(summary.last30).toBe(95);
    expect(summary.sessions).toBe(4);
    expect(summary.byTopic).toEqual([
      { topic: 'python', minutes: 105, sessions: 2 },
      { topic: 'dsa', minutes: 50, sessions: 2 },
    ]);
  });

  it('handles a person with no entries', () => {
    expect(summarizeMinutes([], 'p', today)).toEqual({
      total: 0,
      last7: 0,
      last30: 0,
      sessions: 0,
      byTopic: [],
    });
  });
});
