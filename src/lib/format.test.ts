import { describe, expect, it } from 'vitest';
import { formatRelativeDay } from './format.js';

const TODAY = new Date('2026-09-15T18:00:00.000Z');

describe('formatRelativeDay', () => {
  it('labels the same UTC day as today, regardless of time-of-day', () => {
    expect(formatRelativeDay(new Date('2026-09-15T00:00:00.000Z'), TODAY)).toBe('today');
  });

  it('labels the previous day as yesterday', () => {
    expect(formatRelativeDay(new Date('2026-09-14T00:00:00.000Z'), TODAY)).toBe('yesterday');
  });

  it('labels earlier days with a day count', () => {
    expect(formatRelativeDay(new Date('2026-09-10T00:00:00.000Z'), TODAY)).toBe('5 days ago');
  });
});
