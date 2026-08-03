/**
 * Time-of-day (clock time) math shared by anything charting/averaging a
 * "what time did X happen" value — distinct from lib/sleep/duration.ts,
 * which owns *duration* math (how long something lasted). Single source of
 * truth so WakeTimeChart, BedTimeChart, and the dashboard's average-time
 * stats don't each reimplement clock-time formatting/wraparound handling.
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
 * Same as formatClockTime but without the internal space ("7AM" not "7 AM").
 * Recharts' Y-axis word-wraps a tick label containing a space onto two
 * lines whenever it doesn't fit the axis's reserved width, which "10 AM"/
 * "11 AM" tended to trigger. Used only for axis ticks — the tooltip keeps
 * the spaced, more readable formatClockTime.
 */
export function formatClockTimeCompact(minutesSinceMidnight: number): string {
  return formatClockTime(minutesSinceMidnight).replace(' ', '')
}

/**
 * Shifts a raw 0-1439 "minutes since midnight" value onto a scale centered
 * on midnight (negative = before midnight, positive = after) instead of
 * wrapping at 0/1440. Bed times cluster around midnight (e.g. 11pm-2am), so
 * charting or averaging the raw value would treat 11:30pm (1410) and
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
