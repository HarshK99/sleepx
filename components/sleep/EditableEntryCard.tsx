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
 * One History row: a compact summary + a small Edit, or the shared
 * SleepEntryForm in its place. Edit is one tap, Save the second — inside
 * PRD §3's ≤2-click budget. Delete lives inside edit mode (Edit → Delete),
 * so the list stays quiet and a stray tap can't remove a night. Collapses
 * back only on a successful save.
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
        {/* A separate form: deleteEntryAction can't share SleepEntryForm's <form>. */}
        <form action={deleteEntryAction} className="mt-1 flex justify-center">
          <input type="hidden" name="id" value={entryId} />
          <Button type="submit" variant="danger">
            Delete this entry
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-3">
      <div className="min-w-0 flex-1">{children}</div>
      <Button type="button" variant="quiet" className="-mr-3 shrink-0 px-3 text-sm" onClick={() => setIsEditing(true)}>
        Edit
      </Button>
    </div>
  )
}
