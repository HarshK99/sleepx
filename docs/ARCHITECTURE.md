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
- **A Client Component that just adds interactive chrome around a Server Component gets it as `children`, never as a direct import.** `SleepEntrySheet` (client) never imports `SleepEntryForm` (server) itself — `app/page.tsx` (server) builds `<SleepEntryForm .../>` and passes it into `<SleepEntrySheet>{...}</SleepEntrySheet>`. Importing a Server Component file from inside a `'use client'` file would pull it into the client bundle; passing it as `children` from a Server Component parent keeps it server-rendered.
- **A component that passes a function prop into a Client Component must itself be a Client Component.** Pre-rendered JSX can cross the Server→Client boundary as `children`/props (the rule above), but a plain function can't — the client needs to actually *call* it in the browser, and a server-only closure can't ship there ("Functions cannot be passed directly to Client Components unless ... marked with 'use server'"). `SleepChart`/`BedTimeChart`/`WakeTimeChart` pass formatter functions into `TrendChart`, so all three are `'use client'` — don't try to make them Server Components again without also moving the formatters somewhere that doesn't require passing a function prop.

## Directory map

```
app/
  page.tsx                 # Dashboard: avg-sleep/bed-time/wake-time stats, then the sleep/wake-time/bed-time charts, then the entry form wrapped in SleepEntrySheet. Fetches all three chart datasets server-side in parallel — catches a failed fetch itself so a DB blip degrades one chart, not the whole page (the form must keep working)
  error.tsx                 # Safety-net error boundary for anything else unexpected (e.g. a save that fails mid-flight) — "Try again" calls unstable_retry()
  history/
    page.tsx               # Full entry list + delete. No fetch retry here (unlike the dashboard) — a failed getAllEntries() falls through to error.tsx, which is an acceptable degrade for a secondary page. Edit-in-place isn't built yet (updateEntryAction exists and is ready for it) — only delete, since that's what was actually asked for; extend SleepHistoryList when/if inline edit is needed.
  actions/
    sleep-entries.ts        # 'use server' — createEntry, updateEntry, deleteEntry

lib/
  db/
    client.ts               # Drizzle + Neon client singleton (reads DATABASE_URL)
    schema.ts                # Drizzle table definitions
  sleep/
    types.ts                 # SleepEntry (inferred from schema)
    duration.ts               # computeDurationMinutes(), formatDuration(), getWakeDate(), daysBefore(), parseWallClockDateTime(), formatForTimeInput() — pure functions, unit-testable. Timezone-general (see APP_TIMEZONE below), not UTC-only.
    clockTime.ts               # formatClockTime(), toBedTimeAxisMinutes() — time-of-day (clock time) math, as distinct from duration.ts's duration math. Single source of truth for both charting *and* averaging a "what time did X happen" value (WakeTimeChart, BedTimeChart, and the dashboard's avg bed/wake stats all import from here rather than each rolling their own).
    goals.ts                    # SLEEP_GOAL_MINUTES / BEDTIME_GOAL_MINUTES / WAKE_TIME_GOAL_MINUTES — hardcoded (not user-configurable yet) targets used only to anchor each chart's fixed Y-axis scale and draw its goal reference line. See "Three charts" below.
    queries.ts                 # getAllEntries(), getEntryById(), getDailyTotals(), getFirstWakeTimes(), getFirstBedTimes(), insertEntry(), updateEntry(), deleteEntry()

components/
  ui/                        # Generic, reusable, no domain knowledge (Button, Card, Field, IconButton, ...)
    WheelDateTimePicker.tsx   # Date/Hour/Minute scroll-wheel picker ('use client'). Date column wraps react-mobile-picker (bounded, non-looping range); Hour/Minute columns use LoopingWheelColumn instead (they loop, see below). Writes a hidden input matching the same "YYYY-MM-DDTHH:mm" shape lib/sleep/duration.ts already parses — the Server Action contract didn't change.
    LoopingWheelColumn.tsx     # 'use client' infinite-scroll wheel column (native overflow-scroll + CSS scroll-snap over `options` repeated 5x, silently recentered on the middle copy on every scroll event) — used for Hour/Minute so scrolling past 23 continues into 00 with no dead-end. react-mobile-picker can't do this itself (matches selected item by value, so duplicating its list causes a visible snap-back glitch on release, see PRD.md §8) — this component owns scroll position directly instead, sidestepping that. Generic over any `options: string[]`, no sleep-domain knowledge.
    IconButton.tsx             # Bare circular icon-button primitive (no default size/color — callers always set their own, see the file's own comment) — used by the sheet's close × and its + FAB
    TrendChart.tsx              # 'use client' — the one Recharts line/area-chart implementation (axes, grid, tooltip, dot styling, CSS-var colors). Generic {date, value}[] in, formatters in as props, no sleep-domain knowledge. SleepChart, BedTimeChart, and WakeTimeChart are all thin adapters over this — see "Three charts, one chart implementation" below
  sleep/
    SleepEntryForm.tsx        # Quick-entry form (Server Component, <form action={createEntryAction}> calls the Server Action directly) — no chrome of its own; whatever renders it (SleepEntrySheet) supplies the surface/border
    SleepEntrySheet.tsx        # 'use client' bottom sheet wrapping SleepEntryForm (passed in as `children` from the Server Component page, so the form itself stays server-rendered) — open/closed state via useSyncExternalStore + sessionStorage (see the file's own comment for why not useState+useEffect), locks background scroll while open (see the file's own comment — otherwise dragging a wheel column lets touch gestures bounce the page behind it)
    CloseSheetOnSave.tsx        # 'use client', renders nothing — rendered inside SleepEntryForm's <form>, watches useFormStatus() for the pending true→false edge and calls setEntrySheetOpen(false). Exists because SleepEntryForm is a Server Component with no client-side success callback of its own; this is the one place that closes the sheet on save
    SleepChart.tsx             # Hours-slept-per-day chart — adapts DailyTotal[] to TrendChart's {date, value} shape, supplies hour/duration formatters. 'use client': it passes formatter *functions* into TrendChart as props, and functions can't cross the Server->Client boundary as props (only pre-rendered JSX via children, or actual Server Actions) — this bit us once already, don't try to make it a Server Component again
    BedTimeChart.tsx            # First-bed-time-of-day chart — adapts FirstBedTime[] to TrendChart, running each value through clockTime.ts's toBedTimeAxisMinutes() first (bed times cluster around midnight, so the raw 0-1439 value would wrap badly on a linear axis — see that file's comment) and formatClockTime() for ticks/tooltip. Fixed -180..180 (9pm-3am) domain/ticks and a goals.ts-driven goal line — see "Three charts" below. Also 'use client', same function-prop reason as the other two.
    WakeTimeChart.tsx           # First-wake-time-of-day chart — adapts FirstWakeTime[] to TrendChart, supplies clockTime.ts's formatClockTime. Fixed 360..600 (6am-10am) domain/ticks and a goals.ts-driven goal line — see "Three charts" below. Also 'use client', same reason.
    SleepHistoryList.tsx        # Server Component, full entry list with a per-row delete (<form action={deleteEntryAction}>). Not edit — see the history/page.tsx note above.

docs/
  product_sense.md         # Why: goal, user, pains, success measure
  PRD.md                   # What: flow, scope, data rules
  ARCHITECTURE.md          # How the code is organized (this file)
  PLAN.md                  # Build order, one phase per chat
  STATUS.md                # Where the build is now; read first in a new chat
```

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
- **The first-wake-time and first-bed-time charts both use `MIN()` per day, not a "is this a nap" flag.** There isn't one, and none is needed: because day-attribution already groups entries by the calendar day of their own `wake_time`, a same-day nap's `wake_time` *and* `bed_time` are both always later in real time than the main sleep's within that group (the nap happens in the afternoon/evening; the main sleep's bed time was the previous night) — so `MIN()` picks the main sleep for free either way. `getFirstWakeTimes(days)`/`getFirstBedTimes(days)` share one SQL-fragment builder (`firstTimeOfDayMinutesSql`) parameterized by column, and both return `null` (not zero) for a day with no entry, since "00:00" would misreport a day with no data as a midnight wake-up/bedtime.
- Migrations via `drizzle-kit` (`drizzle-kit generate` + `drizzle-kit migrate`), committed to `drizzle/`.

