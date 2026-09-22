import { describe, expect, it } from 'vitest';
import {
  buildRecentActivity,
  computeOverview,
  getMostRecentEntry,
  getOverallStreak,
  resolveTodayStatus,
} from './dashboard.js';
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

  it('reports completed when multiple topics are each logged today', () => {
    const goals = [
      goal({ topic: 'dsa', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
      goal({ topic: 'python', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
    ];
    const entries = [
      entry('2026-09-16', { topic: 'dsa' }),
      entry('2026-09-16', { topic: 'python', title: 'decorators' }),
    ];
    expect(resolveTodayStatus('ahmed', entries, goals, TODAY)).toBe('completed');
  });

  it('reports not-scheduled when no topic is scheduled for today', () => {
    const goals = [goal({ scheduled_days: ['sat', 'sun'] })];
    expect(resolveTodayStatus('ahmed', [], goals, TODAY)).toBe('not-scheduled');
  });

  it('reports not-scheduled for a person with no logs or goals at all', () => {
    expect(resolveTodayStatus('nobody', [], [], TODAY)).toBe('not-scheduled');
  });
});

describe('getOverallStreak', () => {
  it('counts any topic touched toward the one overall streak', () => {
    const goals = [
      goal({ topic: 'dsa', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
      goal({ topic: 'system-design', scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] }),
    ];
    const entries = [
      entry('2026-09-14', { topic: 'dsa' }),
      entry('2026-09-15', { topic: 'system-design' }), // different topic, still keeps it alive
      entry('2026-09-16', { topic: 'dsa' }), // today
    ];

    expect(getOverallStreak('ahmed', entries, goals, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('returns null for a person with no topics yet', () => {
    expect(getOverallStreak('nobody', [], [], TODAY)).toBeNull();
  });
});

describe('computeOverview', () => {
  it('totals entries/minutes logged today and finds the best active streak', () => {
    const goals = [goal({ scheduled_days: ['mon', 'tue', 'wed', 'thu', 'fri'] })];
    const entries = [
      entry('2026-09-16', { person: 'ahmed', minutes: 30 }), // today
      entry('2026-09-16', { person: 'bea', minutes: 20 }), // today
      entry('2026-09-15', { person: 'ahmed', minutes: 40 }), // yesterday, not counted today
      entry('2026-09-14', { person: 'ahmed' }),
    ];

    const overview = computeOverview(['ahmed', 'bea', 'carl'], entries, goals, TODAY);
    expect(overview.totalPeople).toBe(3);
    expect(overview.entriesLoggedToday).toBe(2);
    expect(overview.minutesLoggedToday).toBe(50);
    expect(overview.activePeopleCount).toBe(2); // ahmed + bea within the last 7 days, not carl
    expect(overview.bestStreak).toEqual({ person: 'ahmed', current: 3, longest: 3 });
  });

  it('reports no best streak when nobody has an active one', () => {
    const overview = computeOverview(['ahmed'], [], [], TODAY);
    expect(overview.bestStreak).toBeNull();
  });
});

describe('getMostRecentEntry', () => {
  it('returns the latest entry for a person regardless of status', () => {
    const entries = [
      entry('2026-09-10'),
      entry('2026-09-14', { status: 'excused', topic: undefined, reason: 'sick' }),
      entry('2026-09-12'),
    ];
    expect(getMostRecentEntry('ahmed', entries, TODAY)?.date.toISOString().slice(0, 10)).toBe(
      '2026-09-14'
    );
  });

  it('ignores a future-dated entry (e.g. an example/template file)', () => {
    const entries = [entry('2026-09-12'), entry('2026-09-20')];
    expect(getMostRecentEntry('ahmed', entries, TODAY)?.date.toISOString().slice(0, 10)).toBe(
      '2026-09-12'
    );
  });

  it('returns null for a person with no entries', () => {
    expect(getMostRecentEntry('nobody', [], TODAY)).toBeNull();
  });
});

describe('buildRecentActivity', () => {
  it('sorts entries newest first and applies the limit', () => {
    const entries = [entry('2026-09-10'), entry('2026-09-14'), entry('2026-09-12')];
    const activity = buildRecentActivity(entries, 2, TODAY);
    expect(activity.map((e) => e.date.toISOString().slice(0, 10))).toEqual([
      '2026-09-14',
      '2026-09-12',
    ]);
  });

  it('excludes future-dated entries from the feed', () => {
    const entries = [entry('2026-09-12'), entry('2026-09-20')];
    const activity = buildRecentActivity(entries, 5, TODAY);
    expect(activity.map((e) => e.date.toISOString().slice(0, 10))).toEqual(['2026-09-12']);
  });
});
