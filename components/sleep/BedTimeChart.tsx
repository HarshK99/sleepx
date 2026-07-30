'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatClockTime, toBedTimeAxisMinutes } from '@/lib/sleep/clockTime'
import type { FirstBedTime } from '@/lib/sleep/queries'

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
      yTickFormatter={formatClockTime}
      tooltipValueFormatter={formatClockTime}
      yDomain={['dataMin - 30', 'dataMax + 30']}
    />
  )
}
