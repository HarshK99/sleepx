'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { createEntryAction, updateEntryAction, type EntryFormState } from '@/app/actions/sleep-entries'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { WheelDateTimePicker } from '@/components/ui/WheelDateTimePicker'
import { formatClockTime, wallClockMinutesOfDay } from '@/lib/sleep/clockTime'
import { computeDurationMinutes, isWakeAfterBed, parseWallClockDateTime } from '@/lib/sleep/duration'

import { lightForWake, playSunriseFrom, setPickedWakeTime } from './DawnSky'
import { SunScene } from './SunScene'

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

/** The night the wheels currently describe, or null if wake isn't after bed. Duration math stays in lib/sleep/duration.ts. */
function liveNight(bedTime: string, wakeTime: string) {
  const bed = parseWallClockDateTime(bedTime)
  const wake = parseWallClockDateTime(wakeTime)
  if (!isWakeAfterBed(bed, wake)) return null
  return {
    minutes: computeDurationMinutes(bed, wake),
    caption: `${formatClockTime(wallClockMinutesOfDay(bedTime))} → ${formatClockTime(wallClockMinutesOfDay(wakeTime))}`,
  }
}

/**
 * The one entry form, for both logging and editing — same fields, same
 * pickers, same validation. A Client Component because useActionState is
 * how a Server Action hands back a failure (see app/actions/sleep-entries.ts).
 *
 * Dawn sky (docs/design.md): the live total stands on a little horizon
 * above the wheels, the page sky follows the wake wheel while this form is
 * on screen, and a successful save sends a sunrise up from the Save button.
 */
export function SleepEntryForm({ entryId, defaultBedTime, defaultWakeTime, defaultNote = '', onSaved, onCancel }: SleepEntryFormProps) {
  const noteId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [bedTime, setBedTime] = useState(defaultBedTime)
  const [wakeTime, setWakeTime] = useState(defaultWakeTime)
  // Controlled, not defaultValue: React resets a form's uncontrolled fields
  // after every action, including one that returned an error — that would
  // wipe the note the user is about to retry with.
  const [note, setNote] = useState(defaultNote)
  const [state, formAction] = useActionState(async (previous: EntryFormState, formData: FormData) => {
    const next = await (entryId ? updateEntryAction : createEntryAction)(previous, formData)
    if (next.status === 'saved') {
      const saveButton = formRef.current?.querySelector('button[type="submit"]')
      if (saveButton) playSunriseFrom(saveButton.getBoundingClientRect())
      navigator.vibrate?.(12)
      onSaved?.()
    }
    return next
  }, INITIAL_STATE)

  // The page sky follows this form's wake wheel while it's on screen, and returns to rest when it goes.
  useEffect(() => {
    setPickedWakeTime(wakeTime)
  }, [wakeTime])
  useEffect(() => () => setPickedWakeTime(null), [])

  const night = liveNight(bedTime, wakeTime)

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {entryId && <input type="hidden" name="id" value={entryId} />}
      <SunScene
        size="live"
        minutes={night?.minutes ?? null}
        caption={night?.caption ?? 'Wake time is before bed time'}
        skyLight={lightForWake(wallClockMinutesOfDay(wakeTime))}
      />
      <WheelDateTimePicker
        name="bedTime"
        label="Bed time"
        defaultValue={defaultBedTime}
        dateWindow={entryId ? 'aroundValue' : 'recent'}
        onChange={setBedTime}
      />
      <WheelDateTimePicker
        name="wakeTime"
        label="Wake time"
        defaultValue={defaultWakeTime}
        dateWindow={entryId ? 'aroundValue' : 'recent'}
        onChange={setWakeTime}
      />
      <Field label="Note (optional)" htmlFor={noteId}>
        <textarea
          id={noteId}
          name="note"
          rows={1}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Woke up twice, afternoon nap…"
          className="min-h-12 resize-none rounded-[14px] bg-mist-inset px-3.5 py-3 text-base text-ink placeholder:text-ink-3 focus:outline-2 focus:outline-offset-2 focus:outline-apricot-deep"
        />
      </Field>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-alarm">
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
