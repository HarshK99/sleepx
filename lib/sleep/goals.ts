/**
 * Hardcoded sleep goals, used only to draw a reference line and anchor each
 * chart's Y-axis to a fixed, round-numbered scale (see each chart's own
 * comment). Not user-configurable yet — deliberately simple for now; if
 * goals ever become editable, this is the one place to replace with a
 * per-user setting.
 */

/** 7 hours, in minutes — SleepChart's goal. */
export const SLEEP_GOAL_MINUTES = 7 * 60

/** 11:30 PM, in raw minutes-since-midnight (before toBedTimeAxisMinutes) — BedTimeChart's goal. */
export const BEDTIME_GOAL_MINUTES = 23 * 60 + 30

/** 7:00 AM, in minutes-since-midnight — WakeTimeChart's goal. */
export const WAKE_TIME_GOAL_MINUTES = 7 * 60
