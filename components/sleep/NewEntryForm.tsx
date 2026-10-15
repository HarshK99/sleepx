'use client'

import { SleepEntryForm } from './SleepEntryForm'
import { setEntrySheetOpen } from './SleepEntrySheet'

type NewEntryFormProps = {
  defaultBedTime: string
  defaultWakeTime: string
}

/**
 * SleepEntryForm in "log a new entry" mode, closing the sheet only once the
 * save succeeds (PRD §3). Exists as its own Client Component because
 * app/page.tsx is a Server Component and can't pass the onSaved function
 * itself (see ARCHITECTURE.md's function-prop rule).
 */
export function NewEntryForm({ defaultBedTime, defaultWakeTime }: NewEntryFormProps) {
  return (
    <SleepEntryForm
      defaultBedTime={defaultBedTime}
      defaultWakeTime={defaultWakeTime}
      onSaved={() => setEntrySheetOpen(false)}
    />
  )
}
