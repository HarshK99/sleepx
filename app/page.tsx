import Link from 'next/link'

import { DawnSky } from '@/components/sleep/DawnSky'
import { SleepChart } from '@/components/sleep/SleepChart'
import { NewEntryForm } from '@/components/sleep/NewEntryForm'
import { SleepEntrySheet } from '@/components/sleep/SleepEntrySheet'
import { SunScene } from '@/components/sleep/SunScene'
import { formatClockTime, toBedTimeAxisMinutes } from '@/lib/sleep/clockTime'
import { HOUR_MS, daysBefore, formatDuration, formatForTimeInput } from '@/lib/sleep/duration'
import { getDailyTotals, getFirstBedTimes, getFirstWakeTimes } from '@/lib/sleep/queries'

/**
 * Without this, Next decides nothing here looks "dynamic" (Drizzle-over-Neon
 * queries aren't a tracked `fetch()`, and getDefaultTimes() below is just a
 * plain `new Date()` call) and prerenders this page once at build/deploy
 * time — freezing both the bed/wake date defaults *and* the chart data to
 * whatever they were then. Confirmed via `next build`: without this line the
 * route ships as "○ (Static)". Forces a fresh render (and fresh DB reads)
 * on every request instead.
 */
export const dynamic = 'force-dynamic'

const CHART_RANGE_DAYS = 14

/** Fixed defaults per the PRD: bed time = yesterday 11 PM, wake time = today 7 AM, both in APP_TIMEZONE. */
function getDefaultTimes() {
  const now = new Date()
  const bedTime = new Date(daysBefore(now, 1).getTime() + 23 * HOUR_MS)
  const wakeTime = new Date(daysBefore(now, 0).getTime() + 7 * HOUR_MS)

  return {
    bedTime: formatForTimeInput(bedTime),
    wakeTime: formatForTimeInput(wakeTime),
  }
}

/**
 * Average of only the days that actually have a logged total — zero-filled
 * gap days from getDailyTotals() are excluded so a sparsely-logged history
 * doesn't drag the average down toward zero. Presentation-layer math over
 * data already fetched for the chart, not a new DB query, so it lives here
 * rather than in lib/sleep/queries.ts (see the "Resilience" note above for
 * why this file already owns page-level derived-data decisions).
 */
function averageLoggedMinutes(dailyTotals: { totalMinutes: number }[]): number | null {
  const loggedDays = dailyTotals.filter((day) => day.totalMinutes > 0)
  if (loggedDays.length === 0) return null
  return Math.round(loggedDays.reduce((sum, day) => sum + day.totalMinutes, 0) / loggedDays.length)
}

/**
 * getDailyTotals(days) returns oldest-first, so the last entry is always
 * today's (per the wake-date day-attribution rule) — no new query needed.
 * Null (not 0) when nothing's logged yet today, same "0 would misreport a
 * real value" reasoning as the other stats — most likely early in the day,
 * before you've woken up and logged anything.
 */
function todaysLoggedMinutes(dailyTotals: { totalMinutes: number }[]): number | null {
  const today = dailyTotals.at(-1)
  return today && today.totalMinutes > 0 ? today.totalMinutes : null
}

/**
 * Plain arithmetic mean of whichever days actually have a value — used for
 * the average wake/bed time stats. Both getFirstWakeTimes and
 * getFirstBedTimes already exclude same-day naps (MIN() per day, see their
 * own comments), so no extra nap-filtering is needed here. Safe to average
 * bed-time minutes directly as long as the caller has already run them
 * through toBedTimeAxisMinutes — averaging the raw 0-1439 values would be
 * wrong across the midnight wraparound (see clockTime.ts).
 */
function averageMinutesOf(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  if (present.length === 0) return null
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length)
}

const RETRY_DELAY_MS = 750

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transient DB read failure (Neon cold-start, network blip — see
 * NeonDbError "fetch failed") must not take down the whole dashboard: the
 * entry form has to keep working even if a chart can't load right now.
 * Caught here, not in queries.ts, since "how to degrade" is a page-level
 * presentation choice, not something the DB access layer should decide.
 *
 * Retries once after a short delay before giving up: Neon's free-tier
 * compute auto-suspends when idle, and the first query after that has to
 * wake it back up — often enough that one retry turns an apparent failure
 * into a normal (if slightly slower) load, rather than a "couldn't load"
 * message for something that would've worked a second later anyway.
 */
