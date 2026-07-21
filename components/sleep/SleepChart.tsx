'use client'

import { TrendChart, type TrendPoint } from '@/components/ui/TrendChart'
import { formatDuration } from '@/lib/sleep/duration'
import type { DailyTotal } from '@/lib/sleep/queries'

function formatHourTick(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

type SleepChartProps = {
  dailyTotals: DailyTotal[]
}

export function SleepChart({ dailyTotals }: SleepChartProps) {
  const data: TrendPoint[] = dailyTotals.map((day) => ({ date: day.date, value: day.totalMinutes }))

  return <TrendChart data={data} yTickFormatter={formatHourTick} tooltipValueFormatter={formatDuration} />
}
