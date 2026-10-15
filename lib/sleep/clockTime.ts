/**
 * Time-of-day (clock time) math for anything averaging or displaying a
 * "what time did X happen" value — distinct from lib/sleep/duration.ts,
 * which owns *duration* math (how long something lasted). Today that's the
 * dashboard's average bed/wake time tiles.
 */

/** Formats "minutes since midnight" (any integer, negative or >= 1440 both wrap correctly) as a 12-hour clock string, e.g. "7:15 AM". */
export function formatClockTime(minutesSinceMidnight: number): string {
  const normalized = ((minutesSinceMidnight % 1440) + 1440) % 1440
  const hour24 = Math.floor(normalized / 60)
  const minute = Math.round(normalized % 60)
  const period = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

/**
 * Minutes since midnight of a "YYYY-MM-DDTHH:mm" wall-clock value (the
 * picker's format, already in APP_TIMEZONE) — e.g. "2026-10-15T07:30" → 450.
 * Reads the clock fields directly; no Date or timezone conversion needed.
 */
export function wallClockMinutesOfDay(value: string): number {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}

/**
 * Shifts a raw 0-1439 "minutes since midnight" value onto a scale centered
 * on midnight (negative = before midnight, positive = after) instead of
 * wrapping at 0/1440. Bed times cluster around midnight (e.g. 11pm-2am), so
 * averaging the raw value would treat 11:30pm (1410) and
 * 12:30am (30) as ~23 hours apart instead of the real 1 — this maps them to
 * -30 and 30, correctly 1 hour apart. Anything at/after noon is treated as
 * "the evening before midnight" since no real bedtime falls there.
 * formatClockTime's own modulo normalizes negative results back to a valid
 * clock time, so a shifted value (or an average of several) can be passed
 * straight into it with no separate "unshift" step.
 */
export function toBedTimeAxisMinutes(minutesSinceMidnight: number): number {
  return minutesSinceMidnight >= 720 ? minutesSinceMidnight - 1440 : minutesSinceMidnight
}
