import { desc, eq, gte, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

import { db } from '@/lib/db/client'
import { sleepEntries } from '@/lib/db/schema'

import { APP_TIMEZONE, computeDurationMinutes, daysBefore, getWakeDate } from './duration'
import type { SleepEntry } from './types'

/**
 * APP_TIMEZONE is embedded via sql.raw (a trusted internal constant, never
 * user input) rather than as a bound `${APP_TIMEZONE}` parameter: Drizzle
 * gives each interpolation of a reused `sql` template its own placeholder,
 * and Postgres's GROUP BY column-matching is syntactic, so two placeholders
 * bound to the same value still don't count as the same expression. Reusing
 * this exact template in select/groupBy/orderBy needs byte-identical SQL
 * text, which a bound parameter can't guarantee.
 */
const wakeDateSql = sql<string>`(${sleepEntries.wakeTime} AT TIME ZONE ${sql.raw(`'${APP_TIMEZONE}'`)})::date`

/** Minutes since midnight (in APP_TIMEZONE) of the earliest value of `column` in the group — see getFirstWakeTimes/getFirstBedTimes. */
function firstTimeOfDayMinutesSql(column: AnyPgColumn) {
  return sql<number>`extract(epoch from (min(${column}) AT TIME ZONE ${sql.raw(`'${APP_TIMEZONE}'`)})::time) / 60`
}

const firstWakeMinutesSql = firstTimeOfDayMinutesSql(sleepEntries.wakeTime)
const firstBedMinutesSql = firstTimeOfDayMinutesSql(sleepEntries.bedTime)

type EntryInput = {
  bedTime: Date
  wakeTime: Date
  note?: string | null
}

export async function insertEntry(input: EntryInput): Promise<SleepEntry> {
  const durationMinutes = computeDurationMinutes(input.bedTime, input.wakeTime)

  const [entry] = await db
    .insert(sleepEntries)
    .values({
      bedTime: input.bedTime,
      wakeTime: input.wakeTime,
      durationMinutes,
      note: input.note ?? null,
    })
    .returning()

  return entry
}

export async function updateEntry(id: string, input: EntryInput): Promise<SleepEntry> {
  const durationMinutes = computeDurationMinutes(input.bedTime, input.wakeTime)

  const [entry] = await db
    .update(sleepEntries)
    .set({
      bedTime: input.bedTime,
      wakeTime: input.wakeTime,
      durationMinutes,
      note: input.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(sleepEntries.id, id))
    .returning()

  return entry
}

export async function deleteEntry(id: string): Promise<void> {
  await db.delete(sleepEntries).where(eq(sleepEntries.id, id))
}

export async function getEntryById(id: string): Promise<SleepEntry | undefined> {
  const [entry] = await db.select().from(sleepEntries).where(eq(sleepEntries.id, id)).limit(1)
  return entry
}

export async function getAllEntries(): Promise<SleepEntry[]> {
  return db.select().from(sleepEntries).orderBy(desc(sleepEntries.wakeTime))
}

export type DailyTotal = {
  date: string
  totalMinutes: number
}

/**
 * The one place that sums multiple same-day entries (e.g. a night's sleep +
 * a nap) into a per-day total, grouped by the wake-date rule in duration.ts.
 * The chart consumes this directly and does no aggregation of its own.
 *
 * Always returns exactly `days` entries — one per calendar day, oldest
 * first, zero-filled for days with no entries — so callers never need to
 * fill gaps themselves.
 */
export async function getDailyTotals(days: number): Promise<DailyTotal[]> {
  const cutoff = daysBefore(new Date(), days - 1)

  const rows = await db
    .select({
      date: wakeDateSql.as('date'),
      totalMinutes: sql<number>`sum(${sleepEntries.durationMinutes})`.mapWith(Number).as('total_minutes'),
    })
    .from(sleepEntries)
    .where(gte(sleepEntries.wakeTime, cutoff))
    .groupBy(wakeDateSql)
    .orderBy(wakeDateSql)

  const totalsByDate = new Map(rows.map((row) => [row.date, row.totalMinutes]))
  const now = new Date()

  return Array.from({ length: days }, (_, i) => {
    const date = getWakeDate(daysBefore(now, days - 1 - i))
    return { date, totalMinutes: totalsByDate.get(date) ?? 0 }
  })
}

export type FirstWakeTime = {
  date: string
  /** Minutes since midnight, or null for a day with no logged entry — never zero-filled, since "00:00" would misrepresent a day with no data as a midnight wake-up. */
  wakeTimeMinutes: number | null
}

/**
 * The *earliest* wake time logged on each day — the main night's sleep, not
 * a later same-day nap. This falls out of the day-attribution rule for
 * free: a nap's wake_time is always later in the same calendar day than the
 * main sleep's, so MIN(wake_time) per day picks the main sleep without
 * needing to know which entry "is" the nap.
 *
 * Always returns exactly `days` entries like getDailyTotals, but gaps stay
 * `null` rather than 0 — SleepChart's zero-fill doesn't apply here, there's
 * no meaningful "zero" wake time.
 */
export async function getFirstWakeTimes(days: number): Promise<FirstWakeTime[]> {
  const cutoff = daysBefore(new Date(), days - 1)

  const rows = await db
    .select({
      date: wakeDateSql.as('date'),
      wakeTimeMinutes: firstWakeMinutesSql.mapWith(Number).as('wake_time_minutes'),
    })
    .from(sleepEntries)
    .where(gte(sleepEntries.wakeTime, cutoff))
    .groupBy(wakeDateSql)
    .orderBy(wakeDateSql)

  const minutesByDate = new Map(rows.map((row) => [row.date, Math.round(row.wakeTimeMinutes)]))
  const now = new Date()

  return Array.from({ length: days }, (_, i) => {
    const date = getWakeDate(daysBefore(now, days - 1 - i))
    return { date, wakeTimeMinutes: minutesByDate.get(date) ?? null }
  })
}

export type FirstBedTime = {
  date: string
  /** Minutes since midnight, or null for a day with no logged entry — never zero-filled, same reasoning as FirstWakeTime. */
  bedTimeMinutes: number | null
}

/**
 * The bed time of each day's *main* sleep, not a same-day nap's — mirrors
 * getFirstWakeTimes' MIN(wake_time) trick, but for bed_time: a same-day
 * nap's bed_time is always later in real time than the main sleep's
 * (afternoon/evening vs. the previous night), so MIN(bed_time) within the
 * same wake-date group picks the main sleep's bed time for free, no "is
 * nap" flag needed. Still grouped by wake date, not bed date — day
 * attribution is always by wake date, per the PRD.
 */
export async function getFirstBedTimes(days: number): Promise<FirstBedTime[]> {
  const cutoff = daysBefore(new Date(), days - 1)

  const rows = await db
    .select({
      date: wakeDateSql.as('date'),
      bedTimeMinutes: firstBedMinutesSql.mapWith(Number).as('bed_time_minutes'),
    })
    .from(sleepEntries)
    .where(gte(sleepEntries.wakeTime, cutoff))
    .groupBy(wakeDateSql)
    .orderBy(wakeDateSql)

  const minutesByDate = new Map(rows.map((row) => [row.date, Math.round(row.bedTimeMinutes)]))
  const now = new Date()

  return Array.from({ length: days }, (_, i) => {
    const date = getWakeDate(daysBefore(now, days - 1 - i))
    return { date, bedTimeMinutes: minutesByDate.get(date) ?? null }
  })
}
