const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * `YYYY-MM-DD` for the current UTC day. This is a statically-built site,
 * so anything that needs the *actual* current date — not the date the
 * page happened to be built — must call this from a client `<script>` at
 * view/submit time rather than from Astro frontmatter (which runs at
 * build time and gets baked into the HTML).
 */
export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Coarse relative-day label ("today", "3 days ago") for a log entry's
 * date, relative to `today` (defaults to the real current time — pass an
 * explicit value only for tests). Call this from a client `<script>` when
 * the result is shown to a viewer, since a value computed at Astro build
 * time goes stale between rebuilds.
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

/** Compact duration label: 45 → "45m", 90 → "1h 30m", 120 → "2h". */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
