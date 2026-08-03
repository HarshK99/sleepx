'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatDuration } from '@/lib/sleep/duration'
import { SLEEP_GOAL_MINUTES } from '@/lib/sleep/goals'
import type { DailyTotal } from '@/lib/sleep/queries'

function formatHourTick(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

/**
 * Fixed 4h-14h domain with clean 2h ticks — replaces Recharts' auto-scaled
 * domain, which produced odd fractional labels like "13.3h" depending on
 * the data's actual max. Starting at 4h (instead of 0) trims the dead space
 * below any realistic night's sleep, giving the meaningful band more
 * vertical resolution — the trade-off is that a night under 4h (or a
 * zero-filled no-entry day, which SleepChart renders as 0, not null) clips
 * flat at the floor instead of showing its true depth. A real night far
 * past 14h would likewise just clip at the top; both are acceptable for a
 * hardcoded-for-now scale.
 */
const Y_DOMAIN: [number, number] = [240, 840]
const Y_TICKS = [240, 360, 480, 600, 720, 840]

type SleepChartProps = {
  dailyTotals: DailyTotal[]
}

export function SleepChart({ dailyTotals }: SleepChartProps) {
  const data: TrendPoint[] = dailyTotals.map((day) => ({ date: day.date, value: day.totalMinutes }))

  return (
    <TrendChart
      data={data}
      yTickFormatter={formatHourTick}
      tooltipValueFormatter={formatDuration}
      yDomain={Y_DOMAIN}
      yTicks={Y_TICKS}
      goalValue={SLEEP_GOAL_MINUTES}
      goalLabel="7h goal"
    />
  )
}