## Three charts, one chart implementation

`TrendChart.tsx` (`components/ui/`) is the single Recharts line/area implementation — axes, grid, tooltip, dot styling, CSS-var colors, all built once per the `dataviz` skill's mark spec for line/area (2px stroke, ~10%-opacity fill wash, ≥8px hover dot, vertical crosshair cursor). It takes generic `{date, value: number | null}[]` plus a `yTickFormatter`/`tooltipValueFormatter` pair, an optional `yDomain`/`yTicks`/`yAxisWidth` set for a fixed scale, and an optional `goalValue`/`goalLabel` pair that draws a dashed `ReferenceLine` — all still zero knowledge of sleep as a domain; the three chart components below are what plugs in sleep-specific numbers. The x-axis (`xAxisTicks()`) picks ~5 evenly-spaced dates via Recharts' explicit `ticks` prop rather than its `interval` prop, specifically so it can force the *last* point into the selection regardless of the spacing math — that point is always "today," labeled literally `"Today"` in the tickFormatter (every other tick is a short weekday name, "Mon"/"Tue"/…, more useful for spotting a weekday-vs-weekend pattern than a bare calendar date; the full date is still in the tooltip on tap/hover). `yAxisWidth` defaults to 36 (fits SleepChart's short "7h"/"14h" labels) — BedTimeChart/WakeTimeChart pass 40 and use `clockTime.ts`'s `formatClockTimeCompact` (no space, "10AM" not "10 AM") for their own tick labels specifically, because Recharts word-wraps a Y-axis label containing a space onto two lines once it doesn't fit the reserved width, which "10 AM"/"11 AM" triggered at the default width; the tooltip keeps the spaced `formatClockTime` since it has its own box, not a fixed column.

`SleepChart.tsx`, `BedTimeChart.tsx`, and `WakeTimeChart.tsx` are all ~20-line adapters: map their own query result to `TrendChart`'s shape, supply formatters and a fixed scale/goal from `goals.ts`, done. Concretely:
- **SleepChart** — total minutes slept per day (`getDailyTotals`), hour formatter ("7h" / "7.5h"). Fixed `[240, 840]` (4h-14h) domain with 2h ticks, replacing Recharts' auto-scaled domain, which produced odd fractional labels ("13.3h") that shifted with the data. Starting at 4h rather than 0 trims dead space below any realistic night, giving the meaningful band more vertical resolution — the trade-off, accepted for now, is that a sub-4h night (or a zero-filled no-entry gap day, which this chart renders as 0, not null) clips flat at the floor instead of showing its true depth.
- **BedTimeChart** — the *first* (earliest) bed time logged per day (`getFirstBedTimes`) — deliberately excludes a later same-day nap, see the data-model note above. Values go through `clockTime.ts`'s `toBedTimeAxisMinutes()` before charting: bed times cluster around midnight (e.g. 11pm-2am), so the raw 0-1439 "minutes since midnight" value would put 11:30pm and 12:30am ~23 hours apart on a linear axis instead of the real 1 — the shift maps anything at/after noon to a negative offset so the whole cluster sits on one continuous line. `formatClockTime` (also shared) turns ticks/tooltip back into "11:42 PM"-style labels regardless of sign. Fixed `[-180, 180]` (9pm-3am) domain with hourly ticks, comfortably covering both `BEDTIME_GOAL_MINUTES` (11:30pm) and real-world drift around it — replacing the old auto-framed `['dataMin - 30', 'dataMax + 30']`, which moved (and produced non-round labels) every time the data did.
- **WakeTimeChart** — the *first* (earliest) wake time logged per day (`getFirstWakeTimes`) — deliberately excludes a later same-day nap, see the data-model note above — 12-hour clock formatter ("7:15 AM"). Fixed `[360, 600]` (6am-10am) domain with hourly ticks — `WAKE_TIME_GOAL_MINUTES` (7am) lands exactly on a tick — same reasoning as BedTimeChart for dropping the old auto-framed domain; capped at 10am rather than 11am since a wake time past that is rare enough not to need the headroom. Wake times don't cluster near midnight, so unlike BedTimeChart it charts the raw value directly, no axis shift needed.

All three are line/area over "compare magnitude → bar" (the `dataviz` skill's own default mapping for this job) — a deliberate choice made explicitly by the project owner for the first chart, and carried to the other two for visual consistency. No legend on any of them (one series each). The dashboard fetches all three server-side in `app/page.tsx` (in parallel via `Promise.all`) and renders them **above** the entry form (also a deliberate order from the project owner — the earlier "form is the first thing on screen" framing in PRD.md §3 was updated to match); all three use a 14-day fixed range, matching the picker's backfill window on purpose (resolves the "fixed vs. selectable range" question in PRD.md §8 — fixed 14 for v1, no range picker).

The dashboard's four stat tiles (`StatCard` in `app/page.tsx`, laid out as a 2×2 grid — four side by side got too cramped on a phone width once "Today's sleep" was added) reuse these same three fetches rather than issuing new queries: today's sleep is just `getDailyTotals`'s last entry (oldest-first, so the last is always today's per the wake-date rule — `todaysLoggedMinutes`, null instead of 0 if nothing's logged yet today); average sleep duration filters `getDailyTotals` down to days with a non-zero total before averaging (see `averageLoggedMinutes`); average bed/wake time average whichever days have a value from `getFirstBedTimes`/`getFirstWakeTimes` (`averageMinutesOf`) — bed-time values go through the same `toBedTimeAxisMinutes()` shift first, for the same midnight-wraparound reason as the chart, and a plain arithmetic mean of the shifted values is valid as long as the sample doesn't actually cluster near noon (true for any realistic bedtime distribution). `StatCard` itself is `flex h-full flex-col justify-between` so the value stays anchored to the card's bottom regardless of how many lines its own label wraps to — a grid row stretches every cell to the tallest one, and without the flex/justify-between the value would stay pinned right under its own label instead of moving down with it, misaligning the numbers across cards in the same row.

## Both pages must render dynamically, not statically

`app/page.tsx` and `app/history/page.tsx` both `export const dynamic = 'force-dynamic'`. Without it, Next's default caching heuristic (see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` — this project isn't on the newer Cache Components model) sees no `fetch()` it tracks (Drizzle-over-Neon isn't one) and no Request-time API, so it **prerenders the page once at build/deploy time** — confirmed via a real `next build`, which shipped `/` as `○ (Static)` before this was added. That freezes two things that must never be frozen: `app/page.tsx`'s `getDefaultTimes()` (a plain `new Date()` call — the bed/wake date defaults would silently stay pinned to whatever day the last build happened on) and the DB reads themselves (chart data / the history list would stop updating with new entries). `force-dynamic` forces a fresh render — and fresh DB reads — on every request. Re-check with `next build`'s route summary (`ƒ` = dynamic, `○` = static) after touching either page's top-level exports or data fetching.

## Resilience to transient DB failures

The Neon HTTP driver (`@neondatabase/serverless`) opens a fresh request per query rather than holding a connection open, and Neon's compute auto-suspends when idle — so an occasional `NeonDbError`/`TypeError: fetch failed` (cold-start or a network blip) is expected, confirmed in practice (not just theoretically) during this project's own dev testing. Three layers handle it, all in `app/page.tsx`, none in `queries.ts` (which stays a faithful, unopinionated DB access layer — retries and fallbacks are a page/presentation-layer decision):
- `safeLoad()` retries a failed fetch **once**, after a fixed ~750ms delay, before giving up — cheap insurance against exactly the cold-start case (first query after idle wakes the compute, which can take a couple seconds; a bare failure without retrying would surface as broken even when the DB was simply slow to wake up). The delay only ever happens on the failure path, never on a normal load.
- If the retry also fails, `safeLoad()` returns `null` and the page renders an inline "couldn't load chart" message in that chart's `Card` instead of throwing — the entry sheet/form below keeps working regardless (and the *other* chart, if only one fetch failed), since a read failure must never block logging an entry. One `safeLoad` helper, reused for all three charts — not duplicated per chart.
- `app/error.tsx` is the fallback for anything else unexpected (including a Server Action failing on save) — without it, an uncaught error blanks the entire page instead of showing a "Try again" screen.

## Environment variables

- `DATABASE_URL` — Neon Postgres connection string (pooled connection). Set in `.env` for dev (gitignored; copy from the committed `.env.example` template) and in Vercel project settings for prod. Deliberately `.env` rather than `.env.local` — `drizzle-kit` (used for migrations) only auto-loads `.env`, and Next.js loads `.env` too, so one file serves both without extra tooling. When the Vercel↔Neon integration is linked, Vercel injects this automatically per-environment.

## Future: multi-user path

If auth is added later: add a `users` table and a nullable-then-required `user_id` column on `sleep_entries`, add auth checks inside `lib/sleep/queries.ts` (not scattered across pages/actions). Not built now — avoid adding `user_id` speculatively.

## Conventions checklist for new features

- [ ] Does this duplicate logic that already exists in `lib/sleep/`? If yes, extend that function instead of adding a new one.
- [ ] Does a DB query for this already exist in `lib/sleep/queries.ts`? Reuse or extend it rather than writing a new one inline in a page/action.
- [ ] Is this UI element generic enough to belong in `components/ui/`, or specific to sleep-tracking (`components/sleep/`)?
- [ ] Does this add a click/step to the core log-a-night's-sleep flow? If yes, needs explicit sign-off against the PRD's minimal-clicks principle.
- [ ] Does this new page read from the DB or compute anything off `new Date()`? If yes, it needs `export const dynamic = 'force-dynamic'` — see "Both pages must render dynamically" above — or it'll silently prerender stale at build time.
