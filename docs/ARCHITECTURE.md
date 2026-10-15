# SleepX — Architecture & Conventions

Read [PRD.md](PRD.md) first for *what* and *why*. This doc is *how the code is organized* so new features land in the right module instead of growing a duplicate.

## Tech stack

- **Next.js (App Router)** — see root `AGENTS.md`: this repo runs a Next.js version newer than most training data. Check `node_modules/next/dist/docs/` before relying on remembered API shapes, especially for data fetching / Server Actions / caching.
- **React 19**, TypeScript, Tailwind CSS v4 — write Tailwind **mobile-first**: unprefixed utilities target the small-screen layout, `sm:`/`md:`/`lg:` only add changes for wider viewports. Never build the wide layout first and cram it down with overrides.
- **Drizzle ORM** + `@neondatabase/serverless` — Postgres hosted on **Neon**
- **Vercel** for deployment (Neon integration provides `DATABASE_URL` as an env var automatically when linked)
- Chart library: **Recharts** (default choice — revisit only if a concrete limitation shows up). When building/editing the chart component, follow the project's `dataviz` skill guidance for color/legend/axis conventions rather than improvising.
- `react-mobile-picker` — the scroll-wheel ("slot machine") date/time picker used by the entry form. Chosen over a hand-rolled CSS scroll-snap widget: it already handles touch-drag momentum, wheel-scroll, and click-to-select physics, which is a lot of fiddly behavior not worth re-implementing for a placeholder-UI phase. This is a deliberate, considered exception to "avoid new dependencies" — not a default to reach for again without similar justification.

## Guiding rule: one source of truth per concern

This is the modular/no-repetition mandate from the project owner. Concretely:

- **Duration math** (bed time + wake time → minutes slept, and minutes → "7h 32m" display) lives in exactly one place: `lib/sleep/duration.ts`. Nothing else computes or formats a duration inline.
- **DB access** goes through `lib/sleep/queries.ts` only. Server Actions and pages never import the Drizzle client or write raw queries themselves — they call a query/mutation function.
- **Server Actions** (`app/actions/sleep-entries.ts`) are thin: validate input shape, call a `lib/sleep` function, revalidate. No business logic inline in the action.
- **UI primitives** (button, card, labeled input, etc.) live in `components/ui/` and are reused, not re-implemented per feature component. Only extract a primitive once a second real usage appears — don't pre-build a component library speculatively.
- **Time entry granularity is 15 minutes** (:00/:15/:30/:45), enforced once: `components/ui/WheelDateTimePicker.tsx`'s Minute column is generated from `lib/sleep/duration.ts`'s `MINUTE_STEP` constant — nothing else hardcodes `15` or a minute list.
- **Types** for the domain (`SleepEntry`) are inferred from the Drizzle schema (`typeof sleepEntries.$inferSelect`) in `lib/sleep/types.ts` and imported everywhere — never redeclared. Only add `NewSleepEntry`/`$inferInsert` back if something actually ends up needing it — it was removed once already for sitting unused.
- **A Client Component that just adds interactive chrome around server-rendered content gets it as `children`, never as a direct import.** `EditableEntryCard` (client) never formats an entry's summary itself — `SleepHistoryList` (server) renders the summary and passes it in as `children`. Importing a Server Component file from inside a `'use client'` file would pull it into the client bundle; passing it as `children` from a Server Component parent keeps it server-rendered. (`SleepEntrySheet` follows the same shape, wrapping `NewEntryForm` passed in from `app/page.tsx`, though the form itself is now a Client Component — see below.)
- **An expected Server Action failure is a return value, not a throw.** `createEntryAction`/`updateEntryAction` return an `EntryFormState` (`idle` / `saved` / `error` + message) that `SleepEntryForm` reads with `useActionState` — that's why the form is a Client Component. A throw would land on `error.tsx` and lose what was being typed; a returned error keeps the form open with a message. Only programmer errors (a missing hidden field) still throw.
- **A component that passes a function prop into a Client Component must itself be a Client Component.** Pre-rendered JSX can cross the Server→Client boundary as `children`/props (the rule above), but a plain function can't — the client needs to actually *call* it in the browser, and a server-only closure can't ship there ("Functions cannot be passed directly to Client Components unless ... marked with 'use server'"). `SleepChart` passes formatter functions into `TrendChart`, so it's `'use client'` — don't try to make it a Server Component again without also moving the formatters somewhere that doesn't require passing a function prop. `NewEntryForm` exists for the same reason (see the directory map).

