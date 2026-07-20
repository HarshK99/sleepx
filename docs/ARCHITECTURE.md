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
- **Types** for the domain (`SleepEntry`, `NewSleepEntry`) are inferred from the Drizzle schema (`typeof sleepEntries.$inferSelect`) in `lib/sleep/types.ts` and imported everywhere — never redeclared.

## Directory map

```
app/
  page.tsx                 # Dashboard: chart, then quick-entry form below it, fetches getDailyTotals() server-side
  history/
    page.tsx               # Full entry list, edit/delete
  actions/
    sleep-entries.ts        # 'use server' — createEntry, updateEntry, deleteEntry

lib/
  db/
    client.ts               # Drizzle + Neon client singleton (reads DATABASE_URL)
    schema.ts                # Drizzle table definitions
  sleep/
    types.ts                 # SleepEntry, NewSleepEntry (inferred from schema)
    duration.ts               # computeDurationMinutes(), formatDuration(), getWakeDate(), daysBefore(), parseWallClockDateTime(), formatForTimeInput(), roundToNearestStep() — pure functions, unit-testable
    queries.ts                 # getRecentEntries(), getAllEntries(), getEntryById(), getDailyTotals(), insertEntry(), updateEntry(), deleteEntry()

components/
  ui/                        # Generic, reusable, no domain knowledge (Button, Card, Field, ...)
    WheelDateTimePicker.tsx   # Date/Hour/Minute scroll-wheel picker ('use client', wraps react-mobile-picker), writes a hidden input matching the same "YYYY-MM-DDTHH:mm" shape lib/sleep/duration.ts already parses — the Server Action contract didn't change
  sleep/
    SleepEntryForm.tsx        # Quick-entry form (Server Component, <form action={createEntryAction}> calls the Server Action directly) — rendered directly in app/page.tsx, always visible, never gated behind an "Add" click/modal/sheet
    SleepChart.tsx             # Hours-slept-per-day line/area chart ('use client', Recharts), fed by getDailyTotals() — no aggregation of its own
    SleepHistoryList.tsx        # Editable/deletable list of entries

docs/
  PRD.md
  ARCHITECTURE.md
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
- **Day attribution rule: the date of `wakeTime`.** An entry with bed time 11 PM Monday and wake time 7 AM Tuesday belongs to Tuesday. This is computed at query time (`(wake_time AT TIME ZONE 'UTC')::date`) — never stored as a separate editable field, to avoid two sources of truth for "when did this sleep happen." `getWakeDate()` in `duration.ts` is the JS-side mirror of this same rule (used by the picker and the chart's tooltip); `daysBefore()` is the one place "N days ago" is computed, so query cutoffs, the picker's date range, and the chart's range all agree on what "N days" means.
- **A day's chart total is `SUM(duration_minutes)` grouped by that derived wake date** across all entries (main sleep + naps) sharing it. `getDailyTotals(days)` in `lib/sleep/queries.ts` is the one place that does this grouping, and it always returns exactly `days` entries — zero-filled for days with no entries — so `SleepChart` consumes its output directly with no gap-filling or aggregation of its own.
- Migrations via `drizzle-kit` (`drizzle-kit generate` + `drizzle-kit migrate`), committed to `drizzle/`.

## Chart

`SleepChart.tsx` is a single-series line/area chart (total minutes slept per day, `Recharts`' `AreaChart`+`Area`: a 2px line with a ~10%-opacity fill wash under it) — a deliberate choice over the `dataviz` skill's default "compare magnitude → bar" mapping for this data's job, made explicitly by the project owner; kept to the skill's mark spec for line/area (2px stroke, ≥8px hover dot, vertical crosshair cursor) rather than improvising. No legend needed (one series). The fill/stroke/grid/axis colors are CSS custom properties in `app/globals.css` (`--chart-series-1`, `--chart-grid`, `--chart-ink-muted`), validated with the skill's `validate_palette.js` against this app's actual light (`#ffffff`) and dark (`#111827`) surfaces — not hand-picked, and not the skill's own placeholder surfaces. The dashboard fetches `getDailyTotals(14)` server-side in `app/page.tsx` and passes it straight to the chart, rendered **above** the entry form (also a deliberate order from the project owner — the earlier "form is the first thing on screen" framing in PRD.md §3 was updated to match); the 14-day range matches the picker's backfill window on purpose (resolves the "fixed vs. selectable range" question in PRD.md §8 — fixed 14 for v1, no range picker).

## Environment variables

- `DATABASE_URL` — Neon Postgres connection string (pooled connection). Set in `.env` for dev (gitignored; copy from the committed `.env.example` template) and in Vercel project settings for prod. Deliberately `.env` rather than `.env.local` — `drizzle-kit` (used for migrations) only auto-loads `.env`, and Next.js loads `.env` too, so one file serves both without extra tooling. When the Vercel↔Neon integration is linked, Vercel injects this automatically per-environment.

## Future: multi-user path

If auth is added later: add a `users` table and a nullable-then-required `user_id` column on `sleep_entries`, add auth checks inside `lib/sleep/queries.ts` (not scattered across pages/actions). Not built now — avoid adding `user_id` speculatively.

## Conventions checklist for new features

- [ ] Does this duplicate logic that already exists in `lib/sleep/`? If yes, extend that function instead of adding a new one.
- [ ] Does a DB query for this already exist in `lib/sleep/queries.ts`? Reuse or extend it rather than writing a new one inline in a page/action.
- [ ] Is this UI element generic enough to belong in `components/ui/`, or specific to sleep-tracking (`components/sleep/`)?
- [ ] Does this add a click/step to the core log-a-night's-sleep flow? If yes, needs explicit sign-off against the PRD's minimal-clicks principle.
