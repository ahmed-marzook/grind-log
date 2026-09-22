# study-log — agent context

## What this is
A git-managed study log for tracking daily study practice and progress
toward personal goals, for me and others. Entries are markdown files
with frontmatter, committed directly to the repo — no backend, no
database. Static site, rebuilt on push.

Each person studies different things on different schedules — there is
no fixed topic list and no fixed set of "study days." Topic and
schedule are per-person, per-goal, declared by each person in their
own files. Don't hardcode any topic names or day-of-week schedules
anywhere in the code.

## Stack
- Astro (content collections, not a CMS)
- Deployed via GitHub Pages + `withastro/action`
- No JS framework needed unless a feature genuinely requires client-side
  interactivity (e.g. hover tooltips on the calendar) — prefer Astro
  islands with minimal JS over reaching for React. This is about
  frameworks (React/Vue/etc.), not every dependency — see ApexCharts
  below, a plain-JS chart library used directly in a client `<script>`,
  no framework wrapper needed.
- This is a **statically-built site rebuilt only on push** (plus a daily
  scheduled rebuild — see `.github/workflows/deploy.yml`). Anything
  computed from `new Date()` in Astro frontmatter is frozen to build
  time and goes stale between rebuilds. Any "as of today" UI (today's
  status, streaks, relative-day labels, the "Log today" date, the
  calendar/heatmap) must be computed in a client `<script>` against the
  viewer's real clock, not in frontmatter — see `src/lib/serialize.ts`
  (`reviveLogEntries`/`reviveGoals`/`toScriptJson`) for the pattern:
  embed the relevant content-collection entries as a JSON island,
  revive them client-side, and re-run the same pure functions from
  `src/lib/` (already written to accept `entries`/`goals`/`today` as
  plain arguments, no Astro dependency) with `new Date()`.

## Hosting: GitHub Pages
This is a **project site**, not a user/org site — it's served at
`https://<username>.github.io/<repo-name>/`, not at the domain root.
This has real consequences, not just a URL detail:

- `astro.config.mjs` must set both `site` (the full
  `https://<username>.github.io` URL) and `base` (`/<repo-name>`) —
  omitting `base` is the most common cause of broken CSS/asset paths
  and broken internal links on GitHub Pages specifically.