## Directory map

```
app/
  page.tsx                 # Dashboard: DawnSky (resting light: pre-dawn until today is logged), the hero SunScene (today's total on the horizon), the 14-day averages as one line, the sleep chart, then NewEntryForm in SleepEntrySheet. Fetches its three datasets server-side in parallel — catches a failed fetch itself so a DB blip degrades one section, not the whole page (the form must keep working)
  error.tsx                 # Safety-net error boundary for anything else unexpected (e.g. a save that fails mid-flight) — "Try again" calls unstable_retry()
  history/
    page.tsx               # Full entry list, edit in place + delete. No fetch retry here (unlike the dashboard) — a failed getAllEntries() falls through to error.tsx, which is an acceptable degrade for a secondary page.
  actions/
    sleep-entries.ts        # 'use server' — createEntryAction/updateEntryAction (useActionState signature, return EntryFormState; share one saveEntry helper), deleteEntryAction (plain form action)

lib/
  db/
    client.ts               # Drizzle + Neon client singleton (reads DATABASE_URL)
    schema.ts                # Drizzle table definitions
  sleep/
    types.ts                 # SleepEntry (inferred from schema)
    duration.ts               # isWakeAfterBed() (the one entry-validity rule), computeDurationMinutes(), formatDuration(), getWakeDate(), daysBefore(), parseWallClockDateTime(), formatForTimeInput() — pure functions, unit-testable. Timezone-general (see APP_TIMEZONE below), not UTC-only.
    clockTime.ts               # formatClockTime(), toBedTimeAxisMinutes(), wallClockMinutesOfDay() — time-of-day (clock time) math, as distinct from duration.ts's duration math. Used by the avg bed/wake line, the live caption and DawnSky's light; any future time-of-day display imports from here rather than rolling its own.
    goals.ts                    # SLEEP_GOAL_MINUTES — hardcoded (not user-configurable yet) 7h target, used only to anchor SleepChart's fixed Y-axis scale and draw its goal line. See "The sleep chart" below.
    queries.ts                 # getAllEntries(), getDailyTotals(), getFirstWakeTimes(), getFirstBedTimes(), insertEntry(), updateEntry(), deleteEntry()

components/
  ui/                        # Generic, reusable, no domain knowledge (Button, Field, IconButton, SubmitButton, TrendChart, the wheel pickers)
    WheelDateTimePicker.tsx   # Date/Hour/Minute scroll-wheel picker ('use client'), three rows visible with the selection on a raised band (Dawn sky). Date column wraps react-mobile-picker (bounded, non-looping range; its own hairlines are hidden via `.wheel-date` in globals.css); Hour/Minute columns use LoopingWheelColumn (they loop). Writes a hidden input in the "YYYY-MM-DDTHH:mm" shape lib/sleep/duration.ts parses, and reports every change through `onChange` (the form's live total and the sky). `dateWindow`: 'recent' (default, today back 14 days — new entries) or 'aroundValue' (the value's own date ±7 days, never past today — editing).
    LoopingWheelColumn.tsx     # 'use client' infinite-scroll wheel column (native overflow-scroll + CSS scroll-snap over `options` repeated 5x, silently recentered on the middle copy on every scroll event) — used for Hour/Minute so scrolling past 23 continues into 00 with no dead-end. react-mobile-picker can't do this itself (matches selected item by value, so duplicating its list causes a visible snap-back glitch on release, see PRD.md §8) — this component owns scroll position directly instead, sidestepping that. `visibleRows` (odd) shows that many rows with the selection centred, via top/bottom padding so scrollTop = index × itemHeight still holds. Generic over any `options: string[]`, no sleep-domain knowledge.
    IconButton.tsx             # Bare circular icon-button primitive (no default size/color — callers always set their own, see the file's own comment) — used by the sheet's close × and its + FAB
    TrendChart.tsx              # 'use client' — the one Recharts line/area-chart implementation (ink line over an apricot glow, goal drawn as a horizon line with its Y tick in the accent, under-goal points as accent dots, mist tooltip, CSS-var colours). Generic {date, value}[] in, formatters in as props, no sleep-domain knowledge. SleepChart is a thin adapter over this — see "The sleep chart" below
  sleep/
    SleepEntryForm.tsx        # 'use client' — the one entry form for both logging (no entryId → createEntryAction) and editing (entryId → updateEntryAction). Tracks the two picker values to show the live SunScene (total via duration.ts, never computed inline), drives DawnSky while on screen (setPickedWakeTime), and on a successful save plays the sunrise from the Save button + a short vibration, then calls onSaved. useActionState shows a returned error inline. Note field is controlled so React's post-action form reset can't wipe it on an error. No chrome of its own — the sheet or the History card supplies the surface
    SunScene.tsx               # The Dawn sky signature, one component for both places: a sky window with a sun that rises with a night's total and clears the horizon at SLEEP_GOAL_MINUTES, the total standing on the horizon, and "1h above 7h" under it. size 'hero' (dashboard, server-rendered) or 'live' (inside the form, with its own little sky lit by skyLight). No hooks, so it renders on either side
    DawnSky.tsx                # 'use client' — the fixed sky behind every page (pre-dawn gradient + sunrise layer at opacity = light) and the sunrise wash. A tiny module store (same pattern as SleepEntrySheet): forms call setPickedWakeTime() so the sky follows the wake wheel (lightForWake: 5 AM dark → 10 AM full), and playSunriseFrom() on save; otherwise the page's restingLight applies
    NewEntryForm.tsx           # 'use client' — SleepEntryForm in new-entry mode with onSaved = close the sheet. Exists because app/page.tsx (server) can't pass that function prop itself
    SleepEntrySheet.tsx        # 'use client' bottom sheet wrapping NewEntryForm (passed in as `children` from the page) — open/closed state via useSyncExternalStore + sessionStorage (see the file's own comment for why not useState+useEffect), locks background scroll while open (see the file's own comment — otherwise dragging a wheel column lets touch gestures bounce the page behind it)
    SleepChart.tsx             # Hours-slept-per-day chart — adapts DailyTotal[] to TrendChart's {date, value} shape (a no-entry day becomes null, a gap — not 0), supplies hour/duration formatters and the 5h-10h scale. 'use client': it passes formatter *functions* into TrendChart as props, and functions can't cross the Server->Client boundary as props (only pre-rendered JSX via children, or actual Server Actions) — this bit us once already, don't try to make it a Server Component again
    SleepHistoryList.tsx        # Server Component, full entry list — formats each row's summary and passes it as children to EditableEntryCard, along with the entry's times pre-formatted by formatForTimeInput
    EditableEntryCard.tsx       # 'use client' — one History row: summary + Edit/Delete, or SleepEntryForm in edit mode in its place (Edit = 1 tap, Save = 2nd, within PRD §3's ≤2-click budget). Collapses only on a successful save

docs/
  product_sense.md         # Why: goal, user, pains, success measure
  PRD.md                   # What: flow, scope, data rules
  ARCHITECTURE.md          # How the code is organized (this file)
  PLAN.md                  # Build order, one phase per chat
  design.md                # Look and feel: Dawn sky direction, tokens, screens and states
  design/mockups/          # The chosen interactive mock-up (dawn-sky.html)
  STATUS.md                # Where the build is now; read first in a new chat
```

