/**
 * Links back to the source-of-truth repo. There's no login and no app —
 * every entry is a markdown file committed here, so "how do I log a
 * session" and "how do I onboard" both resolve to a GitHub URL rather
 * than any in-app form.
 */
const REPO = 'ahmed-marzook/grind-log';
const BRANCH = 'main';

export const REPO_URL = `https://github.com/${REPO}`;

export function personLogsUrl(person: string): string {
  return `${REPO_URL}/tree/${BRANCH}/src/content/logs/${person}`;
}

export function personGoalsUrl(person: string): string {
  return `${REPO_URL}/tree/${BRANCH}/src/content/goals/${person}`;
}

export function onboardingGuideUrl(): string {
  return `${REPO_URL}/blob/${BRANCH}/CLAUDE.md#onboarding-a-new-person`;
}

export type LogStatus = 'completed' | 'excused';

export interface LogEntryInput {
  person: string;
  date: string; // YYYY-MM-DD
  status: LogStatus;
  topic?: string;
  title?: string;
  minutes?: number;
  reason?: string;
  notes?: string;
}

/** Lowercase, hyphenated — matches the person-slug convention (CLAUDE.md). */
function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'session'
  );
}

/** A valid double-quoted YAML scalar — JSON's escaping rules are a subset of YAML's. */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Filename for a log entry. A day with more than one topic needs one file
 * per topic (see CLAUDE.md's logs collection notes), so completed entries
 * are always suffixed with their (slugified) topic rather than just the
 * date — that keeps two topics logged the same day from colliding, and is
 * a no-op cost on days with only one topic.
 */
export function buildLogEntryFilename(date: string, status: LogStatus, topic?: string): string {
  if (status === 'excused') return `${date}-excused.md`;
  return `${date}-${slugify(topic ?? '')}.md`;
}

/** The markdown file body (frontmatter + optional journal note) for a log entry. */
export function buildLogEntryContent(input: LogEntryInput): string {
  const lines = ['---', `date: ${input.date}`, `person: ${input.person}`, `status: ${input.status}`];
  if (input.status === 'completed') {
    lines.push(`topic: ${yamlString(input.topic ?? '')}`);
    lines.push(`minutes: ${input.minutes ?? ''}`);
    lines.push(`title: ${yamlString(input.title ?? '')}`);
  } else {
    lines.push(`reason: ${yamlString(input.reason ?? '')}`);
  }
  lines.push('---', '');
  if (input.notes?.trim()) lines.push(input.notes.trim());
  return `${lines.join('\n')}\n`;
}

/**
 * A GitHub "create new file" URL prefilled with a log entry, via the
 * `filename`/`value` query params GitHub's web editor reads for
 * /new/<branch>/<dir> links. Logging a session becomes "fill in the form,
 * open the link, commit" — no local git clone required.
 */
export function buildLogEntryUrl(input: LogEntryInput): string {
  const filename = buildLogEntryFilename(input.date, input.status, input.topic);
  const content = buildLogEntryContent(input);
  const params = new URLSearchParams({ filename, value: content });
  return `${REPO_URL}/new/${BRANCH}/src/content/logs/${input.person}?${params.toString()}`;
}

export type GoalEntryStatus = 'pending' | 'in-progress' | 'achieved' | 'cancelled' | 'idea';
export type GoalEntryDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface GoalEntryInput {
  person: string;
  topic: string;
  title: string;
  status?: GoalEntryStatus; // defaults to 'pending'
  scheduledDays?: GoalEntryDay[];
  started?: string; // YYYY-MM-DD
  targetDate?: string; // YYYY-MM-DD
  notes?: string;
  updated: string; // YYYY-MM-DD
}

/** The markdown file body (frontmatter) for a goal file, any status. */
export function buildGoalEntryContent(input: GoalEntryInput): string {
  const lines = [
    '---',
    `person: ${input.person}`,
    `topic: ${yamlString(input.topic)}`,
    `title: ${yamlString(input.title)}`,
    `status: ${input.status ?? 'pending'}`,
  ];
  if (input.scheduledDays && input.scheduledDays.length > 0) {
    lines.push(`scheduled_days: [${input.scheduledDays.map((d) => `"${d}"`).join(',')}]`);
  }
  if (input.started) lines.push(`started: ${input.started}`);
  if (input.targetDate) lines.push(`target_date: ${input.targetDate}`);
  lines.push(`updated: ${input.updated}`, '---', '');
  lines.push(
    input.notes?.trim() ||
      '<!-- why this goal, what "done" looks like — a schedule can come later -->'
  );
  lines.push('');
  return lines.join('\n');
}

/**
 * A GitHub "create new file" URL prefilled with a goal — covers every
 * status a goal file can hold (including an `idea` future-wishlist entry,
 * not just the onboarding starter `pending` goal), plus the optional
 * schedule/date fields.
 */
export function buildGoalEntryUrl(input: GoalEntryInput): string {
  const filename = `${slugify(input.topic)}.md`;
  const content = buildGoalEntryContent(input);
  const params = new URLSearchParams({ filename, value: content });
  return `${REPO_URL}/new/${BRANCH}/src/content/goals/${input.person}?${params.toString()}`;
}
