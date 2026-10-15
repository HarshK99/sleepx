# SleepX — Phase-wise Build Plan

Read [product_sense.md](product_sense.md) (why), [PRD.md](PRD.md) (what), [ARCHITECTURE.md](ARCHITECTURE.md) (how the code is organized) and [STATUS.md](STATUS.md) (where the build is) first.

One chat per phase: type `start phase N` in a new chat. That chat reads the docs above plus its phase below, does only that phase, updates STATUS.md in the same commit as the work, and stops.

## Done: Phases 0–6

Built 2026-07-19 → 2026-08-03. Kept short as a record; the code and ARCHITECTURE.md are the detail.

| Phase | What shipped | Differs from the original plan |
|---|---|---|
| 0 — Environment | Neon DB, Drizzle, Recharts, `drizzle.config.ts` | `DATABASE_URL` lives in `.env`, not `.env.local` (ARCHITECTURE.md explains why) |
| 1 — Data layer | `sleep_entries` schema, DB client, inferred types, first migration | — |
| 2 — Domain logic | `duration.ts`, `clockTime.ts`, `goals.ts`, `queries.ts` | Added first-wake-time and first-bed-time queries (now behind the avg bed/wake tiles) |
| 3 — Server Actions | create / update / delete actions | `updateEntryAction` is not wired to any UI yet (Phase 7) |
| 4 — UI primitives | Button, Card (inlined 2026-10-15, one use left), Field, IconButton, SubmitButton, TrendChart | A scroll-wheel date/time picker replaced the plain time input (PRD §6) |
| 5 — Quick entry | Entry form in a bottom sheet, open by default each session, + button to reopen | Originally "form inline, no sheet"; reversed on purpose (PRD §3) |
| 6 — Charts | Sleep line chart + four stat tiles | Originally one bar chart; line/area chosen on purpose. Bed-time and wake-time charts were built too, then removed 2026-10-15 after the feature check (PRD §4) |

## Phase 7 — Edit in History, and safe saving

**Goal:** fix a wrong entry in ≤2 clicks from History (PRD §3), and make sure a save that fails can't quietly lose an entry (product_sense.md's top risk is losing the record).

**Inputs:** PRD §3 and §6; ARCHITECTURE.md conventions checklist; `components/sleep/SleepHistoryList.tsx`, `app/actions/sleep-entries.ts` (`updateEntryAction`), `components/ui/WheelDateTimePicker.tsx`, `components/sleep/CloseSheetOnSave.tsx`.

**Instructions:**
1. Add edit to each History row, reusing `WheelDateTimePicker` and `updateEntryAction`. Don't build a second picker or a second form layout. Edit and create are the same fields, so share them.
2. **Decided 2026-10-15:** when editing, the Date column covers the entry's own date ±7 days, never past today, so entries older than the 14-day logging window stay editable.
3. Fix `CloseSheetOnSave`: today it closes the sheet when the save *finishes*, success or not. It should close only on success (PRD §3). Check how a Server Action reports failure in this Next.js version in `node_modules/next/dist/docs/` before choosing the approach.
4. Wake time before bed time currently throws and shows the full-page error. If the edit flow makes this more likely, show the error inside the form instead; otherwise leave it and note it in STATUS.md.

**Deliverables:** edit from History; the sheet stays open on a failed save; ARCHITECTURE.md's directory map updated for any new or changed file.

