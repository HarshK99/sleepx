'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { DailyTotal } from '@/lib/sleep/queries'
import { formatDuration } from '@/lib/sleep/duration'

const dayTickFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' })
const tooltipDateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

/** DailyTotal.date is "YYYY-MM-DD"; parsed as UTC midnight so the label matches the day it names regardless of the viewer's local timezone. */
function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`)
}

function formatHourTick(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

type TooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-gray-500 dark:text-gray-400">{tooltipDateFormatter.format(toDate(label))}</p>
      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDuration(payload[0].value)}</p>
    </div>
  )
}

type SleepChartProps = {
  dailyTotals: DailyTotal[]
}

export function SleepChart({ dailyTotals }: SleepChartProps) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dailyTotals} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => dayTickFormatter.format(toDate(value))}
            interval={1}
            tick={{ fontSize: 11, fill: 'var(--chart-ink-muted)' }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatHourTick}
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 11, fill: 'var(--chart-ink-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="totalMinutes"
            stroke="var(--chart-series-1)"
            strokeWidth={2}
            fill="var(--chart-series-1)"
            fillOpacity={0.1}
            dot={{ r: 4, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
