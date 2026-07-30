import { deleteEntryAction } from '@/app/actions/sleep-entries'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { APP_TIMEZONE, formatDuration } from '@/lib/sleep/duration'
import type { SleepEntry } from '@/lib/sleep/types'

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
    return <p className="text-sm text-gray-500 dark:text-gray-400">No entries logged yet.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {dateFormatter.format(entry.wakeTime)} · {formatDuration(entry.durationMinutes)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {timeFormatter.format(entry.bedTime)} → {timeFormatter.format(entry.wakeTime)}
              </span>
              {entry.note && <span className="text-sm text-gray-500 dark:text-gray-400">{entry.note}</span>}
            </div>
            <form action={deleteEntryAction}>
              <input type="hidden" name="id" value={entry.id} />
              <Button type="submit" variant="danger">
                Delete
              </Button>
            </form>
          </Card>
        </li>
      ))}
    </ul>
  )
}
