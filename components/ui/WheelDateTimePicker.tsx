'use client'

import { useMemo, useState } from 'react'
import Picker from 'react-mobile-picker'

import { APP_TIMEZONE, MINUTE_STEP, daysBefore, getWakeDate, parseWallClockDateTime } from '@/lib/sleep/duration'

import { LoopingWheelColumn } from './LoopingWheelColumn'

const DATE_RANGE_DAYS_BACK = 14
const AROUND_VALUE_DAYS = 7

type DateWindow = 'recent' | 'aroundValue'

/**
 * Three rows visible, selection in the middle on a raised band (Dawn sky,
 * docs/design.md): the neighbours show what's one step away, so a half-awake
 * thumb can see which way to spin. 44px rows keep each a proper touch target.
 */
const ITEM_HEIGHT = 44
const VISIBLE_ROWS = 3

/** Fades the rows above and below the band; replaces react-mobile-picker's own stronger mask. */
const WHEEL_MASK = 'linear-gradient(rgba(0,0,0,.28), #000 36%, #000 64%, rgba(0,0,0,.28))'

type WheelValue = {
  date: string
  hour: string
  minute: string
}

/** defaultValue/output both use the "YYYY-MM-DDTHH:mm" shape lib/sleep/duration.ts already parses. */
function splitValue(value: string): WheelValue {
  const [date, time] = value.split('T')
  const [hour, minute] = time.split(':')
  return { date, hour, minute }
}

function combineValue(value: WheelValue): string {
  return `${value.date}T${value.hour}:${value.minute}`
}

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

type DateOption = { value: string; label: string }

function toDateOption(day: Date, now: Date): DateOption {
  const value = getWakeDate(day)
  const label =
    value === getWakeDate(now)
      ? 'Today'
      : value === getWakeDate(daysBefore(now, 1))
        ? 'Yesterday'
        : dateLabelFormatter.format(day)
  return { value, label }
}

/**
 * 'recent': today back DATE_RANGE_DAYS_BACK days — the new-entry form's
 * backfill window (PRD §6). 'aroundValue': the value's own date
 * ±AROUND_VALUE_DAYS, never past today — used when editing, so an entry
 * older than the recent window is still on the wheel and can be moved a
 * few days either way.
 */
function buildDateOptions(dateWindow: DateWindow, valueDate: string): DateOption[] {
  const now = new Date()

  if (dateWindow === 'recent') {
    return Array.from({ length: DATE_RANGE_DAYS_BACK + 1 }, (_, i) => toDateOption(daysBefore(now, DATE_RANGE_DAYS_BACK - i), now))
  }

  const today = getWakeDate(now)
  const center = parseWallClockDateTime(`${valueDate}T12:00`)
  return Array.from({ length: AROUND_VALUE_DAYS * 2 + 1 }, (_, i) => daysBefore(center, AROUND_VALUE_DAYS - i))
    .filter((day) => getWakeDate(day) <= today)
    .map((day) => toDateOption(day, now))
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))

const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'))

function itemLabelClassName(selected: boolean): string {
  return selected ? 'font-semibold text-ink' : 'text-ink-3'
}

type WheelDateTimePickerProps = {
  name: string
  label: string
  defaultValue: string
  dateWindow?: DateWindow
  /** Called with the new "YYYY-MM-DDTHH:mm" value whenever any column changes — the form uses it for the live total and the sky. */
  onChange?: (value: string) => void
}

export function WheelDateTimePicker({ name, label, defaultValue, dateWindow = 'recent', onChange }: WheelDateTimePickerProps) {
  const initial = useMemo(() => splitValue(defaultValue), [defaultValue])
  const dateOptions = useMemo(() => buildDateOptions(dateWindow, initial.date), [dateWindow, initial.date])
  const [value, setValue] = useState(initial)

  function change(next: Partial<WheelValue>) {
    const merged = { ...value, ...next }
    setValue(merged)
    onChange?.(combineValue(merged))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={combineValue(value)} />
      <div className="relative flex rounded-2xl bg-mist-inset text-base">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1.5 rounded-[11px] bg-band shadow-[0_1px_2px_rgba(46,42,58,0.08)]"
          style={{ top: ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        {/* Date doesn't loop (its range is bounded, per PRD.md §8) so it stays on react-mobile-picker. Hour/Minute use LoopingWheelColumn instead — see that file for why. */}
        <Picker
          value={{ date: value.date }}
          onChange={(next) => change({ date: next.date })}
          height={ITEM_HEIGHT * VISIBLE_ROWS}
          itemHeight={ITEM_HEIGHT}
          wheelMode="natural"
          className="wheel-date"
          style={{ flex: '1.7 1 0%', maskImage: WHEEL_MASK, WebkitMaskImage: WHEEL_MASK }}
        >
          <Picker.Column name="date">
            {dateOptions.map((option) => (
              <Picker.Item key={option.value} value={option.value}>
                {({ selected }) => <span className={itemLabelClassName(selected)}>{option.label}</span>}
              </Picker.Item>
            ))}
          </Picker.Column>
        </Picker>
        <LoopingWheelColumn
          options={HOUR_OPTIONS}
          value={value.hour}
          onChange={(hour) => change({ hour })}
          itemHeight={ITEM_HEIGHT}
          visibleRows={VISIBLE_ROWS}
          className="flex-1"
        />
        <div className="relative flex items-center text-ink-3" aria-hidden>
          :
        </div>
        <LoopingWheelColumn
          options={MINUTE_OPTIONS}
          value={value.minute}
          onChange={(minute) => change({ minute })}
          itemHeight={ITEM_HEIGHT}
          visibleRows={VISIBLE_ROWS}
          className="flex-1"
        />
      </div>
    </div>
  )
}
