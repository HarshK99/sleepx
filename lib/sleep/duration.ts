const MINUTE_MS = 60_000

/** Used to build fixed wall-clock defaults (e.g. "yesterday 23:00") from a daysBefore() midnight instant. */
export const HOUR_MS = 60 * MINUTE_MS

/**
 * Single-user app, one place in the world. If that stops being true, this
 * needs to become per-user data instead of a constant. IST (no DST), so a
 * fixed offset would also work, but this goes through Intl/`AT TIME ZONE`
 * (see getTimeZoneOffsetMinutes and queries.ts's wakeDateSql) so changing
 * this to any other IANA zone name — DST or not — just works.
 */
export const APP_TIMEZONE = 'Asia/Kolkata'

/**
 * Time entry granularity, per the PRD: bed/wake times are picked in
 * 15-minute steps, not to-the-minute. `components/ui/WheelDateTimePicker.tsx`
 * is the only other place this shows up, generating its Minute column.
 */
export const MINUTE_STEP = 15

const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

const offsetProbeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/**
 * Minutes to add to a UTC instant to get its wall-clock time in
 * APP_TIMEZONE. Computed via Intl rather than a hardcoded offset so it stays
 * correct even if APP_TIMEZONE is ever changed to a zone that observes DST.
 */
function getTimeZoneOffsetMinutes(instant: Date): number {
  const parts = Object.fromEntries(offsetProbeFormatter.formatToParts(instant).map((p) => [p.type, p.value]))
  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return (asIfUTC - instant.getTime()) / MINUTE_MS
}

/**
 * Parses a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") as a
 * wall-clock time in APP_TIMEZONE, independent of the runtime's own system
 * timezone (never relies on `new Date(string)`, whose no-offset parsing
 * behavior depends on the environment).
 */
export function parseWallClockDateTime(value: string): Date {
  const match = WALL_CLOCK_PATTERN.exec(value)
  if (!match) {
    throw new Error(`Invalid datetime-local value: ${value}`)
  }
  const [, year, month, day, hour, minute] = match
  const naiveUTC = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(naiveUTC))
  return new Date(naiveUTC - offsetMinutes * MINUTE_MS)
}

/**
 * The inverse of parseWallClockDateTime: formats a Date back into the
 * "YYYY-MM-DDTHH:mm" shape a datetime-local input expects, as wall-clock time
 * in APP_TIMEZONE, so defaultValue props round-trip exactly.
 */
export function formatForTimeInput(date: Date): string {
  const parts = Object.fromEntries(offsetProbeFormatter.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function minutesBetween(bedTime: Date, wakeTime: Date): number {
  return Math.round((wakeTime.getTime() - bedTime.getTime()) / MINUTE_MS)
}

/**
 * The one validity rule for an entry: wake time strictly after bed time.
 * The Server Actions check this first so the form can show a message;
 * computeDurationMinutes still enforces it as a last line of defense.
 */
export function isWakeAfterBed(bedTime: Date, wakeTime: Date): boolean {
  return minutesBetween(bedTime, wakeTime) > 0
}

export function computeDurationMinutes(bedTime: Date, wakeTime: Date): number {
  if (!isWakeAfterBed(bedTime, wakeTime)) {
    throw new Error('wakeTime must be after bedTime')
  }
  return minutesBetween(bedTime, wakeTime)
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
 * at that day's midnight (wall-clock, APP_TIMEZONE). The one place "N days
 * ago" is computed — used for both date-range generation
 * (WheelDateTimePicker, getDailyTotals, getFirstWakeTimes) and their query
 * cutoffs, so they can't drift out of sync with each other or with
 * getWakeDate's day-attribution rule.
 */
export function daysBefore(reference: Date, days: number): Date {
  const parts = Object.fromEntries(offsetProbeFormatter.formatToParts(reference).map((p) => [p.type, p.value]))
  const naiveUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - days)
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(naiveUTC))
  return new Date(naiveUTC - offsetMinutes * MINUTE_MS)
}
