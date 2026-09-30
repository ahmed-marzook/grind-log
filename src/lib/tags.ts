import type { LogEntry } from './streaks.js';

export interface TagCount {
  tag: string;
  count: number;
}

/**
 * Every tag a set of log entries uses, with how many entries carry it —
 * most-used first, ties alphabetical. Tags are free strings like topics,
 * so this is always derived from the entries, never a fixed list.
 */
export function getTagCounts(entries: Pick<LogEntry, 'tags'>[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    // A tag repeated within one entry still counts that entry once.
    for (const tag of new Set(entry.tags ?? [])) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
