import { Card } from '@/components/ui/Card'
import { SleepChart } from '@/components/sleep/SleepChart'
import { SleepEntryForm } from '@/components/sleep/SleepEntryForm'
import { SleepEntrySheet } from '@/components/sleep/SleepEntrySheet'
import { daysBefore, formatForTimeInput, roundToNearestStep } from '@/lib/sleep/duration'
import { getDailyTotals } from '@/lib/sleep/queries'

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

export default async function DashboardPage() {
  const defaults = getDefaultTimes()
  const dailyTotals = await getDailyTotals(CHART_RANGE_DAYS)

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SleepX</h1>
      <Card>
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Last {CHART_RANGE_DAYS} days
        </h2>
        <SleepChart dailyTotals={dailyTotals} />
      </Card>
      <SleepEntrySheet>
        <SleepEntryForm defaultBedTime={defaults.bedTime} defaultWakeTime={defaults.wakeTime} />
      </SleepEntrySheet>
    </main>
  )
}
