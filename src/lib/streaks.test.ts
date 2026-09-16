import { describe, expect, it } from 'vitest';
import { calculateStreak, getScheduledDays, type Goal, type LogEntry } from './streaks.js';

// Wednesday, matching the mon-fri schedule used below.
const TODAY = new Date('2026-09-16T12:00:00.000Z');

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

describe('getScheduledDays', () => {
  it('reads scheduled_days from the matching in-progress goal', () => {
    const goals = [goal({ scheduled_days: ['mon', 'wed', 'fri'] })];
    expect(getScheduledDays('ahmed', 'dsa', goals)).toEqual(['mon', 'wed', 'fri']);
  });

  it('falls back to every day when there is no matching goal', () => {
    expect(getScheduledDays('ahmed', 'system-design', [])).toEqual([
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    ]);
  });

  it('falls back to every day when the goal has no scheduled_days', () => {
    const goals = [goal({ scheduled_days: undefined })];
    expect(getScheduledDays('ahmed', 'dsa', goals)).toEqual([
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    ]);
  });
});

describe('calculateStreak', () => {
  it('does not break the streak on an excused day mid-streak', () => {
    // mon-fri schedule: 09-10 mon .. 09-16 wed (today)
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries: LogEntry[] = [
      entry('2026-09-10'), // mon - completed
      entry('2026-09-11', { status: 'excused', topic: undefined, reason: 'sick' }), // tue - excused
      entry('2026-09-14'), // mon
      entry('2026-09-15'), // tue
      entry('2026-09-16'), // wed - today
    ];

    const result = calculateStreak(entries, goals, 'ahmed', 'dsa', TODAY);
    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
  });

  it('breaks the streak on a genuinely missed scheduled day', () => {
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries: LogEntry[] = [
      entry('2026-09-10'), // mon
      // tue 09-11 missed entirely
      entry('2026-09-14'), // mon
      entry('2026-09-15'), // tue
      entry('2026-09-16'), // wed - today
    ];

    const result = calculateStreak(entries, goals, 'ahmed', 'dsa', TODAY);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('treats every day as scheduled when the goal has no scheduled_days', () => {
    const goals = [goal({ scheduled_days: undefined })];
    const entries: LogEntry[] = [
      entry('2026-09-12'), // sat - would not count under a weekday-only schedule
      entry('2026-09-13'), // sun
      entry('2026-09-14'), // mon
      entry('2026-09-15'), // tue
      entry('2026-09-16'), // wed - today
    ];

    const result = calculateStreak(entries, goals, 'ahmed', 'dsa', TODAY);
    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
  });

  it('keeps two topics for the same person on independent schedules and histories', () => {
    const goals = [
      goal({ topic: 'dsa', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
      goal({ topic: 'system-design', scheduled_days: ['sat', 'sun'] }),
    ];
    const entries: LogEntry[] = [
      entry('2026-09-14', { topic: 'dsa' }),
      entry('2026-09-15', { topic: 'dsa' }),
      entry('2026-09-16', { topic: 'dsa' }), // today, weekday streak intact
      entry('2026-09-12', { topic: 'system-design' }), // sat
      // sun 09-13 missed for system-design
    ];

    const dsa = calculateStreak(entries, goals, 'ahmed', 'dsa', TODAY);
    const systemDesign = calculateStreak(entries, goals, 'ahmed', 'system-design', TODAY);

    expect(dsa.current).toBe(3);
    expect(systemDesign.current).toBe(0);
    expect(systemDesign.longest).toBe(1);
  });

  it('tracks two topics logged on the same date independently', () => {
    // Same person, same day, two separate entry files — one per topic —
    // both scheduled every day of the week.
    const goals = [goal({ topic: 'dsa' }), goal({ topic: 'python' })];
    const entries: LogEntry[] = [
      entry('2026-09-15', { topic: 'dsa' }),
      entry('2026-09-15', { topic: 'python', title: 'list comprehensions' }),
      entry('2026-09-16', { topic: 'dsa' }),
      // python missed on 09-16 (today) — should not affect dsa's streak
    ];

    const dsa = calculateStreak(entries, goals, 'ahmed', 'dsa', TODAY);
    const python = calculateStreak(entries, goals, 'ahmed', 'python', TODAY);

    expect(dsa.current).toBe(2);
    expect(python.current).toBe(0); // missed today, so the streak is broken
    expect(python.longest).toBe(1);
  });
});
