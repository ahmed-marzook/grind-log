import { describe, expect, it } from 'vitest';
import { reviveGoals, reviveLogEntries, toScriptJson } from './serialize.js';

describe('reviveLogEntries', () => {
  it('turns the ISO date string back into a real Date', () => {
    const [entry] = reviveLogEntries([
      { date: '2026-09-15', person: 'example-person', status: 'completed', topic: 'dsa' },
    ]);
    expect(entry.date).toBeInstanceOf(Date);
    expect(entry.date.toISOString().slice(0, 10)).toBe('2026-09-15');
  });
});

describe('reviveGoals', () => {
  it('revives required and optional date fields', () => {
    const [goal] = reviveGoals([
      {
        person: 'example-person',
        topic: 'dsa',
        title: 'Finish course',
        status: 'in-progress',
        started: '2026-09-01',
        target_date: '2026-10-15',
        updated: '2026-09-15',
      },
    ]);
    expect(goal.started).toBeInstanceOf(Date);
    expect(goal.target_date).toBeInstanceOf(Date);
    expect(goal.updated).toBeInstanceOf(Date);
  });

  it('leaves optional dates undefined when absent', () => {
    const [goal] = reviveGoals([
      { person: 'example-person', topic: 'dsa', title: 'Idea', status: 'idea', updated: '2026-09-15' },
    ]);
    expect(goal.started).toBeUndefined();
    expect(goal.target_date).toBeUndefined();
  });
});

describe('toScriptJson', () => {
  it('escapes </script> so embedded content cannot break out of the tag', () => {
    const json = toScriptJson({ title: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json.replace(/\\u003c/g, '<')).title).toBe(
      '</script><script>alert(1)</script>'
    );
  });
});
