# SleepX — Design: Dawn sky

Decided 2026-10-15 in Phase 8, following the design step in HOW_I_WORK.md. The chosen mock-up is [design/mockups/dawn-sky.html](design/mockups/dawn-sky.html): open it in a browser's device mode at ~390px. From here on, the owner refines screens piece by piece **inside** this direction and its tokens; a change that breaks it means revisiting this file on purpose.

## 1. Context of use

From [product_sense.md](product_sense.md) §2. Two moments, both in the morning:

- **In bed, just woken**: groggy, dim room, one thumb. This is where logging happens; it must work in seconds, with low glare.
- **Up and about**: daylight, more awake. This is where the glance at today's total and the chart happens.

There is no night use, so this is a morning app, not a "night app" (navy, stars, moons were rejected as the default).

## 2. Feel

**First light**: soft and unhurried, like dawn through a curtain. Gentle on groggy eyes, warm rather than bright, one clear thing to do.

## 3. Direction: Dawn sky

The light *is* the interface. Four moves make it more than a skin:

1. **The sky follows the wheel.** While logging, the page sky (and the form's little sky) brighten with the wake time on the wheel: 5 AM is pre-dawn lavender, 10 AM is full apricot morning. At rest, the sky is pre-dawn until today is logged, then morning.
2. **The sun meets the horizon.** A sun rises with the night's total and clears the horizon at the 7h goal; the total stands on the horizon line, with "1h above 7h" / "45m under 7h" under it. The same scene appears large on the dashboard and small, live, in the entry form. It answers "Am I sleeping enough?" (the decision) without reading a number.
3. **Sunrise on Save.** A wash of light rises from the Save button across the screen (~1s), plus a 12ms vibration where the phone supports it.
4. **No stat boxes.** Today's number is the hero; the 14-day averages are one quiet line of text; the chart sits directly on the sky.

**Rejected** (mock-ups deleted, one line each):
- *B, Linen and ink*: bedside-diary paper and ink, with a "night strip" (each night as a bar from bed to wake time on a shared 9 PM–11 AM line). The strongest signature on paper, but it felt quieter and less like the morning.
- *C, Ember to day*: a warm-dim sheet for in bed, a bright dashboard for later, and Save "opening the curtain". Two token sets to maintain; the mood split felt less coherent than one sky.
- *A v1*: Dawn sky without moves 1–4. It was better than the others but "not wow": the same big-number / three-stats / chart template as every direction, and a signature that only happened once, quietly.

**One look, always**: no dark mode (owner's decision). The pre-dawn state is already low-glare for a dim room.

## 4. Tokens

All in [app/globals.css](../app/globals.css), used through Tailwind names (`text-ink`, `bg-mist`, `text-apricot-deep`, …). No `gray-*` / `blue-*` / `dark:` utilities anywhere.

| Group | Tokens | Value / use |
|---|---|---|
| Sky, pre-dawn | `--predawn-top/mid/low` | `#b9b4cb` → `#d3c6cf` → `#e2c0b4`: the base gradient |
| Sky, sunrise | `--sunrise-top/mid/low` | `#dcd9ea` → `#f6e0d3` → `#f7bd93`: faded in by the light level (0–1) |
| Ink | `ink`, `ink-2`, `ink-3` | `#2e2a3a` plum ink at 100% / 72% / 50%: primary, secondary, muted |
| Horizon | `horizon`, `horizon-soft` | ink at 22% / 12%: the horizon line, row rules, chart goal line |
| Accent | `apricot`, `apricot-deep` | `#f0a274` for Save, `#c66a3c` for "above/under 7h", the 7h tick, under-7h chart dots |
| Sun | `--sun-core`, `--sun-glow` | `#fff4e4` / `#ffc996`, radial |
| Surfaces | `mist`, `mist-strong`, `mist-inset`, `band` | frosted sheet (66%), tooltip / History edit card (86%), control fill (ink 7%), picker selection band (white 72%) |
| Alarm | `alarm` | `#a8413a`: errors, Delete text |
| Type | `font-serif` = Fraunces (opsz), `font-sans` = Figtree | serif for numbers and titles (light, tight tracking), sans for labels and controls; `.label` = 11px / 600 / 0.12em / uppercase / ink-3 |
| Motion | `--ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)` | sheet rise 440ms, sun 1100ms (hero) / 420ms (live), sky light 700ms, sunrise 1000ms; press = scale 0.97; all cut under `prefers-reduced-motion` |
| Shape | — | sheet 28px top radius; Save 18px; controls 14–16px; band 11px |

## 5. Screens and states

| Screen | Job | Primary action | States |
|---|---|---|---|
| Dashboard | See whether today's sleep is enough, and the 14-day trend | + (reopen the sheet) | **Not logged yet** (sun below the horizon, "The sun's still below the horizon.", pre-dawn sky) ✓ · **Logged** (sun up, morning sky) ✓ · **Load failed** (per section, "Couldn't load … try refreshing") ✓ |
| Entry sheet | Log a night in seconds | Save | **Default** (11 PM → 7 AM) ✓ · **Live** (total, sun and sky follow the wheels) ✓ · **Wake before bed** (caption says so, no total; Save returns the in-form error) ✓ · **Saving…** (button) ✓ · **Save failed** (message, entry kept) ✓ · **Saved** (sunrise, sheet closes) ✓ |
| History | Fix or remove a past entry | Edit | **List** ✓ · **Empty** ("No nights logged yet.") ✓ · **Load failed** → error page ✓ |
| History edit | Correct an entry | Save | Same as the entry sheet, in a mist card, plus Cancel ✓ |
| Error page | Recover from anything unexpected | Try again | ✓ |

Not built, not needed now: a loading skeleton (pages are server-rendered in ~0.5s, so a skeleton would only flash), and a slide-*out* animation for the sheet (it unmounts on close; the sunrise covers the save case).

## 6. Checks

2026-10-15, at 390px in Edge (motion on), against the owner's dev server: dashboard (sheet open, wake wheel moved to 9 AM: total 10h, "3h above 7h", sky brightened; sheet closed with real data), the chart (7h tick in the accent, under-7h nights as apricot dots, no-entry days as gaps), History list, History edit, and the wake-before-bed error in edit. No console errors. Type-check and lint clean. Not checked: a real save in the browser (it would change real data; the sunrise was verified in the mock-up), and the feel on the owner's phone in a dim room.
