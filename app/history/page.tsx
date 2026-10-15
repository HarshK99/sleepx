import Link from 'next/link'

import { DawnSky } from '@/components/sleep/DawnSky'
import { SleepHistoryList } from '@/components/sleep/SleepHistoryList'
import { getAllEntries } from '@/lib/sleep/queries'

/** Same reasoning as app/page.tsx's `dynamic` export — this list must reflect live DB state, never a build-time snapshot. */
export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const entries = await getAllEntries()

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-6 px-6 pt-5 pb-16">
      <DawnSky restingLight={1} />
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-xl font-medium tracking-[-0.01em]">History</h1>
        <Link href="/" className="py-3 pl-3 text-sm font-medium text-ink-2">
          ← Today
        </Link>
      </header>
      <SleepHistoryList entries={entries} />
    </main>
  )
}
