import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { SleepChart } from '@/components/sleep/SleepChart'
import { SleepEntryForm } from '@/components/sleep/SleepEntryForm'
import { SleepEntrySheet } from '@/components/sleep/SleepEntrySheet'
import { WakeTimeChart } from '@/components/sleep/WakeTimeChart'
import { daysBefore, formatForTimeInput, roundToNearestStep } from '@/lib/sleep/duration'
import { getDailyTotals, getFirstWakeTimes } from '@/lib/sleep/queries'

const CHART_RANGE_DAYS = 14

function getDefaultTimes() {
  const now = new Date()
  const wakeTime = roundToNearestStep(now)

  const bedTime = daysBefore(now, 1)
  bedTime.setUTCHours(23, 0, 0, 0)

  return {
    bedTime: formatForTimeInput(bedTime),
    wakeTime: formatForTimeInput(wakeTime),
  }
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
  const [dailyTotals, firstWakeTimes] = await Promise.all([
    safeLoad(() => getDailyTotals(CHART_RANGE_DAYS), 'daily totals'),
    safeLoad(() => getFirstWakeTimes(CHART_RANGE_DAYS), 'first wake times'),
  ])

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SleepX</h1>
      <ChartCard title={`Last ${CHART_RANGE_DAYS} days`}>
        {dailyTotals ? <SleepChart dailyTotals={dailyTotals} /> : <ChartError />}
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
