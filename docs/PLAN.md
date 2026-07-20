# SleepX — Phase-wise Build Plan

Read [PRD.md](PRD.md) (what/why) and [ARCHITECTURE.md](ARCHITECTURE.md) (module boundaries, schema) first. This doc is the build order — each phase produces something runnable/verifiable before the next starts.

## Phase 0 — Environment & infra

- Provision a Neon Postgres project/database.
- Add `DATABASE_URL` to `.env.local` (gitignored).
- Install: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `recharts`.
- Add `drizzle.config.ts`.

**Deliverable:** `npm run dev` boots; a throwaway script can open a connection and run `select 1` against Neon.

## Phase 1 — Data layer

- `lib/db/schema.ts` — `sleep_entries` table (`bedTime`, `wakeTime`, `durationMinutes`, `note`, timestamps).
- `lib/db/client.ts` — Drizzle + Neon client singleton.
- `lib/sleep/types.ts` — types inferred from the schema.
- Generate and run the first migration (`drizzle-kit generate` / `migrate`), commit `drizzle/`.

**Deliverable:** table exists on Neon; `SleepEntry` type compiles and is importable.

## Phase 2 — Domain logic (`lib/sleep`)

- `duration.ts`: `computeDurationMinutes(bedTime, wakeTime)`, `formatDuration(minutes)`, `getWakeDate(wakeTime)` (the day-attribution rule from the PRD — wake date, not bed date).
- `queries.ts`: `insertEntry`, `updateEntry`, `deleteEntry`, `getEntryById`, `getRecentEntries(days)`, `getAllEntries()`, `getDailyTotals(days)` (the one place that sums multiple same-day entries, e.g. a night + a nap).

**Deliverable:** every function above exercised once via a scratch script against the real DB — inserting an overnight entry and a same-day nap and confirming `getDailyTotals` sums them under one day.

## Phase 3 — Server Actions

- `app/actions/sleep-entries.ts`: `createEntryAction`, `updateEntryAction`, `deleteEntryAction` — parse `FormData`, delegate to `lib/sleep`, `revalidatePath`. No business logic inline (per ARCHITECTURE.md's conventions checklist).

**Deliverable:** actions are callable and correctly invalidate cached data — verified once wired to a form in Phase 5.

## Phase 4 — UI primitives

- `components/ui/`: `Button`, `Card`, a labeled-field wrapper, and a time input. Bare styling — these get restyled later per the PRD's "UI is placeholder" note. Build mobile-first (base styles for a ~375–430px viewport, widen with `sm:`/`md:` after), touch targets ≥44px.

**Deliverable:** primitives render in isolation, no domain knowledge baked in, checked at a phone viewport width.

## Phase 5 — Dashboard: quick-entry flow

- `components/sleep/SleepEntryForm.tsx`: bed time, wake time, optional note; defaults pre-filled; calls `createEntryAction`.
- `app/page.tsx`: renders the form **directly on the page, unconditionally** — no "Add entry" button, FAB, modal, or collapsed sheet gating it. It's the first thing visible on load. (Chart slots in during Phase 6, below the form.)

**Deliverable:** log a real entry from the browser at a phone viewport, with zero taps before reaching the form, and confirm the row lands in Neon with the correct derived `durationMinutes`. Confirm a same-day second entry (nap) is accepted without conflict.

## Phase 6 — Chart

- `components/sleep/SleepChart.tsx` (Recharts), fed by `getDailyTotals()`. Follow the `dataviz` skill for color/axis/legend conventions when building this.
- Wire into `app/page.tsx`.

**Deliverable:** dashboard shows a bar chart of the last 7–14 days' totals; saving a new entry (including a nap added to an already-logged day) updates the corresponding bar.

## Phase 7 — History page

- `components/sleep/SleepHistoryList.tsx`: every entry, note shown, edit and delete.
- `app/history/page.tsx`.

**Deliverable:** any past entry reachable and editable/deletable in ≤2 clicks from History, matching the PRD's requirement.

## Phase 8 — Deploy

- Push to GitHub, import into Vercel, link the Vercel↔Neon integration (or set `DATABASE_URL` manually in project settings).
- Run the migration against the production database.
- Smoke test the full flow (log entry → chart updates → edit in history) on the live URL.

**Deliverable:** working production URL.

## Backlog (post-MVP, not scheduled into a phase yet)

From PRD §4/§8: authentication, real-time "going to sleep / just woke up" toggle logging, sleep quality rating, reminders/notifications, History grouped-by-day view, CSV export / bulk delete, smarter form defaults for a second same-day entry.
