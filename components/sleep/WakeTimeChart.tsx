'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatClockTime } from '@/lib/sleep/clockTime'
import type { FirstWakeTime } from '@/lib/sleep/queries'

type WakeTimeChartProps = {
  firstWakeTimes: FirstWakeTime[]
}

export function WakeTimeChart({ firstWakeTimes }: WakeTimeChartProps) {
  const data: TrendPoint[] = firstWakeTimes.map((day) => ({ date: day.date, value: day.wakeTimeMinutes }))

  return (
    <TrendChart
      data={data}
      yTickFormatter={formatClockTime}
      tooltipValueFormatter={formatClockTime}
      yDomain={['dataMin - 30', 'dataMax + 30']}
    />
  )
}
