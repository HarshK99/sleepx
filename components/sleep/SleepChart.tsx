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
 * Fixed 5h-10h domain with ticks at 5h / 7h / 9h — tight around where real
 * nights fall, so the band around the 7h horizon gets the vertical room
 * (Dawn sky, docs/design.md). Recharts widens the domain itself if a night
 * falls outside it, so nothing is hidden; the ticks stay round either way.
 */
const Y_DOMAIN: [number, number] = [300, 600]
const Y_TICKS = [300, 420, 540]

type SleepChartProps = {
  dailyTotals: DailyTotal[]
}

export function SleepChart({ dailyTotals }: SleepChartProps) {
  // A day with nothing logged is a gap in the line, not a dive to zero: getDailyTotals zero-fills, and 0 would read as "slept 0h".
  const data: TrendPoint[] = dailyTotals.map((day) => ({ date: day.date, value: day.totalMinutes > 0 ? day.totalMinutes : null }))

  return (
    <TrendChart
      data={data}
      yTickFormatter={formatHourTick}
      tooltipValueFormatter={formatDuration}
      yDomain={Y_DOMAIN}
      yTicks={Y_TICKS}
      goalValue={SLEEP_GOAL_MINUTES}
    />
  )
}
