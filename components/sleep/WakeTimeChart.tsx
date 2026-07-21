'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import type { FirstWakeTime } from '@/lib/sleep/queries'

function formatClockTime(minutes: number): string {
  const hour24 = Math.floor(minutes / 60)
  const minute = Math.round(minutes % 60)
  const period = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

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
