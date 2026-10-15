'use client'

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type YAxisProps,
  type YAxisTickContentProps,
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
    <div className="rounded-xl bg-mist-strong px-3 py-2 text-sm shadow-[0_6px_20px_rgba(46,42,58,0.14)] backdrop-blur-xl">
      <p className="text-ink-3">{tooltipDateFormatter.format(toDate(label))}</p>
      <p className="font-serif text-base text-ink tabular-nums">{valueFormatter(value)}</p>
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
  /** Explicit tick values so the axis shows clean, consistent round numbers instead of whatever Recharts auto-generates from the data range (e.g. "13.3h" — see SleepChart for the fixed scale this enables). */
  yTicks?: number[]
  /** Draws the goal as a horizon line at this value; its Y tick is drawn in the accent, and points below it get the accent dot. Omit for a chart with no goal. */
  goalValue?: number
}

/** Column width reserved for Y-axis tick labels — fits SleepChart's short "7h"/"14h" labels. */
const Y_AXIS_WIDTH = 36

/**
 * The one place a "value per day, last N days" line/area chart is built —
 * SleepChart is a thin adapter over this: it maps its query result to
 * {date, value} and supplies formatters, a fixed tick scale and a goal
 * line; the actual Recharts wiring/styling lives here. Generic on purpose,
 * so a future chart reuses it rather than growing a second implementation.
 */
export function TrendChart({
  data,
  yTickFormatter,
  tooltipValueFormatter,
  yDomain,
  yTicks,
  goalValue,
}: TrendChartProps) {
  const lastDateKey = data.at(-1)?.date
  const lastIndex = data.length - 1

  /** Y tick labels: muted, except the goal's, which is the accent — it names the horizon line without a label that could collide with the data. */
  function renderYTick({ x, y, payload }: YAxisTickContentProps) {
    const value = Number(payload.value)
    const isGoal = value === goalValue
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fontWeight={isGoal ? 600 : 400} fill={isGoal ? 'var(--chart-accent)' : 'var(--chart-ink-muted)'}>
        {yTickFormatter(value)}
      </text>
    )
  }

  /** Ink dot normally; the accent dot below the goal (Dawn sky: "under the horizon"); the latest point slightly larger. */
  // Read the value from `payload` (the data point): for an Area, Recharts' own `value` is a [baseline, value] pair.
  function renderDot({ cx, cy, index, payload }: { cx?: number; cy?: number; index?: number; payload?: TrendPoint }) {
    const value = payload?.value
    if (cx === undefined || cy === undefined || value == null) return <g key={index} />
    const below = goalValue !== undefined && value < goalValue
    return (
      <circle key={index} cx={cx} cy={cy} r={index === lastIndex ? 4 : 2.5} fill={below ? 'var(--chart-accent)' : 'var(--chart-series-1)'} />
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trend-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--chart-fill)" stopOpacity={0.55} />
              <stop offset="1" stopColor="var(--chart-fill)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            ticks={xAxisTicks(data)}
            tickFormatter={(value: string) => (value === lastDateKey ? 'Today' : weekdayTickFormatter.format(toDate(value)))}
            tick={{ fontSize: 11, fill: 'var(--chart-ink-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            allowDecimals={false}
            width={Y_AXIS_WIDTH}
            tick={renderYTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={tooltipValueFormatter} />}
            cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
          />
          {goalValue !== undefined && (
            <ReferenceLine y={goalValue} stroke="var(--chart-grid)" strokeWidth={1} />
          )}
          <Area
            type="linear"
            dataKey="value"
            stroke="var(--chart-series-1)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            fill="url(#trend-glow)"
            connectNulls={false}
            dot={renderDot}
            activeDot={{ r: 5, fill: 'var(--chart-series-1)', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
