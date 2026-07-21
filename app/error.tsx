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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This is usually a brief connection hiccup — your data is safe.
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </main>
  )
}
