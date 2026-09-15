const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Coarse relative-day label ("today", "3 days ago") for a log entry's
 * date. Entries carry a date only, no time-of-day, and this is a
 * statically-built site — so this is relative to build time, not a live
 * clock.
 */
export function formatRelativeDay(date: Date, today: Date = new Date()): string {
  const diffDays = Math.round(
    (startOfUtcDay(today).getTime() - startOfUtcDay(date).getTime()) / DAY_MS
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1) return `${diffDays} days ago`;
  if (diffDays === -1) return 'tomorrow';
  return `in ${-diffDays} days`;
}
