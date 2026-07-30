import Link from 'next/link'
import type { ReactNode } from 'react'

import { BedTimeChart } from '@/components/sleep/BedTimeChart'
import { Card } from '@/components/ui/Card'
import { SleepChart } from '@/components/sleep/SleepChart'
import { SleepEntryForm } from '@/components/sleep/SleepEntryForm'
import { SleepEntrySheet } from '@/components/sleep/SleepEntrySheet'
import { WakeTimeChart } from '@/components/sleep/WakeTimeChart'
import { formatClockTime, toBedTimeAxisMinutes } from '@/lib/sleep/clockTime'
import { HOUR_MS, daysBefore, formatDuration, formatForTimeInput } from '@/lib/sleep/duration'
import { getDailyTotals, getFirstBedTimes, getFirstWakeTimes } from '@/lib/sleep/queries'

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1">
      <h2 className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">{label}</h2>
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
      <div className="flex gap-2">
        <StatCard
          label={`Avg. sleep (${CHART_RANGE_DAYS}d)`}
          value={averageSleepMinutes !== null ? formatDuration(averageSleepMinutes) : '—'}
        />
        <StatCard
          label="Avg. bed time"
          value={averageBedMinutes !== null ? formatClockTime(averageBedMinutes) : '—'}
        />
        <StatCard
          label="Avg. wake time"
          value={averageWakeMinutes !== null ? formatClockTime(averageWakeMinutes) : '—'}
        />
      </div>
      <ChartCard title={`Last ${CHART_RANGE_DAYS} days`}>
        {dailyTotals ? <SleepChart dailyTotals={dailyTotals} /> : <ChartError />}
      </ChartCard>
      <ChartCard title="Bed time">
        {firstBedTimes ? <BedTimeChart firstBedTimes={firstBedTimes} /> : <ChartError />}
      </ChartCard>
      <ChartCard title="Wake-up time">
        {firstWakeTimes ? <WakeTimeChart firstWakeTimes={firstWakeTimes} /> : <ChartError />}
      </ChartCard>
      <SleepEntrySheet>
        <SleepEntryForm defaultBedTime={defaults.bedTime} defaultWakeTime={defaults.wakeTime} />
      </SleepEntrySheet>
    </main>
  )
}
