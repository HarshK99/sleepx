# SleepX — Product Requirements

The goal, user, pains and success measure live in [product_sense.md](product_sense.md). This doc is the build-level spec: flow, scope, data rules, non-functional requirements.

## 1. Product principle

Logging a night's sleep takes one screen and one save — no multi-step wizards, no mandatory fields beyond the two that matter.

## 2. Users in v1

Just the app owner. Single-user, no accounts, no auth. The data model should not need a rewrite to add auth later (see [ARCHITECTURE.md](ARCHITECTURE.md#future-multi-user-path)), but nothing in v1 should be built to accommodate it prematurely.

## 3. Core user flow

1. Open the app (on a phone, most of the time). Land on the dashboard: the stat tiles and the sleep chart are at the top.
2. The quick-entry form is **open by default, as a bottom sheet, with zero clicks** — **bed time**, **wake time**, and an **optional note**, pre-filled with sensible defaults (bed time = yesterday 11:00 PM, wake time = today 7:00 AM — both fixed clock times in APP_TIMEZONE, not "now"), editable via scroll-wheel pickers (see §6). The first time you land in a new session, nothing needs to be tapped to reach it.
3. Tap **Save**. One submit, no confirmation step. The sheet **closes automatically on a successful save**, back to the chart; a failed save (wake before bed, or a connection hiccup) keeps it open with a message and the entry still filled in. Logging a second same-day entry (e.g. a nap) means reopening it via the + FAB, same as after an explicit close.
4. Dashboard updates in place: the new entry is reflected in the chart immediately.
5. The sheet can be dismissed (× or tapping the backdrop) to see the full chart unobstructed, and reopened any time via a **+** button. That closed/open choice is remembered only for the current session (`sessionStorage`) — the **next new session opens it again automatically**, so the zero-click default always comes back.
6. The form is always available for a new entry (once the sheet's open) — there is no "one entry per day" restriction. An evening nap is logged the same way as a night's sleep: bed time and wake time for that nap. Both entries count toward the same day's total (see §5).
7. Optionally, visit **History** to see every past entry and edit or delete one.

Editing a mistake (wrong time, duplicate entry) must be reachable in ≤2 clicks from History.

**On the bottom-sheet decision:** this replaces an earlier stricter rule ("never gate the form behind a FAB/modal/bottom sheet") with a narrower one — zero clicks *the first time each session*, at the cost of one click (the + FAB) to log a second entry after closing it. That's a deliberate, explicit trade the project owner chose over the stricter always-inline version; it is not an oversight and shouldn't be "fixed" back without checking here first.

## 4. Features

Every feature traces to [product_sense.md](product_sense.md): the **goal** (a complete, honest record), the **decision** ("Am I sleeping enough, or do I need to change something?"), or a **pain** (§4 there). A feature that traces to none of them is a candidate to remove. Check this table after any product-sense change and whenever a feature is added. Data is stored in Neon Postgres and deployed on Vercel; that's infrastructure, not a feature.

| Feature | What it lets the user do | Serves | Status |
|---|---|---|---|
| Entry sheet, open by default | Log a night with zero taps to reach the form, the first time each session; + button reopens it; closes on a successful save, stays open with a message on a failed one (§3) | Goal: same-morning logging | Built |
| Default times | Start from bed 11 PM yesterday, wake 7 AM today (fixed clock times in APP_TIMEZONE), so most nights need little change | Goal | Built |
| Scroll-wheel time pickers | Pick date / hour / minute one-thumbed, in 15-minute steps; hour and minute wheels loop (§6) | Goal | Built |
| 14-day backfill | Log a missed night up to 14 days back | Pain: "guessed later" | Built |
| Several entries per day | Log a nap separately; it counts toward that day's total (§5) | Goal, decision | Built |
| Optional note | Add context like "woke up twice" that makes a night's numbers honest | Goal: honest record | Built |
| Today's sleep tile | See today's total so far ("—" before anything's logged) | Decision | Built |
| Avg sleep tile | See average hours over 14 days, counting only days with an entry | Decision | Built |
| Avg bed / wake time tiles | See the typical main-sleep bed and wake time over 14 days (naps excluded) | Decision: "change something" half | Built |
| Sleep chart | See total hours per day for the last 14 days against a fixed 7h line (`lib/sleep/goals.ts`, not user-configurable) | Decision | Built |
| History: edit | Fix a wrong entry in ≤2 taps; the date wheel covers the entry's own date ±7 days, so old entries can be fixed | Goal: honest record | Built |
| History: delete | Remove a duplicate or mistaken entry | Goal: honest record | Built |
| Bed-time and wake-time charts | Per-day bed and wake time against 11:30 PM / 7 AM goal lines | "What to change", not the chosen decision; goals the owner doesn't have | Removed 2026-10-15 |
| Record-completeness tile | See "28 of 30 nights logged" (product_sense.md §9's success measure) | Goal: complete record | Considered — build if the owner wants to watch the success measure without a DB query (record trust isn't a pain today) |
| Missed-night marker | See on the dashboard that last night has no entry, while memory is fresh | Pain: "guessed later" | Considered — build if that pain's trigger fires (weekly, or guesses past 30 min) |
| Morning nudge | A reminder after the usual wake time if nothing's logged | Pain: "guessed later" | Considered — only if the trigger fires *and* the missed-night marker didn't fix it; reminders are out of scope for v1 |

**Out of scope for v1** (captured for later, not rejected):
- User accounts / authentication
- Real-time "going to sleep now" / "just woke up" toggle logging
- Sleep quality rating
- Reminders/notifications
- CSV export / bulk delete in History
- Multi-device sync beyond "it's a normal web app with one shared DB"
- Native mobile app / PWA install prompts
- Smarter form defaults when logging a second same-day entry (e.g. detecting "this looks like a nap")

## 5. Data model (summary)

One entity: **Sleep Entry** — `bedTime`, `wakeTime`, derived `durationMinutes`, optional `note`, timestamps. Full schema lives in [ARCHITECTURE.md](ARCHITECTURE.md#data-model).

Design rules:
- A sleep session is defined by two timestamps, not by a "date". The date it's attributed to is derived (the **wake date**), never stored redundantly as a separately-editable field.
- **Which day does an overnight entry count for?** The wake date. Bed time 11:00 PM Monday → wake time 7:00 AM Tuesday is attributed entirely to **Tuesday** — it's the answer to "how much did I sleep last night" when asked on Tuesday morning, which is the framing that matches how someone actually uses this app.
- **A day's total is the sum of every entry whose wake date is that day.** So Tuesday's total = the overnight entry above + a same-day nap (e.g. 2:00–3:00 PM Tuesday, which also has wake date Tuesday). No entry is ever split across two days.

## 6. Non-functional requirements

- **Minimal clicks** is the product's core differentiator — every future feature proposal should be evaluated against "does this add a click to the core flow?" Concretely: **the first time each session, opening the app must not require a click to reveal the entry form** — it's a bottom sheet that starts open, not collapsed. Once explicitly dismissed within a session, reopening it via the + FAB is an accepted, deliberate exception to "zero clicks" (see §3) — don't extend that exception anywhere else without the same explicit sign-off.
- **Mobile-first, not just mobile-friendly.** This is designed for a phone, held by someone who just woke up (or is about to sleep), not a desktop dashboard that happens to be responsive:
  - Design and build for a ~375–430px viewport first; widen up to tablet/desktop afterward, not the other way around.
  - Single-column layout — no side-by-side panels that only make sense on wide screens.
  - The primary action (Save) must be within easy thumb reach and sized as a proper touch target (≥44px).
  - No interactions that depend on hover (tooltips-on-hover, hover-to-reveal menus) — everything must work on tap alone.
  - Bed time and wake time are entered via a **scroll-wheel ("slot machine") picker** — three columns (Date / Hour / Minute) that spin and snap like an iOS-style picker, rather than native `<input type="date/time">` fields. This is a deliberate, considered departure from "native inputs by default": it reads faster at a glance and is easier to operate one-thumbed, half-asleep, than typing/tapping into native fields.
  - Bed time and wake time are entered in **15-minute increments only** (:00/:15/:30/:45) — sleep tracking doesn't need to-the-minute precision, and skipping it means fewer stops on the minute wheel. The Minute column only ever shows those four values.
  - The Date column covers **today back 14 days**, enough to backfill a missed entry without an unbounded list to spin through; anything older is edited from History instead.
- **The core save action now requires JavaScript.** The wheel picker is an interactive widget with no meaningful non-JS fallback, so the earlier "works with JS disabled" requirement for this flow is dropped — it was written for native-input forms and no longer applies once the picker replaced them. The rest of the app (page loads, navigation) stays as lightweight as the framework gives us for free, but the entry form itself is JS-dependent by design now.
- No dark patterns, no unnecessary loading spinners on the critical path.

## 7. UI status

Today's UI is a placeholder: functional, cleanly structured, easy to restyle. The look gets decided once in the design phase ([PLAN.md](PLAN.md) Phase 8), recorded in `docs/design.md`. After that the owner still refines each piece individually, but inside that direction and its tokens. Until Phase 8 is done, don't polish visuals speculatively.

## 8. Open questions / backlog (revisit later)

Product-level questions (accounts and sign-in, one tracker or many, what the data answers) are in [product_sense.md](product_sense.md#10-open-questions). Build-level ones:

- Chart range is fixed at 14 days for v1 (see §4). Revisit if a longer trend view turns out to matter.
- Should History group entries by day (showing the daily total with entries nested under it) once multi-entry days are common, rather than a flat list?
- Resolved: the Hour and Minute wheels loop (00 follows 23), via `components/ui/LoopingWheelColumn.tsx`; the Date wheel's range is bounded, so it stays on `react-mobile-picker` and doesn't loop. ARCHITECTURE.md's directory map has the why.
