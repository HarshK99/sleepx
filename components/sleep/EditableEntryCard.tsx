'use client'

import { useState, type ReactNode } from 'react'

import { deleteEntryAction } from '@/app/actions/sleep-entries'
import { Button } from '@/components/ui/Button'

import { SleepEntryForm } from './SleepEntryForm'

type EditableEntryCardProps = {
  entryId: string
  /** "YYYY-MM-DDTHH:mm" in APP_TIMEZONE, as formatted server-side by formatForTimeInput. */
  bedTime: string
  wakeTime: string
  note: string | null
  /** The read-only summary, rendered by the Server Component parent (SleepHistoryList) and passed in as children. */
  children: ReactNode
}

/**
 * One History row: summary + Edit/Delete, or the shared SleepEntryForm in
 * edit mode in its place. Edit is one tap, Save the second — inside PRD §3's
 * ≤2-click budget. Collapses back only on a successful save.
 */
export function EditableEntryCard({ entryId, bedTime, wakeTime, note, children }: EditableEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <div className="my-3 rounded-[22px] bg-mist-strong p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_8px_28px_rgba(46,42,58,0.1)] backdrop-blur-xl">
        <SleepEntryForm
          entryId={entryId}
          defaultBedTime={bedTime}
          defaultWakeTime={wakeTime}
          defaultNote={note ?? ''}
          onSaved={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 py-4">
      {children}
      <div className="flex shrink-0 flex-col gap-2">
        <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <form action={deleteEntryAction}>
          <input type="hidden" name="id" value={entryId} />
          <Button type="submit" variant="danger" className="w-full">
            Delete
          </Button>
        </form>
      </div>
    </div>
  )
}