- Every internal link and asset reference must be built with Astro's
  `base`-aware helpers (e.g. resolve via `import.meta.env.BASE_URL`
  or Astro's built-in link handling) rather than hardcoded
  root-relative paths like `/calendar` — those will 404 once the
  site is live under the `/study-log/`-style subpath, even though
  they work fine in local dev at the root.
- Deploy via the official `withastro/action` GitHub Action, triggered
  on push to `main`, publishing to the `gh-pages` branch or GitHub's
  native Pages deployment (whichever the action's current default is
  — check its README when setting up the workflow, don't assume).
- Test the base-path behavior with `astro build` + `astro preview`
  locally before trusting it works, since local `astro dev` doesn't
  always surface base-path bugs the same way a real subpath
  deployment does.

## Structure
```
src/
  content/
    config.ts
    logs/
      example-person/
        2026-09-15.md      — a completed entry
        2026-09-20.md      — an excused entry
      ahmed-marzook/
        ...
      shakahwath-hussain/
        ...
    goals/
      example-person/
        neetcode-beginner.md
        claude-cert.md
      ahmed-marzook/
        ...
      shakahwath-hussain/
        ...
  layouts/Base.astro
  pages/
    index.astro           — dashboard: one card per person, click through
    [person]/index.astro   — person detail hub: recent entries, links
                              to that person's calendar and goals
    [person]/calendar.astro — per-person heatmap calendar
    [person]/goals.astro    — per-person goals board
    stats.astro            — full cross-person table (secondary/detail
                              view, not the landing page)
```

`example-person` is a living template, not a demo to delete — every
new person copies that folder pattern (one `logs/<name>/` folder, one
`goals/<name>/` folder) to onboard themselves. Keep its example entries
realistic and keep them in the repo permanently so the pattern is
always discoverable by example, not just by reading this file.

### Onboarding a new person
1. Pick a lowercase, hyphenated slug for `<name>` (e.g. `jane-doe`) —
   this exact string is the `person` value used everywhere (frontmatter,
   the `[person]` URL param, dashboard cards), so keep it URL-safe. Don't
   use a display name with spaces/capitals here — there is no separate
   display-name field, the slug is shown as-is.
2. Create `src/content/goals/<name>/` with at least one goal file
   (`person: <name>`, a real `topic`, `title`, `status`, and `updated`).
   A person only shows up on the dashboard once they have at least one
   log or goal entry, so this is the minimum needed to onboard — it's
   fine to start with a single `pending` goal and no `scheduled_days`
   (see `goals/example-person/claude-cert.md`) before a real schedule
   is picked.
3. Create `src/content/logs/<name>/` as entries get logged day to day
   (`person: <name>`, one file per topic per date). A day with a single
   topic is just `<date>.md`; a day with more than one topic (e.g.
   someone splitting a day between `dsa` and `python`) gets one file per
   topic instead, e.g. `<date>-dsa.md` and `<date>-python.md` — the
   filename doesn't matter beyond being unique, since streaks/calendar
   are computed per person+topic from frontmatter, not from filenames.
   Not required on day one — a zero-entry person still renders correctly
   everywhere.
4. Don't touch any code — topics, schedules, and the person list are
   all derived from these files (`getAllPersons`, `getScheduledDays`).
   If onboarding ever requires a code change, something is hardcoded
   that shouldn't be.

## Schema (src/content/config.ts)

### logs collection
Topic is a free string — never an enum, never validated against a
fixed list. Each person invents their own topic names.

A person can study more than one topic on the same date — there's no
`topics: string[]` field; instead, log one `completed` entry file per
topic, all sharing the same `date`. Every place that reads log entries
(`calculateStreak`, `buildCalendarDays`, the dashboard, the person hub
feed) already filters/aggregates by `person`+`topic` independently, so
same-date entries for different topics never collide — see
`goals/example-person/` and `logs/example-person/2026-09-16-*.md` for
a worked example.

```typescript
const logs = defineCollection({
  type: 'content',
  schema: z.object({
    date: z.date(),
    person: z.string(),
    status: z.enum(['completed', 'excused']).default('completed'),
    reason: z.string().optional(),   // required when status is 'excused'
    topic: z.string().optional(),    // required when status is 'completed'
    minutes: z.number().optional(),  // required when status is 'completed'
    title: z.string().optional(),    // required when status is 'completed'
    tags: z.array(z.string()).optional(),
  }).refine(/* completed requires topic+minutes+title; excused requires reason */),
});
```

A day with **no entry file at all** = missed, no excuse. A day with an
`excused` entry = missed but doesn't break the streak. These need to
stay visually and logically distinct everywhere in the app.

The markdown body below the frontmatter is an optional short journal
note — what was learned, or any other context worth keeping. There's
no separate `description` field for this; it's free text, rendered on
the person's hub page when present, same as a goal's body is rendered
on the goals board.

Example completed entry (`logs/example-person/2026-09-15.md`):
```markdown
---
date: 2026-09-15
person: example-person
status: completed
topic: dsa
minutes: 30
title: "Sliding Window: Longest Substring Without Repeats"
tags: ["shaky"]
---
Cold attempt got the brute force in ~12 min but missed shrinking the
window correctly. The "expand until invalid, then shrink" pattern is
the trigger to remember next time.
```

Example excused entry (`logs/example-person/2026-09-20.md`):
```markdown
---
date: 2026-09-20
person: example-person
status: excused
reason: "Travel day — no laptop access"
---
```

### goals collection
One file per goal, per person. This is what replaces any hardcoded
schedule — each goal declares its own topic and, optionally, which
days it's meant to happen. Streak/calendar logic reads schedule from
here, not from code.

```typescript
const goals = defineCollection({
  type: 'content',
  schema: z.object({
    person: z.string(),
    topic: z.string(),
    title: z.string(),
    status: z.enum(['pending', 'in-progress', 'achieved', 'cancelled', 'idea']),
    scheduled_days: z.array(
      z.enum(['mon','tue','wed','thu','fri','sat','sun'])
    ).optional(),               // which days this goal expects activity
    started: z.date().optional(),
    target_date: z.date().optional(),
    updated: z.date(),
  }),
});
```
Body = free text: why this goal, what "done" looks like, running notes
on progress. Since it's git-tracked, `git log` on a single goal file
is itself a progress history — don't try to duplicate that as a
separate changelog field.

`idea` is a fifth status for a future goal that isn't committed to
yet — a wishlist entry, not something being actively tracked. It's
deliberately excluded from every status rollup (`STATUS_ORDER` in
`src/lib/goals.ts`, the dashboard card summary, `stats.astro`) and
from `getPersonTopics`, so it never shows up on the home page or
starts counting as a "missed" day on the calendar. It only appears in
its own "Future ideas" section on `[person]/goals.astro`.

Example (`goals/example-person/neetcode-beginner.md`):
```markdown
---
person: example-person
topic: dsa
title: "Finish NeetCode Beginner DSA course"
status: in-progress
scheduled_days: ["mon","tue","wed","thu","fri"]
started: 2026-09-01
target_date: 2026-10-15
updated: 2026-09-15
---
Started at 30/35 lessons already done from a prior attempt. Goal this
time is to actually retain the patterns, not just finish the
checklist — see logs for daily reflections.
```

## Task 1: streak calculation (no hardcoded schedule)
Add `src/lib/streaks.ts` (pure functions, no Astro dependency):

- `getScheduledDays(person, topic, goals)` — look up the goal matching
  `person`+`topic` with `status: 'in-progress'` and read its
  `scheduled_days`. If no matching goal or no `scheduled_days` set,
  treat every day as scheduled (fall back to "any day counts") rather
  than guessing or hardcoding a default pattern.
- `calculateStreak(entries, goals, person, topic)` — walk backward
  from today over that topic's scheduled days only. A scheduled day
  counts if there's a `completed` or `excused` entry for it. A
  scheduled day with no entry breaks the streak. Non-scheduled days
  are skipped, not counted either way. Return
  `{ current: number, longest: number }`.
- Test cases: an excused day mid-streak (must NOT break it), a
  genuinely missed scheduled day (must break it), a goal with no
  `scheduled_days` (every day should count), and two different topics
  for the same person with different schedules (must not bleed into
  each other).

## Task 2: calendar view (`[person]/calendar.astro`)
GitHub-contributions-style heatmap, filterable by topic (topics come
from that person's own `logs`/`goals` entries — populate the filter
dynamically, never from a static list). Four visually distinct states
per day:
- **Completed** — filled, intensity scaled by `minutes`
- **Excused** — a genuinely different fill (different hue or pattern,
  not just a lighter "completed") with the reason visible on hover/tap
- **Missed** — clearly empty/flagged
- **Not scheduled** — muted/near-transparent, shouldn't visually
  compete with the other three

Show current + longest streak per topic near the top, from
`calculateStreak`.

Rendered with **ApexCharts** (`apexcharts`, plain JS, no framework) as
a `type: 'heatmap'` chart — 7 series (Sun–Sat) x N week-columns, one
data point per day, entirely client-rendered (there's no server-side
render path for a canvas/SVG chart on a static build). The four states
(plus completed's 4 intensity levels) are encoded as small integer
codes per day and mapped to exact colors via
`plotOptions.heatmap.colorScale.ranges`, matched against `dayCode()` in
the client script — this is a discrete state model, not a continuous
scale, which is why the setup differs from a typical Apex heatmap:
  - `colorScale.ranges` must be sorted ascending by `from`, or matching
    silently breaks (Apex doesn't sort them for you).
  - `enableShades: false` is required, or Apex perturbs even a
    single-value range's color based on cell position, so declared
    colors don't render as-given.
  - `xaxis.categories` is ignored for this chart type — give each data
    point its own `x` as the label string directly (see
    `buildSeries()`) instead.
  - `chart.animations.enabled: false` — this is a status dashboard, not
    a decorative chart; the default "grow-in" animation is unnecessary
    and, if you're checking rendered state in a test right after
    `chart.render()`, defeats you doing so.
  - Colors are read from the same CSS custom properties as the rest of
    the site (`getComputedStyle(document.documentElement)` for
    `--not-scheduled`/`--missed-border`/`--excused`, etc.) rather than
    duplicated — keep it that way if the palette ever changes.

The dashboard's small per-person mini-calendar (`index.astro`) stays a
plain CSS grid of `<span>`s, not ApexCharts — it's a decorative,
tooltip-only peek repeated once per person card, and a chart instance
per card isn't worth the weight. If it ever needs the same visual
treatment as the full calendar, that's a deliberate call to make then,
not an oversight now.

Gotcha specific to this codebase: any element created client-side with
`document.createElement()` — the mini-calendar's `<span>`s, e.g. —
never gets Astro's scoped-style `data-astro-cid-*` attribute, so a
plain (scoped) selector in that component's `<style>` block silently
never matches it (the element renders with no size/no color, not an
error). Wrap those specific selectors in `:global(...)` — see
`.mini-day`/`.mini-day--*` in `index.astro` for the pattern.

## Task 3: goals board (`[person]/goals.astro`)
Show each person's goals grouped or filterable by `status`
(pending / in-progress / achieved / cancelled). For each goal, show
title, topic, status, started/target dates if set, and render the
markdown body (the running notes). Achieved and cancelled goals should
stay visible (maybe collapsed by default) rather than disappearing —
the point is to see follow-through over time, including goals that
didn't pan out.

Also surface goals on `stats.astro`: a small per-person summary count
by status (e.g. "2 in progress, 1 achieved, 1 cancelled").

## Task 4: dashboard landing page (`index.astro`)
The home page is the entry point, not a raw feed — it's a grid of
per-person cards. Each card is a link (whole card clickable, not just
a small "view" button) to that person's `[person]/index.astro` hub.

Each card shows, at a glance:
- Person name
- **Today's status** — resolved per their scheduled goals for today:
  completed / excused / missed / nothing scheduled today. Reuse the
  same day-state logic from Task 1/2, don't reimplement it.
- **Current streak** — if they have more than one topic, show the
  longest-running current streak rather than every topic's number;
  the card is a summary, not the full picture (that's what clicking
  through is for).
- **Goals summary** — a small count by status, e.g. "2 in progress,
  1 achieved" (same data as the `stats.astro` rollup — pull from the
  same source, don't duplicate the aggregation logic in two places).

Cards should still make sense for a person with zero entries yet
(e.g. someone who just onboarded via the `example-person` template
pattern) — don't let the card layout break or show `NaN`/`undefined`
on empty data; show something like "no entries yet."

The `[person]/index.astro` hub it links to should show: recent entries
(most recent first, reasonable limit e.g. last 10), and clear links
into that person's `calendar.astro` and `goals.astro`.

## Conventions
- Keep all non-presentational logic (streak math, schedule resolution,
  status grouping) in `src/lib/`, not inline in `.astro` files.
- Never introduce a hardcoded topic list or hardcoded day-of-week
  schedule anywhere — if you find yourself writing one, the data
  should come from `goals` instead.
- Match the existing site's visual style — check `Base.astro` and any
  global CSS before inventing new colors, especially for the four
  calendar states.

## Definition of done
- Schema validates both log entry types, with `.refine` catching
  malformed completed/excused entries.
- `example-person` exists with realistic log + goal examples and is
  kept as the onboarding template, not deleted.
- Streak calculation has test coverage for the four cases above,
  entirely goal-driven with no hardcoded schedule.
- Calendar renders all four day-states distinctly, filterable by topic
  with topics populated dynamically.
- Goals board shows all four statuses, including achieved/cancelled,
  and rolls up into `stats.astro`.
- Dashboard (`index.astro`) shows one clickable card per person with
  today's status, current streak, and goals summary, handles a
  zero-entry person gracefully, and clicking through lands on that
  person's hub page.
