const MINUTE_MS = 60_000

/**
 * Single-user app, one place in the world. If that stops being true, this
 * needs to become per-user data instead of a constant.
 */
export const APP_TIMEZONE = 'UTC'

/**
 * Time entry granularity, per the PRD: bed/wake times are picked in
 * 15-minute steps, not to-the-minute. `components/ui/WheelDateTimePicker.tsx`
 * is the only other place this shows up, generating its Minute column.
 */
export const MINUTE_STEP = 15

const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/**
 * Parses a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") as a
 * wall-clock time in APP_TIMEZONE, independent of the runtime's own system
 * timezone (never relies on `new Date(string)`, whose no-offset parsing
 * behavior depends on the environment). Only supports APP_TIMEZONE = 'UTC'
 * today — update this if APP_TIMEZONE ever becomes a real IANA zone with DST.
 */
export function parseWallClockDateTime(value: string): Date {
  const match = WALL_CLOCK_PATTERN.exec(value)
  if (!match) {
    throw new Error(`Invalid datetime-local value: ${value}`)
  }
  if (APP_TIMEZONE !== 'UTC') {
    throw new Error('parseWallClockDateTime only supports APP_TIMEZONE = UTC')
  }
  const [, year, month, day, hour, minute] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
}

/**
 * The inverse of parseWallClockDateTime: formats a Date back into the
 * "YYYY-MM-DDTHH:mm" shape a datetime-local input expects, using the same
 * UTC-as-wall-clock convention, so defaultValue props round-trip exactly.
 */
export function formatForTimeInput(date: Date): string {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mi = String(date.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

/** Rounds a Date to the nearest MINUTE_STEP, so computed defaults line up with the input's own step. */
export function roundToNearestStep(date: Date): Date {
  const stepMs = MINUTE_STEP * MINUTE_MS
  return new Date(Math.round(date.getTime() / stepMs) * stepMs)
}

export function computeDurationMinutes(bedTime: Date, wakeTime: Date): number {
  const minutes = Math.round((wakeTime.getTime() - bedTime.getTime()) / MINUTE_MS)
  if (minutes <= 0) {
    throw new Error('wakeTime must be after bedTime')
  }
  return minutes
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

const wakeDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * The day-attribution rule from the PRD: an entry belongs to the calendar
 * date of its wake time (in APP_TIMEZONE), not its bed time. Returns
 * YYYY-MM-DD. This must stay the single source of truth for "which day" —
 * lib/sleep/queries.ts mirrors it in SQL for aggregate queries, so if this
 * rule changes, update both.
 */
export function getWakeDate(wakeTime: Date): string {
  return wakeDateFormatter.format(wakeTime)
}

/**
 * The calendar day `days` before `reference`, in APP_TIMEZONE, as an instant
 * at that day's midnight. The one place "N days ago" is computed — used for
 * both date-range generation (WheelDateTimePicker, getDailyTotals,
 * getFirstWakeTimes) and their query cutoffs, so they can't drift out of
 * sync with each other or with getWakeDate's day-attribution rule.
 */
export function daysBefore(reference: Date, days: number): Date {
  if (APP_TIMEZONE !== 'UTC') {
    throw new Error('daysBefore only supports APP_TIMEZONE = UTC')
  }
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() - days))
}
