import { describe, expect, it } from 'vitest';
import { getAllPersons } from './people.js';

describe('getAllPersons', () => {
  it('merges and dedupes persons across multiple sources, sorted', () => {
    const logs = [{ person: 'ahmed' }, { person: 'example-person' }];
    const goals = [{ person: 'ahmed' }, { person: 'zoe' }];
    expect(getAllPersons(logs, goals)).toEqual(['ahmed', 'example-person', 'zoe']);
  });

  it('returns an empty list when there are no sources with entries', () => {
    expect(getAllPersons([], [])).toEqual([]);
  });
});
