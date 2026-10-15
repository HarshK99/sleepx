'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'

import { IconButton } from '@/components/ui/IconButton'

/**
 * sessionStorage, not a cookie/DB flag: "session" here means "this browser
 * tab until it's closed" — it clears on its own for a new session, which is
 * exactly the open-by-default-each-session behavior asked for.
 *
 * Modeled as a tiny external store (useSyncExternalStore) rather than
 * useState+useEffect: reading sessionStorage during render would mismatch
 * SSR, and setting it in a mount effect trips
 * react-hooks/set-state-in-effect. useSyncExternalStore is the React-blessed
 * way to read a browser-only source of truth without either problem —
 * getServerSnapshot answers "open" so SSR/hydration agree, and the listener
 * set drives same-tab updates (sessionStorage writes don't fire the
 * `storage` event in their own tab, so there's nothing external to
 * subscribe to — open()/close() notify the listeners themselves).
 */
const SESSION_KEY = 'sleepx:entry-sheet'
const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): boolean {
  return sessionStorage.getItem(SESSION_KEY) !== 'closed'
}

function getServerSnapshot(): boolean {
  return true
}

/** Exported so NewEntryForm can close the sheet after a successful save without needing Context. */
export function setEntrySheetOpen(open: boolean) {
  sessionStorage.setItem(SESSION_KEY, open ? 'open' : 'closed')
  listeners.forEach((listener) => listener())
}

export function SleepEntrySheet({ children }: { children: ReactNode }) {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setEntrySheetOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  /**
   * Locks background scroll while the sheet is open. Without this, dragging
   * inside a wheel column on iOS/Android still lets the touch gesture
   * rubber-band/bounce the page behind the sheet — the picker's own
   * touchmove handler blocks native scrolling on itself, but nothing stops
   * the body from reacting to the same gesture unless it's explicitly
   * pinned. This is what caused the "whole UI moves a little" jitter.
   */
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <IconButton
        onClick={() => setEntrySheetOpen(true)}
        aria-label="Log sleep"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 bg-blue-600 text-3xl text-white shadow-lg active:bg-blue-700"
      >
        +
      </IconButton>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={() => setEntrySheetOpen(false)}
        className="fixed inset-0 z-40 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log sleep"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log sleep</h2>
          <IconButton
            onClick={() => setEntrySheetOpen(false)}
            aria-label="Close"
            className="h-11 w-11 text-2xl text-gray-500 dark:text-gray-400"
          >
            ×
          </IconButton>
        </div>
        {children}
      </div>
    </>
  )
}
