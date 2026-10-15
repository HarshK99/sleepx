import { formatDuration } from '@/lib/sleep/duration'
import { SLEEP_GOAL_MINUTES } from '@/lib/sleep/goals'

/**
 * The signature of the Dawn sky direction (docs/design.md): a sun that
 * rises with a night's total and clears the horizon at the 7h goal, with
 * the total itself standing on the horizon. One component for both places
 * it appears — large on the dashboard (today's total), small inside the
 * entry form (the live total as the wheels spin) — so the two can't drift.
 *
 * No hooks or browser APIs, so it renders on the server for the dashboard
 * and inside the client-side form alike.
 */
type SunSceneProps = {
  /** Total minutes, or null when there's nothing to show yet. */
  minutes: number | null
  /** Left line under the horizon, e.g. "11 PM → 7 AM". */
  caption: string
  /** Shown on the horizon instead of a number when `minutes` is null. */
  emptyLabel?: string
  size: 'hero' | 'live'
  /** Live only: how bright the form's little sky is (0-1), from DawnSky's lightForWake — the same light as the page. */
  skyLight?: number
}

const MAX_RISE = 1.35

/** 0 = hidden below the horizon, 1 = just cleared it (at the goal), up to MAX_RISE above. */
function riseFor(minutes: number | null): number {
  if (minutes === null) return 0
  return Math.min(Math.max(minutes / SLEEP_GOAL_MINUTES, 0), MAX_RISE)
}

/** "1h above 7h" / "45m under 7h" / "on the 7h horizon". */
function versusGoal(minutes: number): string {
  const goal = formatDuration(SLEEP_GOAL_MINUTES)
  const diff = minutes - SLEEP_GOAL_MINUTES
  if (diff === 0) return `on the ${goal} horizon`
  return diff > 0 ? `${formatDuration(diff)} above ${goal}` : `${formatDuration(-diff)} under ${goal}`
}

const SIZES = {
  hero: { sky: 'h-[210px]', sun: 150, sunRight: 8, value: 'left-0 text-[88px] tracking-[-0.045em]', empty: 'left-0 bottom-2.5 text-[34px]', under: 'mt-3 text-[15px]', sunMotion: 'duration-[1100ms]' },
  live: { sky: 'h-[104px] rounded-[18px]', sun: 84, sunRight: 18, value: 'left-4 text-[56px] tracking-[-0.04em]', empty: 'left-4 bottom-3 text-[28px]', under: 'mt-2.5 text-[13px]', sunMotion: 'duration-[420ms]' },
} as const

export function SunScene({ minutes, caption, emptyLabel = '—', size, skyLight = 0.6 }: SunSceneProps) {
  const s = SIZES[size]
  const hasValue = minutes !== null
  const sunBottom = -s.sun + riseFor(minutes) * s.sun

  return (
    <div>
      <div
        className={`relative overflow-hidden ${s.sky}`}
        style={
          size === 'live'
            ? { background: 'linear-gradient(180deg, var(--predawn-top), var(--predawn-low))' }
            : undefined
        }
      >
        {size === 'live' && (
          // The form's little window onto the morning, brightening with the same light as the page sky.
          <div
            className="absolute inset-0 transition-opacity duration-500 ease-[var(--ease-out)]"
            style={{ background: 'linear-gradient(180deg, var(--sunrise-top), var(--sunrise-low))', opacity: skyLight }}
          />
        )}
        <div
          aria-hidden
          className={`absolute rounded-full transition-[bottom] ease-[var(--ease-out)] ${s.sunMotion}`}
          style={{
            width: s.sun,
            height: s.sun,
            right: s.sunRight,
            bottom: sunBottom,
            background: 'radial-gradient(circle, var(--sun-core) 0 34%, var(--sun-glow) 52%, rgba(255, 201, 150, 0) 70%)',
          }}
        />
        {hasValue ? (
          <span className={`absolute bottom-[-0.14em] z-[1] font-serif font-light leading-none tabular-nums ${s.value}`}>
            {formatDuration(minutes)}
          </span>
        ) : (
          <span className={`absolute z-[1] font-serif font-light leading-none text-ink-3 ${s.empty}`}>{emptyLabel}</span>
        )}
        <div className="absolute inset-x-0 bottom-0 z-[1] h-px bg-horizon" />
      </div>
      <div className={`flex items-baseline justify-between gap-3 text-ink-2 tabular-nums ${s.under}`}>
        <span>{caption}</span>
        {hasValue && <span className="font-semibold text-apricot-deep">{versusGoal(minutes)}</span>}
      </div>
    </div>
  )
}
