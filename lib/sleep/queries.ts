import { desc, eq, gte, sql } from 'drizzle-orm'

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

export async function getRecentEntries(days: number): Promise<SleepEntry[]> {
  const cutoff = daysBefore(new Date(), days - 1)
  return db
    .select()
    .from(sleepEntries)
    .where(gte(sleepEntries.wakeTime, cutoff))
    .orderBy(desc(sleepEntries.wakeTime))
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
