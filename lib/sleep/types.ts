import type { sleepEntries } from '@/lib/db/schema'

export type SleepEntry = typeof sleepEntries.$inferSelect
export type NewSleepEntry = typeof sleepEntries.$inferInsert
