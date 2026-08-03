import Link from 'next/link'

import { SleepHistoryList } from '@/components/sleep/SleepHistoryList'
import { getAllEntries } from '@/lib/sleep/queries'

/** Same reasoning as app/page.tsx's `dynamic` export — this list must reflect live DB state, never a build-time snapshot. */
export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const entries = await getAllEntries()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">History</h1>
        <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400">
          ← Dashboard
        </Link>
      </div>
      <SleepHistoryList entries={entries} />
    </main>
  )
}