Look and feel: [design.md](design.md) (Dawn sky). Tokens live only in `app/globals.css` and are used through their Tailwind names; no `gray-*`/`blue-*`/`dark:` utilities.

Rule of thumb: **pages compose components, components render, `lib/sleep` decides, `lib/db` persists.** No layer skips another.

## Data model

Single table, no `user_id` in v1 (see [Future: multi-user path](#future-multi-user-path)). No constraint limits entries per day — a night's sleep and a nap are both just rows.

```ts
// lib/db/schema.ts
export const sleepEntries = pgTable('sleep_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  bedTime: timestamp('bed_time', { withTimezone: true }).notNull(),
  wakeTime: timestamp('wake_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(), // derived at write time, stored for cheap querying/charting
  note: text('note'), // optional, nullable
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- `durationMinutes` is **derived, not user-entered** — computed by `lib/sleep/duration.ts` when an entry is created/updated, then stored so the chart query is a plain `SELECT`/`SUM` with no per-row computation.
- **Day attribution rule: the date of `wakeTime`.** An entry with bed time 11 PM Monday and wake time 7 AM Tuesday belongs to Tuesday. This is computed at query time (`(wake_time AT TIME ZONE 'Asia/Kolkata')::date` — see `APP_TIMEZONE` in `duration.ts`) — never stored as a separate editable field, to avoid two sources of truth for "when did this sleep happen." `getWakeDate()` in `duration.ts` is the JS-side mirror of this same rule (used by the picker and the chart's tooltip); `daysBefore()` is the one place "N days ago" is computed, so query cutoffs, the picker's date range, and the chart's range all agree on what "N days" means.
- **A day's chart total is `SUM(duration_minutes)` grouped by that derived wake date** across all entries (main sleep + naps) sharing it. `getDailyTotals(days)` in `lib/sleep/queries.ts` is the one place that does this grouping, and it always returns exactly `days` entries — zero-filled for days with no entries — so `SleepChart` consumes its output directly with no gap-filling or aggregation of its own.
- **The first-wake-time and first-bed-time queries (behind the avg bed/wake tiles) both use `MIN()` per day, not a "is this a nap" flag.** There isn't one, and none is needed: because day-attribution already groups entries by the calendar day of their own `wake_time`, a same-day nap's `wake_time` *and* `bed_time` are both always later in real time than the main sleep's within that group (the nap happens in the afternoon/evening; the main sleep's bed time was the previous night) — so `MIN()` picks the main sleep for free either way. `getFirstWakeTimes(days)`/`getFirstBedTimes(days)` share one SQL-fragment builder (`firstTimeOfDayMinutesSql`) parameterized by column, and both return `null` (not zero) for a day with no entry, since "00:00" would misreport a day with no data as a midnight wake-up/bedtime.
- Migrations via `drizzle-kit` (`drizzle-kit generate` + `drizzle-kit migrate`), committed to `drizzle/`.

## The sleep chart

`TrendChart.tsx` (`components/ui/`) is the single Recharts line/area implementation — axes, grid, tooltip, dot styling, CSS-var colors, all built once per the `dataviz` skill's mark spec for line/area (2px stroke, ~10%-opacity fill wash, ≥8px hover dot, vertical crosshair cursor). It takes generic `{date, value: number | null}[]` plus a `yTickFormatter`/`tooltipValueFormatter` pair, an optional `yDomain`/`yTicks` pair for a fixed scale, and an optional `goalValue`/`goalLabel` pair that draws a dashed `ReferenceLine` — zero knowledge of sleep as a domain; `SleepChart` is what plugs in sleep-specific numbers. It stays generic so any future chart reuses it rather than growing a second implementation. The x-axis (`xAxisTicks()`) picks ~5 evenly-spaced dates via Recharts' explicit `ticks` prop rather than its `interval` prop, specifically so it can force the *last* point into the selection regardless of the spacing math — that point is always "today," labeled literally `"Today"` in the tickFormatter (every other tick is a short weekday name, "Mon"/"Tue"/…, more useful for spotting a weekday-vs-weekend pattern than a bare calendar date; the full date is still in the tooltip on tap/hover).

`SleepChart.tsx` is a ~20-line adapter: total minutes slept per day (`getDailyTotals`), hour formatter ("7h" / "7.5h"), and a fixed `[300, 600]` (5h-10h) domain with ticks at 5h / 7h / 9h — tight around where real nights fall, so the band around the 7h horizon gets the vertical room (Dawn sky, [design.md](design.md)). Recharts widens the domain itself if a night falls outside it. A day with no entry is passed as `null`, so it's a gap in the line rather than a dive to zero (getDailyTotals still zero-fills, which the averages rely on). The 7h goal comes from `goals.ts` and is drawn as the horizon line.

It's line/area over "compare magnitude → bar" (the `dataviz` skill's own default mapping for this job) — a deliberate choice made explicitly by the project owner. No legend (one series). It renders **above** the entry form (also a deliberate order from the project owner), over a 14-day fixed range matching the picker's backfill window on purpose (PRD.md §4/§8 — fixed 14 for v1, no range picker).

**Removed 2026-10-15:** separate bed-time and wake-time charts, with 11:30 PM / 7 AM goal lines. They served "what should I change?", which isn't the decision in product_sense.md, and encoded schedule goals the owner doesn't have. The data is untouched; the avg bed/wake tiles still cover that half of the decision. To bring a chart back, add another thin adapter over `TrendChart` (git history has both — commit before `Remove bed/wake charts`).

The dashboard's hero and averages line reuse the three fetches (`getDailyTotals`, `getFirstWakeTimes`, `getFirstBedTimes`): today's total is `getDailyTotals`'s last entry (oldest-first, so the last is always today's per the wake-date rule — `todaysLoggedMinutes`, null instead of 0 if nothing's logged yet today), shown in the hero `SunScene` with today's first bed → wake as its caption; average sleep duration filters `getDailyTotals` down to days with a non-zero total before averaging (`averageLoggedMinutes`); average bed/wake time average whichever days have a value from `getFirstBedTimes`/`getFirstWakeTimes` (`averageMinutesOf`) — bed-time values go through `toBedTimeAxisMinutes()` first, for the midnight-wraparound reason in `clockTime.ts`. Until 2026-10-15 these were four stat tiles; Dawn sky replaced them with the hero and one line of text (design.md §3).

## Both pages must render dynamically, not statically

`app/page.tsx` and `app/history/page.tsx` both `export const dynamic = 'force-dynamic'`. Without it, Next's default caching heuristic (see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` — this project isn't on the newer Cache Components model) sees no `fetch()` it tracks (Drizzle-over-Neon isn't one) and no Request-time API, so it **prerenders the page once at build/deploy time** — confirmed via a real `next build`, which shipped `/` as `○ (Static)` before this was added. That freezes two things that must never be frozen: `app/page.tsx`'s `getDefaultTimes()` (a plain `new Date()` call — the bed/wake date defaults would silently stay pinned to whatever day the last build happened on) and the DB reads themselves (chart data / the history list would stop updating with new entries). `force-dynamic` forces a fresh render — and fresh DB reads — on every request. Re-check with `next build`'s route summary (`ƒ` = dynamic, `○` = static) after touching either page's top-level exports or data fetching.

## Resilience to transient DB failures

The Neon HTTP driver (`@neondatabase/serverless`) opens a fresh request per query rather than holding a connection open, and Neon's compute auto-suspends when idle — so an occasional `NeonDbError`/`TypeError: fetch failed` (cold-start or a network blip) is expected, confirmed in practice (not just theoretically) during this project's own dev testing. Three layers handle it, all in `app/page.tsx`, none in `queries.ts` (which stays a faithful, unopinionated DB access layer — retries and fallbacks are a page/presentation-layer decision):
- `safeLoad()` retries a failed fetch **once**, after a fixed ~750ms delay, before giving up — cheap insurance against exactly the cold-start case (first query after idle wakes the compute, which can take a couple seconds; a bare failure without retrying would surface as broken even when the DB was simply slow to wake up). The delay only ever happens on the failure path, never on a normal load.
- If the retry also fails, `safeLoad()` returns `null` and the page renders an inline "couldn't load chart" message in that chart's `Card` instead of throwing — the entry sheet/form below keeps working regardless (and the other tiles, if only one fetch failed), since a read failure must never block logging an entry. One `safeLoad` helper, reused for all three fetches — not duplicated per fetch.
- A failed **save** (create/update) doesn't reach `error.tsx` at all: the action catches the DB error and returns it, and the form shows it inline with the entry still filled in (see "An expected Server Action failure is a return value" above).
- `app/error.tsx` is the fallback for anything else unexpected (e.g. a failed delete) — without it, an uncaught error blanks the entire page instead of showing a "Try again" screen.

## Environment variables

- `DATABASE_URL` — Neon Postgres connection string (pooled connection). Set in `.env` for dev (gitignored; copy from the committed `.env.example` template) and in Vercel project settings for prod. Deliberately `.env` rather than `.env.local` — `drizzle-kit` (used for migrations) only auto-loads `.env`, and Next.js loads `.env` too, so one file serves both without extra tooling. When the Vercel↔Neon integration is linked, Vercel injects this automatically per-environment.

## Future: multi-user path

If auth is added later: add a `users` table and a nullable-then-required `user_id` column on `sleep_entries`, add auth checks inside `lib/sleep/queries.ts` (not scattered across pages/actions). Not built now — avoid adding `user_id` speculatively.

## Conventions checklist for new features

- [ ] Does this duplicate logic that already exists in `lib/sleep/`? If yes, extend that function instead of adding a new one.
- [ ] Does a DB query for this already exist in `lib/sleep/queries.ts`? Reuse or extend it rather than writing a new one inline in a page/action.
- [ ] Is this UI element generic enough to belong in `components/ui/`, or specific to sleep-tracking (`components/sleep/`)?
- [ ] Does this add a click/step to the core log-a-night's-sleep flow? If yes, needs explicit sign-off against the PRD's minimal-clicks principle.
- [ ] Does this UI use the tokens and stay inside design.md's direction? New colours go into globals.css first, never as raw utilities.
- [ ] Does this new page read from the DB or compute anything off `new Date()`? If yes, it needs `export const dynamic = 'force-dynamic'` — see "Both pages must render dynamically" above — or it'll silently prerender stale at build time.
