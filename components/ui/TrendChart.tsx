'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type YAxisProps,
} from 'recharts'

const weekdayTickFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
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

/**
 * Roughly 5 evenly-spaced x-axis tick dates regardless of range length,
 * always including the very last point — the most recent day ("Today", see
 * the tickFormatter below) is the one point a reader most wants anchored on
 * the axis, and evenly-spacing from index 0 alone can't guarantee it lands
 * on a shown tick (e.g. spacing every 3rd of 14 points stops at index 12,
 * one short of the last).
 */
function xAxisTicks(data: TrendPoint[]): string[] {
  const lastIndex = data.length - 1
  if (lastIndex <= 0) return data.map((point) => point.date)

  const targetTickCount = 5
  const step = lastIndex / (targetTickCount - 1)
  const indices = new Set<number>()
  for (let i = 0; i < targetTickCount; i++) {
    indices.add(Math.round(i * step))
  }
  indices.add(lastIndex)

  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => data[index].date)
}

type TrendChartProps = {
  data: TrendPoint[]
  yTickFormatter: (value: number) => string
  tooltipValueFormatter: (value: number) => string
  /** Recharts domain, e.g. undefined for the default 0-based scale, or ['dataMin - 30', 'dataMax + 30'] to auto-frame around the actual range instead of zero. */
  yDomain?: YAxisProps['domain']
  /** Explicit tick values so the axis shows clean, consistent round numbers instead of whatever Recharts auto-generates from the data range (e.g. "13.3h" — see SleepChart/BedTimeChart/WakeTimeChart for the fixed scales this enables). */
  yTicks?: number[]
  /** Draws a dashed horizontal goal line (e.g. a 7h sleep goal) at this value, with `goalLabel` alongside it. Omit both for a chart with no goal. */
  goalValue?: number
  goalLabel?: string
  /** Column width reserved for Y-axis tick labels. Default (36) fits SleepChart's short "7h"/"14h" labels; BedTimeChart/WakeTimeChart pass a wider value for "10AM"/"11AM", which would otherwise get word-wrapped onto two lines. */
  yAxisWidth?: number
}

/**
 * The one place a "value per day, last N days" line/area chart is built —
 * SleepChart, BedTimeChart, and WakeTimeChart are all thin adapters over
 * this: they map their own query result shape to {date, value} and supply
 * formatters (and, optionally, a fixed tick scale + goal line), the actual
 * Recharts wiring/styling lives here exactly once.
 */
export function TrendChart({
  data,
  yTickFormatter,
  tooltipValueFormatter,
  yDomain,
  yTicks,
  goalValue,
  goalLabel,
  yAxisWidth = 36,
}: TrendChartProps) {
  const lastDateKey = data.at(-1)?.date

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            ticks={xAxisTicks(data)}
            tickFormatter={(value: string) => (value === lastDateKey ? 'Today' : weekdayTickFormatter.format(toDate(value)))}
            tick={{ fontSize: 11, fill: 'var(--chart-ink-muted)' }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yTickFormatter}
            domain={yDomain}
            ticks={yTicks}
            allowDecimals={false}
            width={yAxisWidth}
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
          {goalValue !== undefined && (
            <ReferenceLine
              y={goalValue}
              stroke="var(--chart-ink-muted)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: goalLabel, position: 'insideBottomRight', fill: 'var(--chart-ink-muted)', fontSize: 11 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
