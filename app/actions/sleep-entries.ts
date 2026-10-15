'use server'

import { revalidatePath } from 'next/cache'

import { isWakeAfterBed, parseWallClockDateTime } from '@/lib/sleep/duration'
import { deleteEntry, insertEntry, updateEntry } from '@/lib/sleep/queries'

/**
 * What a create/update returns to SleepEntryForm via useActionState. An
 * expected failure (bad times, a Neon blip) comes back as a value rather
 * than a throw, per Next's error-handling guide — a throw would land on
 * error.tsx and lose the form, and with it the entry being logged.
 */
export type EntryFormState = { status: 'idle' } | { status: 'saved' } | { status: 'error'; message: string }

type EntryInput = {
  bedTime: Date
  wakeTime: Date
  note: string | null
}

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${key} is required`)
  }
  return value
}

function parseEntryFormData(formData: FormData): EntryInput {
  const noteRaw = formData.get('note')
  const note = typeof noteRaw === 'string' && noteRaw.trim() !== '' ? noteRaw.trim() : null

  return {
    bedTime: parseWallClockDateTime(requireString(formData, 'bedTime')),
    wakeTime: parseWallClockDateTime(requireString(formData, 'wakeTime')),
    note,
  }
}

function revalidateEntryPages(): void {
  revalidatePath('/')
  revalidatePath('/history')
}

/**
 * Shared by create and update. A missing/malformed field still throws:
 * the pickers always write both hidden inputs, so that's a bug, not
 * something to show the user. The DB call is caught because Neon
 * cold-starts are expected here (see ARCHITECTURE.md "Resilience").
 */
async function saveEntry(formData: FormData, save: (input: EntryInput) => Promise<unknown>): Promise<EntryFormState> {
  const input = parseEntryFormData(formData)
  if (!isWakeAfterBed(input.bedTime, input.wakeTime)) {
    return { status: 'error', message: 'Wake time must be after bed time.' }
  }

  try {
    await save(input)
  } catch (error) {
    console.error('Failed to save entry:', error)
    return { status: 'error', message: 'Couldn’t save — connection hiccup. Your entry is still here; try Save again.' }
  }

  revalidateEntryPages()
  return { status: 'saved' }
}

export async function createEntryAction(_previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  return saveEntry(formData, insertEntry)
}

export async function updateEntryAction(_previous: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const id = requireString(formData, 'id')
  return saveEntry(formData, (input) => updateEntry(id, input))
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = requireString(formData, 'id')
  await deleteEntry(id)
  revalidateEntryPages()
}
