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
