import { describe, expect, it } from 'vitest';
import { getBestCurrentStreak, resolveTodayStatus } from './dashboard.js';
import type { Goal, LogEntry } from './streaks.js';

const TODAY = new Date('2026-09-16T12:00:00.000Z'); // Wednesday

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

describe('resolveTodayStatus', () => {
  it('reports completed when today is done for a scheduled topic', () => {
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries = [entry('2026-09-16')];
    expect(resolveTodayStatus('ahmed', entries, goals, TODAY)).toBe('completed');
  });

  it('prefers missed over completed when topics disagree', () => {
    const goals = [
      goal({ topic: 'dsa', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
      goal({ topic: 'system-design', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
    ];
    const entries = [entry('2026-09-16', { topic: 'dsa' })]; // system-design left unlogged today
    expect(resolveTodayStatus('ahmed', entries, goals, TODAY)).toBe('missed');
  });

  it('reports excused when the only activity today is an excused entry', () => {
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries = [entry('2026-09-16', { status: 'excused', topic: undefined, reason: 'sick' })];
    expect(resolveTodayStatus('ahmed', entries, goals, TODAY)).toBe('excused');
  });

  it('reports not-scheduled when no topic is scheduled for today', () => {
    const goals = [goal({ scheduled_days: ['sat', 'sun'] })];
    expect(resolveTodayStatus('ahmed', [], goals, TODAY)).toBe('not-scheduled');
  });

  it('reports not-scheduled for a person with no logs or goals at all', () => {
    expect(resolveTodayStatus('nobody', [], [], TODAY)).toBe('not-scheduled');
  });
});

describe('getBestCurrentStreak', () => {
  it('returns the longest-running current streak across topics', () => {
    const goals = [
      goal({ topic: 'dsa', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
      goal({ topic: 'system-design', scheduled_days: ['sat', 'sun'] }),
    ];
    const entries = [
      entry('2026-09-14', { topic: 'dsa' }),
      entry('2026-09-15', { topic: 'dsa' }),
      entry('2026-09-16', { topic: 'dsa' }), // 3-day dsa streak, today
      entry('2026-09-12', { topic: 'system-design' }), // sat only, 1-day streak, broken by missed sun
    ];

    const best = getBestCurrentStreak('ahmed', entries, goals, TODAY);
    expect(best).toEqual({ topic: 'dsa', current: 3, longest: 3 });
  });

  it('returns null for a person with no topics yet', () => {
    expect(getBestCurrentStreak('nobody', [], [], TODAY)).toBeNull();
  });
});
