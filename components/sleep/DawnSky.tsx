'use client'

import { useSyncExternalStore, type CSSProperties } from 'react'

import { wallClockMinutesOfDay } from '@/lib/sleep/clockTime'

/**
 * The sky behind every page (docs/design.md, "Dawn sky"): a fixed pre-dawn
 * gradient with a sunrise layer faded in by `light` (0 → 1).
 *
 * - At rest, `restingLight` decides it: the page passes ~0.15 (pre-dawn)
 *   until today is logged, 1 (morning) after.
 * - While an entry form is on screen, the sky follows its wake-time wheel
 *   instead (5 AM dark → 10 AM full), so logging the night moves the light.
 * - On a successful save, a wash of light rises from the Save button.
 *
 * The form talks to this through the two functions below — a tiny module
 * store, the same pattern as SleepEntrySheet's open state, so no Context is
 * needed between a form inside the sheet and the sky outside it.
 */
type SkyState = { pickedWakeMinutes: number | null; sunrise: { x: number; y: number; id: number } | null }

let state: SkyState = { pickedWakeMinutes: null, sunrise: null }
const listeners = new Set<() => void>()
const SERVER_STATE: SkyState = { pickedWakeMinutes: null, sunrise: null }

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function update(next: Partial<SkyState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/** A form's current wake-time value ("YYYY-MM-DDTHH:mm"), or null when no form is on screen. */
export function setPickedWakeTime(value: string | null) {
  update({ pickedWakeMinutes: value === null ? null : wallClockMinutesOfDay(value) })
}

/** Starts the sunrise wash, centred on the given point (the Save button). */
export function playSunriseFrom(rect: DOMRect) {
  update({ sunrise: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, id: Date.now() } })
}

const DARK_WAKE_MINUTES = 5 * 60
const FULL_WAKE_MINUTES = 10 * 60

/** Sky brightness for a wake time: 5 AM → nearly dark, 10 AM → full morning. Also used by the form's live SunScene. */
export function lightForWake(wakeMinutes: number): number {
  const t = (wakeMinutes - DARK_WAKE_MINUTES) / (FULL_WAKE_MINUTES - DARK_WAKE_MINUTES)
  return Math.min(Math.max(t, 0.05), 1)
}

export function DawnSky({ restingLight }: { restingLight: number }) {
  const sky = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE)
  const light = sky.pickedWakeMinutes === null ? restingLight : lightForWake(sky.pickedWakeMinutes)

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, var(--predawn-top), var(--predawn-mid) 46%, var(--predawn-low))' }}
      >
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-[var(--ease-out)]"
          style={{ background: 'linear-gradient(180deg, var(--sunrise-top), var(--sunrise-mid) 44%, var(--sunrise-low))', opacity: light }}
        />
      </div>
      {sky.sunrise && (
        <div
          key={sky.sunrise.id}
          aria-hidden
          className="pointer-events-none fixed z-[60] h-[220vmax] w-[220vmax] rounded-full opacity-0"
          style={
            {
              left: sky.sunrise.x,
              top: sky.sunrise.y,
              transform: 'translate(-50%, -50%) scale(0.04)',
              background:
                'radial-gradient(circle, rgba(255, 244, 228, 0.95) 0%, rgba(247, 189, 147, 0.55) 32%, rgba(247, 189, 147, 0) 62%)',
              animation: 'sunrise 1000ms var(--ease-out)',
            } as CSSProperties
          }
        />
      )}
    </>
  )
}
