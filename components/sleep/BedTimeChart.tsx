'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatClockTime, formatClockTimeCompact, toBedTimeAxisMinutes } from '@/lib/sleep/clockTime'
import { BEDTIME_GOAL_MINUTES } from '@/lib/sleep/goals'
import type { FirstBedTime } from '@/lib/sleep/queries'

const GOAL = toBedTimeAxisMinutes(BEDTIME_GOAL_MINUTES)

/**
 * Fixed 9pm-3am domain with hourly ticks, on the same shifted axis as the
 * data (see clockTime.ts) — replaces the old auto-framed
 * ['dataMin - 30', 'dataMax + 30'] domain, which moved every time the data
 * did and produced non-round labels. 9pm-3am comfortably covers the 11:30pm
 * goal and a typical bedtime's real-world drift either side of it.
 */
const Y_DOMAIN: [number, number] = [-180, 180]
const Y_TICKS = [-180, -120, -60, 0, 60, 120, 180]

type BedTimeChartProps = {
  firstBedTimes: FirstBedTime[]
}

export function BedTimeChart({ firstBedTimes }: BedTimeChartProps) {
  const data: TrendPoint[] = firstBedTimes.map((day) => ({
    date: day.date,
    value: day.bedTimeMinutes === null ? null : toBedTimeAxisMinutes(day.bedTimeMinutes),
  }))

  return (
    <TrendChart
      data={data}
      yTickFormatter={formatClockTimeCompact}
      tooltipValueFormatter={formatClockTime}
      yDomain={Y_DOMAIN}
      yTicks={Y_TICKS}
      yAxisWidth={40}
      goalValue={GOAL}
      goalLabel={`${formatClockTime(GOAL)} goal`}
    />
  )
}
