'use server'

import { revalidatePath } from 'next/cache'

import { parseWallClockDateTime } from '@/lib/sleep/duration'
import { deleteEntry, insertEntry, updateEntry } from '@/lib/sleep/queries'

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${key} is required`)
  }
  return value
}

function parseEntryFormData(formData: FormData) {
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

export async function createEntryAction(formData: FormData): Promise<void> {
  await insertEntry(parseEntryFormData(formData))
  revalidateEntryPages()
}

export async function updateEntryAction(formData: FormData): Promise<void> {
  const id = requireString(formData, 'id')
  await updateEntry(id, parseEntryFormData(formData))
  revalidateEntryPages()
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = requireString(formData, 'id')
  await deleteEntry(id)
  revalidateEntryPages()
}
