import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const sleepEntries = pgTable('sleep_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  bedTime: timestamp('bed_time', { withTimezone: true }).notNull(),
  wakeTime: timestamp('wake_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
