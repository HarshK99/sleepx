'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * How many copies of `options` get rendered back to back. Recentering (see
 * handleScroll below) keeps the scroll position within the middle block on
 * every scroll event, not just once at the end, so this only needs to be
 * large enough that a single native-momentum fling can't outrun the
 * recenter check between two consecutive scroll events — 5 is comfortable
 * even for the 4-item Minute column.
 */
const REPEAT_BLOCKS = 5
const MIDDLE_BLOCK = Math.floor(REPEAT_BLOCKS / 2)

/**
 * react-mobile-picker (used for the Date column) can't loop: it matches the
 * selected item by value, so duplicating the option list to fake a loop
 * causes a visible snap-back glitch when you release on a duplicate copy
 * (see PRD.md §8). This component sidesteps that by owning scroll position
 * directly instead of routing through a value-matching library — a native
 * scroll-snap container over `options` repeated REPEAT_BLOCKS times, always
 * silently kept centered on the middle copy so it can scroll past the last
 * option straight into the first (e.g. 23 -> 00) with no real edge to hit.
 */
export function LoopingWheelColumn({
  options,
  value,
  onChange,
  itemHeight,
  visibleRows = 1,
  className = '',
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  itemHeight: number
  /** Odd number of rows shown at once; the selected one sits in the middle. Padding above/below keeps scrollTop = index × itemHeight either way. */
  visibleRows?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isRecentering = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blockHeight = options.length * itemHeight
  const edgePadding = ((visibleRows - 1) / 2) * itemHeight

  function indexToScrollTop(blockIndex: number, optionIndex: number): number {
    return (blockIndex * options.length + optionIndex) * itemHeight
  }

  useLayoutEffect(() => {
    const startIndex = Math.max(options.indexOf(value), 0)
    const container = containerRef.current
    if (container) container.scrollTop = indexToScrollTop(MIDDLE_BLOCK, startIndex)
    // Only re-center when the option set changes (effectively: on mount).
    // Re-running on every `value` change would fight the user's own scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  function handleScroll() {
    const container = containerRef.current
    if (!container || isRecentering.current) return

    const currentBlock = Math.floor(container.scrollTop / blockHeight)
    if (currentBlock !== MIDDLE_BLOCK) {
      isRecentering.current = true
      container.scrollTop += (MIDDLE_BLOCK - currentBlock) * blockHeight
      isRecentering.current = false
    }

    const optionIndex = Math.round((container.scrollTop % blockHeight) / itemHeight) % options.length
    const nextValue = options[optionIndex]
    if (nextValue !== value) onChange(nextValue)

    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const settledContainer = containerRef.current
      if (!settledContainer) return
      const settledIndex = Math.round((settledContainer.scrollTop % blockHeight) / itemHeight) % options.length
      isRecentering.current = true
      settledContainer.scrollTop = indexToScrollTop(MIDDLE_BLOCK, settledIndex)
      isRecentering.current = false
    }, 120)
  }

  function handleItemClick(optionIndex: number) {
    containerRef.current?.scrollTo({ top: indexToScrollTop(MIDDLE_BLOCK, optionIndex), behavior: 'smooth' })
  }

  const repeated = Array.from({ length: REPEAT_BLOCKS * options.length }, (_, i) => options[i % options.length])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`no-scrollbar relative snap-y snap-mandatory overflow-y-scroll overscroll-contain ${className}`}
      style={{
        height: itemHeight * visibleRows,
        paddingTop: edgePadding,
        paddingBottom: edgePadding,
        maskImage: 'linear-gradient(rgba(0,0,0,.35), #000 33%, #000 67%, rgba(0,0,0,.35))',
        WebkitMaskImage: 'linear-gradient(rgba(0,0,0,.35), #000 33%, #000 67%, rgba(0,0,0,.35))',
      }}
    >
      {repeated.map((option, i) => (
        <div
          key={i}
          onClick={() => handleItemClick(i % options.length)}
          className="flex items-center justify-center"
          style={{ height: itemHeight, scrollSnapAlign: 'center' }}
        >
          <span
            className={
              option === value ? 'font-semibold text-ink tabular-nums' : 'text-sm text-wheel-neighbour tabular-nums'
            }
          >
            {option}
          </span>
        </div>
      ))}
    </div>
  )
}
