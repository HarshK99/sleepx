import Link from 'next/link'
import type { ReactNode } from 'react'

import { BedTimeChart } from '@/components/sleep/BedTimeChart'
import { Card } from '@/components/ui/Card'
import { SleepChart } from '@/components/sleep/SleepChart'
import { NewEntryForm } from '@/components/sleep/NewEntryForm'
import { SleepEntrySheet } from '@/components/sleep/SleepEntrySheet'
import { WakeTimeChart } from '@/components/sleep/WakeTimeChart'
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

/**
 * flex/justify-between + h-full, not just stacked text: a CSS grid cell
 * stretches to the row's tallest card (e.g. if a neighboring label wraps to
 * two lines), and without this the value would stay pinned right under its
 * own label instead of moving down with it — misaligning the numbers across
 * cards in the same row. This keeps the value anchored to the card's bottom
 * regardless of how many lines the label above it takes.
 */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex h-full flex-col justify-between gap-1">
      <h2 className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</h2>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h2>
      {children}
    </Card>
  )
}

function ChartError() {
  return (
    <p className="flex h-48 items-center justify-center px-4 text-center text-sm text-gray-500 dark:text-gray-400">
      Couldn&rsquo;t load this chart — your entries are safe, this is just a connection hiccup. Try refreshing.
    </p>
  )
}

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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SleepX</h1>
        <Link href="/history" className="text-sm font-medium text-blue-600 dark:text-blue-400">
          History
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Today's sleep"
          value={todaysSleepMinutes !== null ? formatDuration(todaysSleepMinutes) : '—'}
        />
        <StatCard
          label={`Avg sleep (${CHART_RANGE_DAYS}d)`}
          value={averageSleepMinutes !== null ? formatDuration(averageSleepMinutes) : '—'}
        />
        <StatCard
          label="Avg bed time"
          value={averageBedMinutes !== null ? formatClockTime(averageBedMinutes) : '—'}
        />
        <StatCard
          label="Avg wake time"
          value={averageWakeMinutes !== null ? formatClockTime(averageWakeMinutes) : '—'}
        />
      </div>
      <ChartCard title={`Last ${CHART_RANGE_DAYS} days`}>
        {dailyTotals ? <SleepChart dailyTotals={dailyTotals} /> : <ChartError />}
      </ChartCard>
      <ChartCard title="Wake-up time">
        {firstWakeTimes ? <WakeTimeChart firstWakeTimes={firstWakeTimes} /> : <ChartError />}
      </ChartCard>
      <ChartCard title="Bed time">
        {firstBedTimes ? <BedTimeChart firstBedTimes={firstBedTimes} /> : <ChartError />}
      </ChartCard>
      <SleepEntrySheet>
        <NewEntryForm defaultBedTime={defaults.bedTime} defaultWakeTime={defaults.wakeTime} />
      </SleepEntrySheet>
    </main>
  )
}
