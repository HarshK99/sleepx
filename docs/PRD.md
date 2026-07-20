# SleepX — Product Requirements

## 1. Vision

A sleep tracker that's faster to use than the thought "how much sleep did I get?" Logging a night's sleep should take one screen and one save — no multi-step wizards, no mandatory fields beyond the two that matter.

## 2. Target user (v1)

Just the app owner. Single-user, no accounts, no auth. The data model should not need a rewrite to add auth later (see [ARCHITECTURE.md](ARCHITECTURE.md#future-multi-user-path)), but nothing in v1 should be built to accommodate it prematurely.

## 3. Core user flow

1. Open the app (on a phone, most of the time). Land on the dashboard: the trend chart is at the top, the quick-entry form directly below it.
2. The quick-entry form is **already on screen, unconditionally** — **bed time**, **wake time**, and an **optional note**, pre-filled with sensible defaults (bed time = yesterday 11:00 PM, wake time = now), editable via scroll-wheel pickers (see §6). There is no "Add entry" button to tap first; nothing is hidden behind a sheet, modal, or FAB that must be opened, and no scrolling past other content is required to reach it on a normal phone screen — it just isn't the literal first pixel anymore now that the chart leads.
3. Tap **Save**. One submit, no confirmation step.
4. Dashboard updates in place: the new entry is reflected in the chart immediately.
5. The form is always available for a new entry — there is no "one entry per day" restriction. An evening nap is logged the same way as a night's sleep: bed time and wake time for that nap. Both entries count toward the same day's total (see §5).
6. Optionally, visit **History** to see every past entry and edit or delete one.

Editing a mistake (wrong time, duplicate entry) must be reachable in ≤2 clicks from History.

## 4. MVP scope

**In scope:**
- Quick-entry form (bed time + wake time → duration is derived, never entered manually)
- Optional free-text note per entry (e.g. "woke up twice", "afternoon nap")
- Multiple entries per day (e.g. a night's sleep + a nap) — each logged independently, both count toward that day's total
- Dashboard chart: **total** hours slept per day (sum of all that day's entries), fixed to the most recent 14 days (matches the picker's backfill window; no range selector in v1 — see §8)
- History page: full list of entries, each editable and deletable
- Data persisted in Neon Postgres, deployed on Vercel

**Explicitly out of scope for v1** (captured for later, not rejected):
- User accounts / authentication
- Real-time "going to sleep now" / "just woke up" toggle logging
- Sleep quality rating
- Reminders/notifications
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

- **Minimal clicks** is the product's core differentiator — every future feature proposal should be evaluated against "does this add a click to the core flow?" Concretely: **opening the app must not require a click to reveal the entry form.** No "Add entry" button, no FAB-triggered modal, no bottom sheet that starts collapsed. The form is rendered directly on the dashboard, visible immediately.
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

UI components are intentionally minimal/placeholder in this phase. The user will share and refine each piece of UI individually — do not polish visuals speculatively; build functional, cleanly-structured components that are easy to restyle.

## 8. Open questions / backlog (revisit later)

- Chart range: **decided for v1 — fixed 14 days, no selector** (see §4). Revisit if a longer trend view turns out to matter.
- Should History support bulk delete / CSV export?
- If auth is added later: single passcode vs. magic link vs. full OAuth?
- Should History group entries by day (showing the daily total with entries nested under it) once multi-entry days are common, rather than a flat list?
