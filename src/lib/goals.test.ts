import { describe, expect, it } from 'vitest';
import { countBy, groupBy, STATUS_ORDER, summarizeGoalsByStatus, type GoalStatus } from './goals.js';

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
