import { describe, expect, it } from 'vitest';
import { getTagCounts } from './tags.js';

describe('getTagCounts', () => {
  it('counts entries per tag, most-used first then alphabetical', () => {
    expect(
      getTagCounts([
        { tags: ['shaky', 'review'] },
        { tags: ['shaky'] },
        { tags: ['aha'] },
        {},
      ])
    ).toEqual([
      { tag: 'shaky', count: 2 },
      { tag: 'aha', count: 1 },
      { tag: 'review', count: 1 },
    ]);
  });

  it('counts a tag repeated within one entry once', () => {
    expect(getTagCounts([{ tags: ['shaky', 'shaky'] }])).toEqual([{ tag: 'shaky', count: 1 }]);
  });

  it('returns nothing for entries without tags', () => {
    expect(getTagCounts([{}, { tags: [] }])).toEqual([]);
  });
});
