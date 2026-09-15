import { describe, expect, it } from 'vitest';
import { newLogEntryUrl, onboardingGuideUrl, personGoalsUrl, personLogsUrl } from './github.js';

describe('github link builders', () => {
  it('points at a person\'s logs folder on the main branch', () => {
    expect(personLogsUrl('ahmed-marzook')).toBe(
      'https://github.com/ahmed-marzook/grind-log/tree/main/src/content/logs/ahmed-marzook'
    );
  });

  it('points at a person\'s goals folder on the main branch', () => {
    expect(personGoalsUrl('ahmed-marzook')).toBe(
      'https://github.com/ahmed-marzook/grind-log/tree/main/src/content/goals/ahmed-marzook'
    );
  });

  it('links to the onboarding section of CLAUDE.md', () => {
    expect(onboardingGuideUrl()).toBe(
      'https://github.com/ahmed-marzook/grind-log/blob/main/CLAUDE.md#onboarding-a-new-person'
    );
  });

  it('builds a prefilled new-file URL with the date as filename', () => {
    const url = newLogEntryUrl('ahmed-marzook', new Date('2026-09-15T12:00:00.000Z'));
    expect(url).toContain('/new/main/src/content/logs/ahmed-marzook?');
    expect(url).toContain('filename=2026-09-15.md');

    const params = new URL(url).searchParams;
    expect(params.get('filename')).toBe('2026-09-15.md');
    expect(params.get('value')).toContain('date: 2026-09-15');
    expect(params.get('value')).toContain('person: ahmed-marzook');
  });
});
