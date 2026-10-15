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
            <div className="flex flex-col gap-0.5">
              <span className="label">{dateFormatter.format(entry.wakeTime)}</span>
              <span className="mt-1 font-serif text-[26px] font-light leading-tight tracking-[-0.02em] tabular-nums">
                {formatDuration(entry.durationMinutes)}
              </span>
              <span className="text-sm text-ink-2 tabular-nums">
                {timeFormatter.format(entry.bedTime)} → {timeFormatter.format(entry.wakeTime)}
              </span>
              {entry.note && <span className="mt-1 text-sm text-ink-3">{entry.note}</span>}
            </div>
          </EditableEntryCard>
        </li>
      ))}
    </ul>
  )
}
