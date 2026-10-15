# SleepX — Status

Last updated: 2026-10-15

## Where the next phase starts

**Phase 8 — Deploy** ([PLAN.md](PLAN.md#phase-8--deploy)), once the owner has done Phase 7's phone check below. Phase 8 starts with the owner's setup steps (Vercel CLI, login, database choice). Type `start phase 8` in a new chat.

## Done

- Phases 0–6 (2026-07-19 → 2026-08-03): data layer, domain logic, Server Actions, UI primitives, bottom-sheet entry form, three charts and four stat tiles.
- Build OS check and product-sense pass (2026-10-15): [product_sense.md](product_sense.md); PLAN.md in phase format; PRD and ARCHITECTURE in line with the code.
- Phase 7 (2026-10-15), code side:
  - Edit in History: Edit (1 tap) swaps the row for the shared entry form; Save is the 2nd tap.
  - Editing an old entry: the Date column shows the entry's own date ±7 days, never past today (owner's choice).
  - A failed save keeps the form open with a message and the entry still filled in, in both the sheet and History. Create/update now return a result instead of throwing.
  - Wake before bed shows "Wake time must be after bed time." in the form instead of the full-page error.

## Not done

- Phase 7 owner check: on the phone, edit a real entry and confirm the charts reflect it; log a new entry and confirm the sheet closes.
- Phase 8: deploy. Unknown whether a Vercel deploy exists; this folder isn't linked to a Vercel project and the Vercel CLI isn't installed.

## Decisions

- v1 is single-user, no accounts. "People like me" (other self-trackers) is the later user.
- Nothing new to build beyond finishing the plan: the only pain found ("forgot to log → guessed later") is small and logged with a revisit trigger.
- v1 leaves out: accounts, reminders, CSV export / bulk delete.
- Success: over any 30 days, ≥28 nights logged and ≥90% logged the same day as waking.
- One form for create and edit (`SleepEntryForm`); `NewEntryForm` closes the sheet on success; `CloseSheetOnSave` removed.

## Open questions

- Production database: same Neon DB as dev, or a separate one? Decide before Phase 8.
- Top risk, no mitigation chosen: the whole record lives in one database with no export or backup.
- Product-level questions (one tracker or many, what the data answers, when to open it up): [product_sense.md §10](product_sense.md#10-open-questions).

## Known issues

- `drizzle.config.ts` error message says `.env.local`; the project uses `.env`. Fixed in Phase 8.
- A failed **delete** still goes to the full-page error screen. Acceptable for now: nothing being typed is lost.

## Files changed in Phase 7

`app/actions/sleep-entries.ts`, `lib/sleep/duration.ts` (`isWakeAfterBed`), `components/ui/WheelDateTimePicker.tsx` (`dateWindow`), `components/sleep/SleepEntryForm.tsx` (now client, create + edit), `components/sleep/NewEntryForm.tsx` (new), `components/sleep/EditableEntryCard.tsx` (new), `components/sleep/SleepHistoryList.tsx`, `components/sleep/SleepEntrySheet.tsx` (comment), `app/page.tsx`, `components/sleep/CloseSheetOnSave.tsx` (deleted), `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/PLAN.md`, `docs/STATUS.md`.

## Checks

- Run: type-check (`tsc --noEmit`) and lint, both clean. Browser at 390px width, in Edge with motion off, against the dev server: History renders with Edit/Delete per row; Edit opens the form with the entry's own times and note; a July entry's date wheel shows its own dates (Jul 18 → 19); wake before bed shows the in-form message, keeps the form open and keeps the note (rejected before any DB write); dashboard sheet still opens by default.
- Not run: a successful save in the browser (it would change real data; left to the owner's phone check); a DB failure on save (can't simulate locally; the code path returns the message, untested); production build; tests (none exist).
