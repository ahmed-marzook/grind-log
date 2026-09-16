import { describe, expect, it } from 'vitest';
import {
  buildGoalEntryUrl,
  buildLogEntryFilename,
  buildLogEntryUrl,
  onboardingGuideUrl,
  personGoalsUrl,
  personLogsUrl,
} from './github.js';

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
});

describe('buildLogEntryFilename', () => {
  it('suffixes the date with a slugified topic for completed entries', () => {
    expect(buildLogEntryFilename('2026-09-16', 'completed', 'DSA Patterns')).toBe(
      '2026-09-16-dsa-patterns.md'
    );
  });

  it('uses a fixed excused suffix regardless of topic', () => {
    expect(buildLogEntryFilename('2026-09-16', 'excused')).toBe('2026-09-16-excused.md');
  });
});

describe('buildLogEntryUrl', () => {
  it('builds a prefilled new-file URL for a completed entry', () => {
    const url = buildLogEntryUrl({
      person: 'ahmed-marzook',
      date: '2026-09-16',
      status: 'completed',
      topic: 'python',
      title: 'List comprehensions',
      minutes: 20,
      notes: 'Went well.',
    });

    expect(url).toContain('/new/main/src/content/logs/ahmed-marzook?');
    const params = new URL(url).searchParams;
    expect(params.get('filename')).toBe('2026-09-16-python.md');

    const value = params.get('value')!;
    expect(value).toContain('date: 2026-09-16');
    expect(value).toContain('person: ahmed-marzook');
    expect(value).toContain('status: completed');
    expect(value).toContain('topic: "python"');
    expect(value).toContain('minutes: 20');
    expect(value).toContain('title: "List comprehensions"');
    expect(value.trim().endsWith('Went well.')).toBe(true);
  });

  it('builds a prefilled new-file URL for an excused entry, with no topic field', () => {
    const url = buildLogEntryUrl({
      person: 'ahmed-marzook',
      date: '2026-09-16',
      status: 'excused',
      reason: 'Travel day — no laptop access',
    });

    const params = new URL(url).searchParams;
    expect(params.get('filename')).toBe('2026-09-16-excused.md');

    const value = params.get('value')!;
    expect(value).toContain('status: excused');
    expect(value).toContain('reason: "Travel day — no laptop access"');
    expect(value).not.toContain('topic:');
  });

  it('escapes embedded quotes in free-text fields as a valid YAML double-quoted scalar', () => {
    const url = buildLogEntryUrl({
      person: 'ahmed-marzook',
      date: '2026-09-16',
      status: 'completed',
      topic: 'dsa',
      title: 'Two Pointers: "Container With Most Water"',
      minutes: 30,
    });

    const value = new URL(url).searchParams.get('value')!;
    expect(value).toContain('title: "Two Pointers: \\"Container With Most Water\\""');
  });
});

describe('buildGoalEntryUrl', () => {
  it('builds a prefilled starter-goal new-file URL', () => {
    const url = buildGoalEntryUrl({
      person: 'jane-doe',
      topic: 'System Design',
      title: 'Learn system design basics',
      updated: '2026-09-16',
    });

    expect(url).toContain('/new/main/src/content/goals/jane-doe?');
    const params = new URL(url).searchParams;
    expect(params.get('filename')).toBe('system-design.md');

    const value = params.get('value')!;
    expect(value).toContain('person: jane-doe');
    expect(value).toContain('topic: "System Design"');
    expect(value).toContain('title: "Learn system design basics"');
    expect(value).toContain('status: pending');
    expect(value).toContain('updated: 2026-09-16');
  });
});
