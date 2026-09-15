import { describe, expect, it } from 'vitest';
import { countBy, groupBy, STATUS_ORDER, type GoalStatus } from './goals.js';

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
