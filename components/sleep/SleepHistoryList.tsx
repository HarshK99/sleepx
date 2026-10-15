import { APP_TIMEZONE, formatDuration, formatForTimeInput } from '@/lib/sleep/duration'
import type { SleepEntry } from '@/lib/sleep/types'

import { EditableEntryCard } from './EditableEntryCard'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
})

type SleepHistoryListProps = {
  entries: SleepEntry[]
}

export function SleepHistoryList({ entries }: SleepHistoryListProps) {
  if (entries.length === 0) {
    return <p className="py-10 text-center font-serif text-lg text-ink-3">No nights logged yet.</p>
  }

  return (
    <ul className="flex flex-col border-t border-horizon-soft">
      {entries.map((entry) => (
        <li key={entry.id} className="border-b border-horizon-soft">
          <EditableEntryCard
            entryId={entry.id}
            bedTime={formatForTimeInput(entry.bedTime)}
            wakeTime={formatForTimeInput(entry.wakeTime)}
            note={entry.note}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium">{dateFormatter.format(entry.wakeTime)}</span>
              <span className="font-serif text-xl tracking-[-0.01em] tabular-nums">{formatDuration(entry.durationMinutes)}</span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-ink-3 tabular-nums">
              {timeFormatter.format(entry.bedTime)} → {timeFormatter.format(entry.wakeTime)}
              {entry.note && <> · {entry.note}</>}
            </p>
          </EditableEntryCard>
        </li>
      ))}
    </ul>
  )
}
