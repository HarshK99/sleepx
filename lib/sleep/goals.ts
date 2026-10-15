/**
 * Hardcoded sleep goal, used only to draw SleepChart's reference line and
 * anchor its Y-axis to a fixed, round-numbered scale (see SleepChart's own
 * comment). Not user-configurable yet — deliberately simple for now; if
 * goals ever become editable, this is the one place to replace with a
 * per-user setting.
 */

/** 7 hours, in minutes — SleepChart's goal. */
export const SLEEP_GOAL_MINUTES = 7 * 60