**Done when:**
- *I can check:* type-check and lint pass; `/history` and the edit state look right at phone width (`node D:\FounderMode\Apps\build_os\tools\shot.mjs /history`, on the owner's running dev server).
- *Owner checks:* edit a real entry on the phone; it reaches the edit state in ≤2 taps, and the charts reflect the change.

**Stop:** update STATUS.md, commit with the work, stop. Don't start Phase 8.

## Phase 8 — Design direction

**Done 2026-10-15:** Dawn sky, recorded in [design.md](design.md); chosen mock-up kept at `docs/design/mockups/dawn-sky.html`. The plan below is kept as the record.

**Goal:** decide SleepX's look once, from product sense, so the live app launches with it and later piece-by-piece refinement has a direction to stay inside. Follows the design step in HOW_I_WORK.md ("Set a design direction before building screens").

**Inputs:** product_sense.md (§2 user: logs on the phone around waking or bedtime), PRD §4 feature table and §6 mobile-first rules, the current UI (`app/page.tsx`, `app/history/page.tsx`, `components/`, `app/globals.css`), the `interface-design` skill (the one design skill for this task; `ui-ux-pro-max` only for targeted lookups).

**Instructions** (one step at a time, each as an options question, waiting for the owner's answer):
1. **Context of use.** Suggest it from product sense (in bed or just up, half-awake, often a dark room, one thumb), then confirm.
2. **Feel in one line.** Agree it before anything is drawn.
3. **Two or three distinct directions.** Build each as a self-contained interactive HTML mock-up in `docs/design/mockups/` (dashboard + entry sheet, fixed sample data, working wheels and Save), viewed in the browser's device mode at phone width. The owner picks one; keep that file, delete the others. Built 2026-10-15: A (dawn sky), B (linen and ink), C (ember to day), then A v2 after A "didn't feel wow"; A v2 chosen and kept as `dawn-sky.html`.
4. **Tokens.** Colour (light and dark), type scale, spacing, radius, motion, defined once in `app/globals.css` as CSS variables and used through Tailwind. Apply them across the existing components in place of hardcoded `gray-*`/`blue-*` utilities. This is a mechanical swap, not a layout redesign.
5. **Screens.** In `docs/design.md`, one row per screen (dashboard, entry sheet, History, History edit, error page): job, primary action, and every state (empty, loading, error, success). Mark states that exist today vs. missing; build only the missing ones the owner agrees to.
6. **Check.** Phone-width screenshots of every screen and state that can be reached without changing real data. Offer one line for the design results log in BUILD_OS.md section 5.

**Deliverables:** `docs/design.md` (context, feel, chosen direction and why, the rejected ones in a line each, tokens, screen list); tokens in `app/globals.css`; components switched to them; rejected mock-ups deleted; ARCHITECTURE.md and CLAUDE.md updated to point at design.md.

**Done when:**
- *I can check:* type-check and lint pass; screenshots of every screen at 390px match the chosen direction; no hardcoded colour utilities left outside the token layer.
- *Owner checks:* picks the direction in step 3; on the phone, the app feels right half-awake (and in a dark room, if dark was chosen).

**Stop:** update STATUS.md, commit with the work, stop. Don't start Phase 9.

## Phase 9 — Deploy

**Done 2026-10-15:** the Vercel project `sleepx` already existed, linked to this GitHub repo, with `DATABASE_URL` set for production; every push to `master` deploys. Live at https://sleepx.vercel.app, serving Dawn sky and real data. The plan below is kept as the record; steps it assumed were still needed (import the repo, set the variable, run the migration) had been done earlier.

**Goal:** a working production URL the owner logs from every day.

**Owner does first (needs their accounts):**
1. Install the Vercel CLI: `npm i -g vercel`, then `vercel login`.
2. Decide: does production use the same Neon database as dev, or a separate one? (Open question, see STATUS.md.)
3. In Vercel: import the GitHub repo (`HarshK99/sleepx`), and link the Neon integration or set `DATABASE_URL` in project settings.

**Inputs:** ARCHITECTURE.md "Environment variables" and "Both pages must render dynamically"; `drizzle.config.ts`; `drizzle/` migrations.

**Instructions:**
1. Fix the error message in `drizzle.config.ts`: it says `.env.local`, but the project uses `.env`.
2. Run the migration against the production database if it is a separate one.
3. Deploy. In the Vercel build log, confirm `/` and `/history` show as dynamic (`ƒ`), not static (`○`).
4. Smoke test on the live URL: log an entry → charts update → edit it in History → delete it.

**Deliverables:** production URL; README.md updated with it.

**Done when:**
- *I can check:* build log shows both routes dynamic; the live URL loads.
- *Owner checks:* the smoke test above, on the phone.

**Stop:** update STATUS.md, commit, stop.

## After v1

Measured by product_sense.md §9: over any 30 days, ≥28 nights logged and ≥90% logged the same day as waking.

Revisit "forgot to log → guessed later" only if its trigger fires (weekly, or guesses past 30 min) — see product_sense.md §5.

Backlog, not scheduled (from PRD §4/§8): authentication, real-time "going to sleep / just woke up" logging, sleep quality rating, reminders, History grouped by day, CSV export / bulk delete, smarter defaults for a second same-day entry, editable goals.
