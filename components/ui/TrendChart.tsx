'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type YAxisProps } from 'recharts'

const dayTickFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' })
const tooltipDateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

/** date is "YYYY-MM-DD"; parsed as UTC midnight so the label matches the day it names regardless of the viewer's local timezone. */
function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`)
}

type TooltipProps = {
  active?: boolean
  payload?: { value: number | null }[]
  label?: string
  valueFormatter: (value: number) => string
}

function ChartTooltip({ active, payload, label, valueFormatter }: TooltipProps) {
  const value = payload?.[0]?.value
  if (!active || value == null || !label) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-gray-500 dark:text-gray-400">{tooltipDateFormatter.format(toDate(label))}</p>
      <p className="font-semibold text-gray-900 dark:text-gray-100">{valueFormatter(value)}</p>
    </div>
  )
}

export type TrendPoint = {
  date: string
  value: number | null
}

type TrendChartProps = {
  data: TrendPoint[]
  yTickFormatter: (value: number) => string
  tooltipValueFormatter: (value: number) => string
  /** Recharts domain, e.g. undefined for the default 0-based scale, or ['dataMin - 30', 'dataMax + 30'] to auto-frame around the actual range instead of zero. */
  yDomain?: YAxisProps['domain']
}

/**
 * The one place a "value per day, last N days" line/area chart is built —
 * SleepChart and WakeTimeChart are both thin adapters over this: they map
 * their own query result shape to {date, value} and supply formatters, the
 * actual Recharts wiring/styling lives here exactly once.
 */
export function TrendChart({ data, yTickFormatter, tooltipValueFormatter, yDomain }: TrendChartProps) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
            tickFormatter={yTickFormatter}
            domain={yDomain}
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 11, fill: 'var(--chart-ink-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={tooltipValueFormatter} />}
            cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-series-1)"
            strokeWidth={2}
            fill="var(--chart-series-1)"
            fillOpacity={0.1}
            connectNulls={false}
            dot={{ r: 4, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
