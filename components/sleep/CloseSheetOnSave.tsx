'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import { setEntrySheetOpen } from './SleepEntrySheet'

/**
 * Renders nothing. Must be rendered inside the <form> it watches —
 * useFormStatus only reports its nearest enclosing form's status. Closes
 * the sheet on the falling edge of `pending` (was submitting, now isn't),
 * not just "pending is false", since that's also true before the first
 * submission — closing immediately on mount would be wrong.
 */
export function CloseSheetOnSave() {
  const { pending } = useFormStatus()
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending) {
      setEntrySheetOpen(false)
    }
    wasPending.current = pending
  }, [pending])

  return null
}
