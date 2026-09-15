import type { Goal } from './streaks.js';

export type GoalStatus = Goal['status'];

/**
 * Canonical display order for the four goal statuses. This is a fixed
 * property of the schema's own enum, not a per-person or per-topic
 * schedule — it never varies with the data, unlike topics or scheduled
 * days.
 */
export const STATUS_ORDER: readonly GoalStatus[] = [
  'in-progress',
  'pending',
  'achieved',
  'cancelled',
];

export function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
  keys: readonly K[]
): Record<K, T[]> {
  const grouped = Object.fromEntries(keys.map((key) => [key, [] as T[]])) as Record<K, T[]>;
  for (const item of items) {
    grouped[keyFn(item)].push(item);
  }
  return grouped;
}

export function countBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
  keys: readonly K[]
): Record<K, number> {
  const grouped = groupBy(items, keyFn, keys);
  return Object.fromEntries(keys.map((key) => [key, grouped[key].length])) as Record<K, number>;
}

const STATUS_SUMMARY_LABEL: Record<GoalStatus, string> = {
  'in-progress': 'in progress',
  pending: 'pending',
  achieved: 'achieved',
  cancelled: 'cancelled',
};

/**
 * A one-line "2 in progress, 1 achieved" rollup of a person's goals by
 * status. Shared by stats.astro's per-person rollup and the dashboard
 * card on index.astro so the aggregation lives in one place.
 */
export function summarizeGoalsByStatus(goals: { status: GoalStatus }[]): string {
  const counts = countBy(goals, (g) => g.status, STATUS_ORDER);
  const parts = STATUS_ORDER.filter((status) => counts[status] > 0).map(
    (status) => `${counts[status]} ${STATUS_SUMMARY_LABEL[status]}`
  );
  return parts.length > 0 ? parts.join(', ') : 'no goals yet';
}
