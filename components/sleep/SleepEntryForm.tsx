'use client'

import { useActionState, useId, useState } from 'react'

import { createEntryAction, updateEntryAction, type EntryFormState } from '@/app/actions/sleep-entries'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { WheelDateTimePicker } from '@/components/ui/WheelDateTimePicker'

const INITIAL_STATE: EntryFormState = { status: 'idle' }

type SleepEntryFormProps = {
  /** Present = edit that entry (updateEntryAction); absent = log a new one (createEntryAction). */
  entryId?: string
  defaultBedTime: string
  defaultWakeTime: string
  defaultNote?: string
  /** Called once per successful save — never on a failed one, so the caller only closes/collapses after the entry actually landed. */
  onSaved?: () => void
  /** Shows a Cancel button when given (edit mode). */
  onCancel?: () => void
}

/**
 * The one entry form, for both logging and editing — same fields, same
 * pickers, same validation. A Client Component because useActionState is
 * how a Server Action hands back a failure (see app/actions/sleep-entries.ts).
 */
export function SleepEntryForm({ entryId, defaultBedTime, defaultWakeTime, defaultNote = '', onSaved, onCancel }: SleepEntryFormProps) {
  const noteId = useId()
  // Controlled, not defaultValue: React resets a form's uncontrolled fields
  // after every action, including one that returned an error — that would
  // wipe the note the user is about to retry with.
  const [note, setNote] = useState(defaultNote)
  const [state, formAction] = useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await (entryId ? updateEntryAction : createEntryAction)(previous, formData)
    if (next.status === 'saved') onSaved?.()
    return next
  }, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {entryId && <input type="hidden" name="id" value={entryId} />}
      <WheelDateTimePicker
        name="bedTime"
        label="Bed time"
        defaultValue={defaultBedTime}
        dateWindow={entryId ? 'aroundValue' : 'recent'}
      />
      <WheelDateTimePicker
        name="wakeTime"
        label="Wake time"
        defaultValue={defaultWakeTime}
        dateWindow={entryId ? 'aroundValue' : 'recent'}
      />
      <Field label="Note (optional)" htmlFor={noteId}>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. afternoon nap, woke up twice…"
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </Field>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      <SubmitButton label="Save" pendingLabel="Saving…" />
      {onCancel && (
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      )}
    </form>
  )
}
