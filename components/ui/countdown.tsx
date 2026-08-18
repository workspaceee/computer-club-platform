'use client'

import { formatDuration } from '@/lib/time'
import { cn } from '@/lib/utils'

/** Colour thresholds from docs/PLAN.md F1.17, in seconds. */
export const WARNING_THRESHOLD = 15 * 60
export const DANGER_THRESHOLD = 5 * 60

export type CountdownLevel = 'neutral' | 'warning' | 'danger' | 'expired'

/** Single source of truth for "how urgent is this session?". */
export function countdownLevel(seconds: number): CountdownLevel {
  if (seconds <= 0) return 'expired'
  if (seconds <= DANGER_THRESHOLD) return 'danger'
  if (seconds <= WARNING_THRESHOLD) return 'warning'
  return 'neutral'
}

const LEVEL_COLOR: Record<CountdownLevel, string> = {
  neutral: 'text-text-high',
  warning: 'text-warning',
  danger: 'text-danger',
  expired: 'text-danger',
}

const SIZE = {
  sm: 'text-base',
  md: 'text-2xl',
  xl: 'text-[4rem] leading-[0.9]',
} as const

interface CountdownProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * Remaining seconds. The component is intentionally dumb — the single
   * app-wide interval in `session-manager.tsx` derives this from the server
   * `expires_at` (F6.3), never from a local decrement.
   */
  seconds: number
  size?: keyof typeof SIZE
  /** Tracked label above the digits, e.g. "TIME LEFT". */
  label?: React.ReactNode
  /** Disable the danger-threshold pulse (e.g. inside a full-screen overlay). */
  noPulse?: boolean
  /** Text shown once the counter hits zero. */
  expiredLabel?: React.ReactNode
  /**
   * Which way the number runs.
   *
   * `remaining` (default) is a prepaid seat: the thresholds above apply and the
   * digits go amber, then red. `elapsed` is a **postpaid** walk-in, whose clock
   * counts *up* into an open tab (F6.3) — there is no "5 minutes left" to warn
   * about, so painting minute 3 of a visit red would warn the guest about the
   * exact opposite of what is happening. The top bar used to keep a private copy
   * of the thresholds just to suppress them for guests; this is that suppression,
   * living next to the thresholds it turns off.
   */
  mode?: 'remaining' | 'elapsed'
}

/**
 * Session countdown (F1.17).
 *
 * The most important number in the product: it changes colour at 15 and 5
 * minutes and pulses in the danger band, so a player notices without reading.
 * Announced politely via `role="timer"` + `aria-live="off"` — screen readers get
 * the explicit warnings from C2.6 instead of a per-second stream.
 */
export function Countdown({
  seconds,
  size = 'md',
  label,
  noPulse = false,
  expiredLabel = '00:00:00',
  mode = 'remaining',
  className,
  ...props
}: CountdownProps) {
  // An elapsed clock has no urgency band and no "expired" state: zero is simply
  // the first second of the visit.
  const level = mode === 'elapsed' ? 'neutral' : countdownLevel(seconds)
  const isExpired = level === 'expired'

  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {label && <span className="label-mono text-[9px] text-text-low">{label}</span>}
      <span
        role="timer"
        aria-live="off"
        className={cn(
          'font-clock font-semibold tabular-nums',
          SIZE[size],
          LEVEL_COLOR[level],
          level === 'danger' && !noPulse && 'urgency-pulse',
        )}
      >
        {isExpired ? expiredLabel : formatDuration(seconds)}
      </span>
    </div>
  )
}
