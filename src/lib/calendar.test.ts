import { describe, expect, it } from 'vitest';
import {
  buildCalendarDays,
  formatDayTooltip,
  getPersonTopics,
  levelForMinutes,
  padCalendarDaysForGrid,
  type CalendarDay,
} from './calendar.js';
import type { Goal, LogEntry } from './streaks.js';

function entry(date: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    date: new Date(`${date}T00:00:00.000Z`),
    person: 'ahmed',
    status: 'completed',
    topic: 'dsa',
    minutes: 30,
    title: 'session',
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    person: 'ahmed',
    topic: 'dsa',
    title: 'goal',
    status: 'in-progress',
    updated: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('getPersonTopics', () => {
  it('collects topics from both logs and goals, deduplicated and sorted', () => {
    const entries = [entry('2026-09-01', { topic: 'dsa' }), entry('2026-09-02', { topic: 'system-design' })];
    const goals = [goal({ topic: 'dsa' }), goal({ topic: 'claude-cert', status: 'pending' })];
    expect(getPersonTopics('ahmed', entries, goals)).toEqual(['claude-cert', 'dsa', 'system-design']);
  });

  it('never returns another person topics', () => {
    const entries = [entry('2026-09-01', { person: 'someone-else', topic: 'other' })];
    expect(getPersonTopics('ahmed', entries, [])).toEqual([]);
  });
});

describe('buildCalendarDays', () => {
  it('marks the four states correctly across a mon-fri schedule', () => {
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries: LogEntry[] = [
      entry('2026-09-14', { minutes: 40, title: 'Trie' }), // mon - completed
      entry('2026-09-16', { status: 'excused', topic: undefined, reason: 'sick' }), // wed - excused
      // 2026-09-15 (tue) intentionally missed
    ];

    const days = buildCalendarDays(entries, goals, 'ahmed', 'dsa', {
      from: new Date('2026-09-12T00:00:00.000Z'), // sat
      to: new Date('2026-09-16T00:00:00.000Z'), // wed
    });

    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate['2026-09-12'].state).toBe('not-scheduled'); // sat
    expect(byDate['2026-09-13'].state).toBe('not-scheduled'); // sun
    expect(byDate['2026-09-14'].state).toBe('completed');
    expect(byDate['2026-09-14'].minutes).toBe(40);
    expect(byDate['2026-09-15'].state).toBe('missed');
    expect(byDate['2026-09-16'].state).toBe('excused');
    expect(byDate['2026-09-16'].reason).toBe('sick');
  });
});

describe('levelForMinutes', () => {
  it('buckets minutes into four intensity levels', () => {
    expect(levelForMinutes(undefined)).toBe(1);
    expect(levelForMinutes(10)).toBe(1);
    expect(levelForMinutes(20)).toBe(2);
    expect(levelForMinutes(40)).toBe(3);
    expect(levelForMinutes(60)).toBe(4);
  });
});

describe('formatDayTooltip', () => {
  const base: CalendarDay = { date: '2026-09-14', state: 'completed' };

  it('describes a completed day with title and minutes', () => {
    expect(formatDayTooltip({ ...base, title: 'Trie', minutes: 40 })).toBe(
      '2026-09-14: Trie (40 min)'
    );
  });

  it('describes an excused day with its reason', () => {
    expect(formatDayTooltip({ ...base, state: 'excused', reason: 'sick' })).toBe(
      '2026-09-14: Excused — sick'
    );
  });

  it('describes a missed day', () => {
    expect(formatDayTooltip({ ...base, state: 'missed' })).toBe('2026-09-14: Missed');
  });

  it('describes a not-scheduled day', () => {
    expect(formatDayTooltip({ ...base, state: 'not-scheduled' })).toBe(
      '2026-09-14: Not scheduled'
    );
  });
});

describe('padCalendarDaysForGrid', () => {
  it('pads the front so the first day lands in its weekday column', () => {
    // 2026-09-16 is a Wednesday (weekday index 3)
    const days: CalendarDay[] = [{ date: '2026-09-16', state: 'missed' }];
    const padded = padCalendarDaysForGrid(days);
    expect(padded).toEqual([null, null, null, days[0]]);
  });

  it('returns an empty array for no days', () => {
    expect(padCalendarDaysForGrid([])).toEqual([]);
  });
});
