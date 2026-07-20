'use client'

import { useMemo, useState } from 'react'
import Picker from 'react-mobile-picker'

import { APP_TIMEZONE, MINUTE_STEP, daysBefore, getWakeDate } from '@/lib/sleep/duration'

const DATE_RANGE_DAYS_BACK = 14

/**
 * Height === itemHeight on purpose: the visible window is exactly one row,
 * so only the selected value shows at rest. Neighboring values are still in
 * the DOM (react-mobile-picker always renders the full list) but clipped by
 * the picker's own overflow:hidden, and only become visible transiently as
 * they slide through this one-row window while actively scrolling.
 */
const ITEM_HEIGHT = 44

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

function buildDateOptions(): { value: string; label: string }[] {
  const now = new Date()
  const options: { value: string; label: string }[] = []

  for (let daysAgo = DATE_RANGE_DAYS_BACK; daysAgo >= 0; daysAgo--) {
    const d = daysBefore(now, daysAgo)
    const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : dateLabelFormatter.format(d)
    options.push({ value: getWakeDate(d), label })
  }

  return options
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))

const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'))

function itemLabelClassName(selected: boolean): string {
  return selected
    ? 'font-semibold text-gray-900 dark:text-gray-100'
    : 'text-gray-400 dark:text-gray-600'
}

type WheelDateTimePickerProps = {
  name: string
  label: string
  defaultValue: string
}

export function WheelDateTimePicker({ name, label, defaultValue }: WheelDateTimePickerProps) {
  const dateOptions = useMemo(() => buildDateOptions(), [])
  const [value, setValue] = useState<WheelValue>(() => splitValue(defaultValue))

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input type="hidden" name={name} value={combineValue(value)} />
      <Picker
        value={value}
        onChange={setValue}
        height={ITEM_HEIGHT}
        itemHeight={ITEM_HEIGHT}
        wheelMode="natural"
        className="rounded-lg border border-gray-300 bg-white text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <Picker.Column name="date" style={{ flex: '1.6 1 0%' }}>
          {dateOptions.map((option) => (
            <Picker.Item key={option.value} value={option.value}>
              {({ selected }) => <span className={itemLabelClassName(selected)}>{option.label}</span>}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="hour">
          {HOUR_OPTIONS.map((hour) => (
            <Picker.Item key={hour} value={hour}>
              {({ selected }) => <span className={itemLabelClassName(selected)}>{hour}</span>}
            </Picker.Item>
          ))}
        </Picker.Column>
        <div className="flex items-center text-gray-400 dark:text-gray-600" aria-hidden>
          :
        </div>
        <Picker.Column name="minute">
          {MINUTE_OPTIONS.map((minute) => (
            <Picker.Item key={minute} value={minute}>
              {({ selected }) => <span className={itemLabelClassName(selected)}>{minute}</span>}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  )
}
