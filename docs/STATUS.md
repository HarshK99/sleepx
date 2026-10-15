# SleepX — Status

Last updated: 2026-10-15

## Where the next phase starts

**Phase 9 — Deploy** ([PLAN.md](PLAN.md#phase-9--deploy)). It starts with the owner's setup steps: install the Vercel CLI, log in, and decide whether production uses the same Neon database as dev. Type `start phase 9` in a new chat.

## Done

- Phases 0–6 (2026-07-19 → 2026-08-03): data layer, domain logic, Server Actions, UI primitives, bottom-sheet entry form, charts.
- Build OS check and product-sense pass (2026-10-15): [product_sense.md](product_sense.md); PLAN.md in phase format; PRD and ARCHITECTURE in line with the code.
- Phase 7 (2026-10-15): edit in History (≤2 taps; old entries editable via a ±7-day date window); failed saves keep the form open with a message; wake-before-bed shown in the form.
- Feature check (2026-10-15): PRD §4 is a traced feature table. Bed-time and wake-time charts removed; three "considered" features listed with build conditions.
- Phase 8 (2026-10-15): design direction **Dawn sky**, recorded in [design.md](design.md) and applied to the whole app:
  - Tokens in `app/globals.css` (sky, plum ink, apricot accent, mist surfaces; Fraunces + Figtree); no `gray-*`/`blue-*`/`dark:` utilities left; no dark mode (owner's decision).
  - The sky follows the wake wheel while logging (`DawnSky`); the sun meets the 7h horizon on the dashboard and live in the form (`SunScene`); sunrise wash + short vibration on Save; four stat tiles replaced by the hero and one averages line.
  - Live total while picking: built (owner asked for it after the mock-ups).
  - Pickers show three rows on a band; the chart is restyled (7h tick in the accent, under-7h dots, no-entry days as gaps, 5h–10h scale).
  - Mock-ups: A, B, C built as interactive HTML, then A v2; A v2 chosen and kept as `docs/design/mockups/dawn-sky.html`, the rest deleted.

- Cleanup (2026-10-15, after Phase 8): removed the five unused Next.js starter images in `public/`, the never-called `getEntryById` query, and the `Card` primitive (one use left, inlined into `EditableEntryCard`, per ARCHITECTURE.md's second-use rule).

## Not done

- Owner phone checks, still open: Phase 7 (edit a real entry, log a new one) and Phase 8 (does Dawn sky feel right on the phone, half-awake, in a dim room; does the sunrise play on a real save).
- Phase 9: deploy.

## Decisions

- v1 is single-user, no accounts. "People like me" (other self-trackers) is the later user.
- Nothing new to build beyond the plan: the only pain found ("forgot to log → guessed later") is small and logged with a revisit trigger.
- v1 leaves out: accounts, reminders, CSV export / bulk delete.
- Success: over any 30 days, ≥28 nights logged and ≥90% logged the same day as waking.
- One form for create and edit (`SleepEntryForm`); `NewEntryForm` closes the sheet on success.
- Dawn sky is the one look; the owner refines pieces inside it.

## Open questions

- Production database: same Neon DB as dev, or a separate one? Decide before Phase 9.
- Top risk, no mitigation chosen: the whole record lives in one database with no export or backup.
- Product-level questions (one tracker or many, what the data answers, when to open it up): [product_sense.md §10](product_sense.md#10-open-questions).

## Known issues

- `drizzle.config.ts` error message says `.env.local`; the project uses `.env`. Fixed in Phase 9.
- A failed **delete** still goes to the full-page error screen. Acceptable for now: nothing being typed is lost.
- Clock times are formatted two ways: the dashboard and form say "8 AM", History says "8:00 AM" (`formatClockTime` vs `Intl` in SleepHistoryList). Cosmetic; unify when History is next touched.
- The sheet has a rise-in animation but closes instantly (it unmounts); on Save the sunrise covers it, on × it's abrupt.

## Files changed in Phase 8

`app/globals.css` (tokens), `app/layout.tsx` (fonts), `app/page.tsx`, `app/history/page.tsx`, `app/error.tsx`, `components/sleep/DawnSky.tsx` (new), `components/sleep/SunScene.tsx` (new), `components/sleep/SleepEntryForm.tsx`, `components/sleep/SleepEntrySheet.tsx`, `components/sleep/SleepHistoryList.tsx`, `components/sleep/EditableEntryCard.tsx`, `components/sleep/SleepChart.tsx`, `components/ui/TrendChart.tsx`, `components/ui/WheelDateTimePicker.tsx`, `components/ui/LoopingWheelColumn.tsx`, `components/ui/Button.tsx`, `components/ui/Field.tsx`, `components/ui/Card.tsx`, `lib/sleep/clockTime.ts` (`wallClockMinutesOfDay`), `docs/design.md` (new), `docs/design/mockups/dawn-sky.html` (new), `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/PLAN.md`, `docs/product_sense.md`, `docs/STATUS.md`, `CLAUDE.md`.

## Checks (Phase 8)

- Run: type-check and lint, both clean. In Edge at 390px (motion on) against the owner's dev server: dashboard with the sheet open; wake wheel moved to 9 AM (live total 10h, "3h above 7h", sky brighter); dashboard with real data (7h 15m, sun just over the horizon); chart (7h tick in the accent, under-7h nights as apricot dots); History list; History edit; wake-before-bed error in edit (rejected before any DB write). No console errors.
- Not run: a real save in the browser (would change real data; the sunrise was verified in the mock-up only); the phone itself; production build; tests (none exist).
