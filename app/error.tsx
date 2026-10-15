'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl font-light tracking-[-0.01em]">Something went wrong</h1>
      <p className="text-sm text-ink-2">
        This is usually a brief connection hiccup — your data is safe.
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </main>
  )
}
