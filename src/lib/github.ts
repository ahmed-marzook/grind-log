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

/**
 * A GitHub "create new file" URL prefilled with a starter log entry, via
 * the `filename`/`value` query params GitHub's web editor reads for
 * /new/<branch>/<dir> links. Logging a session becomes "open link, fill
 * in topic/minutes/title, commit" — no local git clone required.
 */
export function newLogEntryUrl(person: string, today: Date): string {
  const dateKey = today.toISOString().slice(0, 10);
  const template = `---\ndate: ${dateKey}\nperson: ${person}\nstatus: completed\ntopic: \nminutes: \ntitle: ""\n---\n\n<!-- optional: a short note on what you learned or anything else worth remembering -->\n`;
  const params = new URLSearchParams({ filename: `${dateKey}.md`, value: template });
  return `${REPO_URL}/new/${BRANCH}/src/content/logs/${person}?${params.toString()}`;
}
