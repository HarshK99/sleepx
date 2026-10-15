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
        className="fixed bottom-6 right-6 z-30 h-[60px] w-[60px] bg-ink text-[30px] font-light text-[#fdf6f1] shadow-[0_8px_24px_rgba(46,42,58,0.25)] transition-transform duration-150 active:scale-[0.96]"
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
        className="fixed inset-0 z-40 bg-[rgba(46,42,58,0.12)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log sleep"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-[430px] overflow-y-auto overscroll-contain rounded-t-[28px] bg-mist px-6 pt-2.5 shadow-[0_-1px_0_rgba(255,255,255,0.55)_inset,0_-12px_40px_rgba(46,42,58,0.1)] backdrop-blur-[24px] backdrop-saturate-[1.25]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)', animation: 'sheet-rise 440ms var(--ease-out)' }}
      >
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-horizon-soft" />
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-[21px] tracking-[-0.01em]">Log sleep</h2>
          <IconButton
            onClick={() => setEntrySheetOpen(false)}
            aria-label="Close"
            className="-mr-2.5 h-11 w-11 text-[26px] text-ink-3"
          >
            ×
          </IconButton>
        </div>
        {children}
      </div>
    </>
  )
}
