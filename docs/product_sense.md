# SleepX — Product Sense

First pass: 2026-10-15. Update this file when the thinking changes. [PRD.md](PRD.md) holds the build-level detail; this file holds the why.

## 1. Goal

Help a hand-logging self-tracker keep a complete, honest record of their sleep, so that they can answer "am I sleeping enough?" with facts instead of a feeling.

## 2. User

A self-tracker who logs several parts of their life by hand for the love of tracking, and has no wearable or automatic source for sleep. They log on their phone around waking or bedtime, want each log to feel smooth, and have no goal yet beyond the record itself; one may show up once there's enough data.

v1 serves one such person: the owner. Other self-trackers are the later user (see open questions).

## 3. The decision it serves

"Am I sleeping enough, or do I need to change something?"

## 4. Pain points along the journey

| Stage | Friction |
|---|---|
| 1. Going to bed | None reported |
| 2. Waking up | Forget to log the night — busy, other things come first |
| 3. Logging | None reported |
| 4. Later that day/week | The missed night is backfilled by guessing the times |
| 5. Looking back | None reported |

Stages 2 and 4 are one pain: forgetting causes the guess.

Considered and rejected as not real for this user: not knowing actual sleep onset (only bed time), recalling times while groggy, distrusting a record with gaps.

## 5. Picked pain

**None picked to build.** "Forgot to log → guessed later" happens a couple of times a month and is mild (guesses land within ~30 min, backfilled within a day). Small frequency × small cost.

Logged with a revisit trigger: **revisit if it starts happening weekly, or guesses drift past 30 minutes.**

## 6–7. Solutions and priority

For the logged pain, considered, not built:

- **Do nothing** — keep backfilling by hand; guesses are close enough. Chosen.

## 8. First version

What's built today, plus finishing [PLAN.md](PLAN.md):

- Edit an entry from History in ≤2 clicks (PRD §3) — built in Phase 7
- A decided look, set from §2's context of use (Phase 8, `docs/design.md`)
- Deploy to Vercel (Phase 9)

Single user, no accounts.

**Deliberately left out:** accounts / other users; reminders; CSV export and bulk delete.

**Top risk:** losing the record. All data lives in one Neon database with no export or backup, and export is left out of v1. The record is the goal, so losing it loses the product. No mitigation chosen yet.

## 9. Success measure

Over any 30 days: at least 28 nights have an entry, and at least 90% of entries were logged the same day as waking (`createdAt` vs the entry's wake date — measurable from existing data, no new feature).

## 10. Open questions

- **One tracker or many?** Should sleep stay its own app, or become one log inside a broader self-tracking tool alongside the other things tracked by hand?
- **What does the data answer?** After a few weeks of entries, is "am I sleeping enough?" still the question, or has a better one shown up?
- **When to open it up?** What would make accounts for other self-trackers worth it, and which sign-in (single passcode, magic link, or full OAuth)?