async function safeLoad<T>(loader: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await loader()
  } catch (firstError) {
    console.error(`Failed to load ${label}, retrying once:`, firstError)
    await delay(RETRY_DELAY_MS)
    try {
      return await loader()
    } catch (secondError) {
      console.error(`Failed to load ${label} after retry:`, secondError)
      return null
    }
  }
}

function LoadError({ what }: { what: string }) {
  return (
    <p className="py-10 text-center text-sm text-ink-3">
      Couldn&rsquo;t load {what} — your entries are safe, this is just a connection hiccup. Try refreshing.
    </p>
  )
}

/** Resting sky: pre-dawn until today is logged, full morning after (DawnSky; the form overrides it while open). */
const PREDAWN_LIGHT = 0.15
const MORNING_LIGHT = 1

export default async function DashboardPage() {
  const defaults = getDefaultTimes()
  const [dailyTotals, firstWakeTimes, firstBedTimes] = await Promise.all([
    safeLoad(() => getDailyTotals(CHART_RANGE_DAYS), 'daily totals'),
    safeLoad(() => getFirstWakeTimes(CHART_RANGE_DAYS), 'first wake times'),
    safeLoad(() => getFirstBedTimes(CHART_RANGE_DAYS), 'first bed times'),
  ])
  const todaysSleepMinutes = dailyTotals ? todaysLoggedMinutes(dailyTotals) : null
  const averageSleepMinutes = dailyTotals ? averageLoggedMinutes(dailyTotals) : null
  const averageWakeMinutes = firstWakeTimes
    ? averageMinutesOf(firstWakeTimes.map((day) => day.wakeTimeMinutes))
    : null
  const averageBedMinutes = firstBedTimes
    ? averageMinutesOf(firstBedTimes.map((day) => (day.bedTimeMinutes === null ? null : toBedTimeAxisMinutes(day.bedTimeMinutes))))
    : null

  const todaysBed = firstBedTimes?.at(-1)?.bedTimeMinutes ?? null
  const todaysWake = firstWakeTimes?.at(-1)?.wakeTimeMinutes ?? null
  const todaysCaption = !dailyTotals
    ? 'Couldn’t load today — try refreshing.'
    : todaysBed !== null && todaysWake !== null
      ? `${formatClockTime(todaysBed)} → ${formatClockTime(todaysWake)}`
      : 'The sun’s still below the horizon.'
  const dash = (value: string | null) => value ?? '—'

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pt-5 pb-36">
      <DawnSky restingLight={todaysSleepMinutes !== null ? MORNING_LIGHT : PREDAWN_LIGHT} />
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-xl font-medium tracking-[-0.01em]">SleepX</h1>
        <Link href="/history" className="py-3 pl-3 text-sm font-medium text-ink-2">
          History
        </Link>
      </header>
      <section className="mt-6">
        <h2 className="label">Today</h2>
        <SunScene size="hero" minutes={todaysSleepMinutes} caption={todaysCaption} emptyLabel="Not logged yet" />
      </section>
      <section className="mt-8">
        <h2 className="label">{CHART_RANGE_DAYS}-day average</h2>
        <p className="mt-2 font-serif text-lg leading-normal tabular-nums">
          {dash(averageSleepMinutes !== null ? formatDuration(averageSleepMinutes) : null)}{' '}
          <span className="font-sans text-sm text-ink-3">slept ·</span>{' '}
          {dash(averageBedMinutes !== null ? formatClockTime(averageBedMinutes) : null)}{' '}
          <span className="font-sans text-sm text-ink-3">to bed ·</span>{' '}
          {dash(averageWakeMinutes !== null ? formatClockTime(averageWakeMinutes) : null)}{' '}
          <span className="font-sans text-sm text-ink-3">up</span>
        </p>
      </section>
      <section className="mt-8">
        <h2 className="label">Last {CHART_RANGE_DAYS} days</h2>
        <div className="mt-3">{dailyTotals ? <SleepChart dailyTotals={dailyTotals} /> : <LoadError what="this chart" />}</div>
      </section>
      <SleepEntrySheet>
        <NewEntryForm defaultBedTime={defaults.bedTime} defaultWakeTime={defaults.wakeTime} />
      </SleepEntrySheet>
    </main>
  )
}
