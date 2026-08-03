'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatClockTime, formatClockTimeCompact } from '@/lib/sleep/clockTime'
import { WAKE_TIME_GOAL_MINUTES } from '@/lib/sleep/goals'
import type { FirstWakeTime } from '@/lib/sleep/queries'

/**
 * Fixed 6am-10am domain with hourly ticks — replaces the old auto-framed
 * ['dataMin - 30', 'dataMax + 30'] domain, which moved every time the data
 * did and produced non-round labels. 6am-10am comfortably covers the 7am
 * goal (which lands exactly on a tick) and a typical wake time's real-world
 * drift either side of it, trimmed tighter than the old 11am ceiling since
 * a wake time past 10am is rare enough not to need the headroom.
 */
const Y_DOMAIN: [number, number] = [360, 600]
const Y_TICKS = [360, 420, 480, 540, 600]

type WakeTimeChartProps = {
  firstWakeTimes: FirstWakeTime[]
}

export function WakeTimeChart({ firstWakeTimes }: WakeTimeChartProps) {
  const data: TrendPoint[] = firstWakeTimes.map((day) => ({ date: day.date, value: day.wakeTimeMinutes }))

  return (
    <TrendChart
      data={data}
      yTickFormatter={formatClockTimeCompact}
      tooltipValueFormatter={formatClockTime}
      yDomain={Y_DOMAIN}
      yTicks={Y_TICKS}
      yAxisWidth={40}
      goalValue={WAKE_TIME_GOAL_MINUTES}
      goalLabel={`${formatClockTime(WAKE_TIME_GOAL_MINUTES)} goal`}
    />
  )
}
