import { describe, expect, it } from 'vitest';
import {
  countBy,
  describeGoalTimeline,
  getGoalActivity,
  groupBy,
  STATUS_ORDER,
  summarizeGoalsByStatus,
  type GoalStatus,
} from './goals.js';
import type { Goal, LogEntry } from './streaks.js';

interface Item {
  status: GoalStatus;
}

describe('groupBy', () => {
  it('buckets items by key, including empty buckets for unused keys', () => {
    const items: Item[] = [{ status: 'in-progress' }, { status: 'achieved' }, { status: 'in-progress' }];
    const grouped = groupBy(items, (i) => i.status, STATUS_ORDER);
    expect(grouped['in-progress']).toHaveLength(2);
    expect(grouped.achieved).toHaveLength(1);
    expect(grouped.pending).toEqual([]);
    expect(grouped.cancelled).toEqual([]);
  });

  it('skips items whose key is outside the given keys, rather than throwing', () => {
    const items: Item[] = [{ status: 'in-progress' }, { status: 'idea' }];
    const grouped = groupBy(items, (i) => i.status, STATUS_ORDER);
    expect(grouped['in-progress']).toHaveLength(1);
    expect(Object.keys(grouped)).not.toContain('idea');
  });
});

describe('countBy', () => {
  it('counts items per key', () => {
    const items: Item[] = [
      { status: 'pending' },
      { status: 'cancelled' },
      { status: 'cancelled' },
    ];
    expect(countBy(items, (i) => i.status, STATUS_ORDER)).toEqual({
      'in-progress': 0,
      pending: 1,
      achieved: 0,
      cancelled: 2,
    });
  });

  it('returns all-zero counts for an empty list', () => {
    expect(countBy([] as Item[], (i) => i.status, STATUS_ORDER)).toEqual({
      'in-progress': 0,
      pending: 0,
      achieved: 0,
      cancelled: 0,
    });
  });
});

describe('summarizeGoalsByStatus', () => {
  it('excludes idea goals from the rollup — they are a future wishlist, not a tracked status', () => {
    const goals: Item[] = [{ status: 'in-progress' }, { status: 'idea' }, { status: 'idea' }];
    expect(summarizeGoalsByStatus(goals)).toBe('1 in progress');
  });

  it('reports no goals yet when every goal is an idea', () => {
    expect(summarizeGoalsByStatus([{ status: 'idea' }])).toBe('no goals yet');
  });
});

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('getGoalActivity', () => {
  const goal: Goal = {
    person: 'p',
    topic: 'dsa',
    title: 'g',
    status: 'in-progress',
    started: d('2026-09-10'),
    updated: d('2026-09-10'),
  };
  const entries: LogEntry[] = [
    { date: d('2026-09-09'), person: 'p', status: 'completed', topic: 'dsa', minutes: 10, title: 'before start' },
    { date: d('2026-09-10'), person: 'p', status: 'completed', topic: 'dsa', minutes: 30, title: 'a' },
    { date: d('2026-09-12'), person: 'p', status: 'completed', topic: 'dsa', minutes: 45, title: 'b' },
    { date: d('2026-09-12'), person: 'p', status: 'completed', topic: 'python', minutes: 20, title: 'other topic' },
    { date: d('2026-09-13'), person: 'p', status: 'excused', reason: 'sick' },
    { date: d('2026-09-12'), person: 'q', status: 'completed', topic: 'dsa', minutes: 99, title: 'other person' },
  ];

  it('counts completed sessions for the goal topic on or after its start', () => {
    expect(getGoalActivity(goal, entries)).toEqual({ sessions: 2, minutes: 75 });
  });

  it('counts all of the topic history when the goal has no start date', () => {
    expect(getGoalActivity({ ...goal, started: undefined }, entries)).toEqual({
      sessions: 3,
      minutes: 85,
    });
  });
});

describe('describeGoalTimeline', () => {
  const today = d('2026-09-30');

  it('shows elapsed days and days left for an open goal', () => {
    expect(
      describeGoalTimeline(
        { status: 'in-progress', started: d('2026-09-01'), target_date: d('2026-10-30') },
        today
      )
    ).toEqual({ label: 'Day 30 · 30 days left', tone: 'neutral' });
  });

  it('flags a target within a week as due soon, and today as due today', () => {
    expect(describeGoalTimeline({ status: 'pending', target_date: d('2026-10-01') }, today)).toEqual({
      label: '1 day left',
      tone: 'soon',
    });
    expect(describeGoalTimeline({ status: 'pending', target_date: today }, today)).toEqual({
      label: 'Due today',
      tone: 'soon',
    });
  });

  it('flags a passed target on an open goal as overdue', () => {
    expect(
      describeGoalTimeline({ status: 'in-progress', target_date: d('2026-09-25') }, today)
    ).toEqual({ label: '5 days overdue', tone: 'overdue' });
  });

  it('says nothing for finished goals or goals without dates', () => {
    expect(
      describeGoalTimeline({ status: 'achieved', target_date: d('2026-09-01') }, today)
    ).toBeNull();
    expect(describeGoalTimeline({ status: 'in-progress' }, today)).toBeNull();
  });
});
