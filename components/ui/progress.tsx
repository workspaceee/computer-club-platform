'use client'

import { motion } from 'framer-motion'
import { useMotionDuration } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'xp' | 'coin'

const FILL: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  xp: 'bg-xp',
  coin: 'bg-coin',
}

const HEIGHT = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' } as const

interface ProgressProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Current value. Clamped into `0..max`. */
  value: number
  max?: number
  tone?: Tone
  size?: keyof typeof HEIGHT
  /** Accessible name — required when there is no visible label. */
  label?: string
  /** Renders `label` + `value/max` above the track. */
  showValue?: boolean
  /** Formats the right-hand caption when `showValue` is set. */
  format?: (value: number, max: number) => string
}

/**
 * Linear progress (F1.12).
 *
 * Used for XP bars, quest progress, download/launch progress and disk usage.
 * The fill animates with framer-motion and collapses to an instant jump when
 * motion is reduced.
 */
export function Progress({
  value,
  max = 100,
  tone = 'primary',
  size = 'sm',
  label,
  showValue = false,
  format,
  className,
  ...props
}: ProgressProps) {
  const d = useMotionDuration()
  const safeMax = max <= 0 ? 1 : max
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const pct = (clamped / safeMax) * 100

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {showValue && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <span className="label-mono text-[9px] text-text-low">{label}</span>}
          <span className="font-display text-[11px] font-semibold tabular-nums text-text-medium">
            {format ? format(clamped, safeMax) : `${Math.round(pct)}%`}
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-white/[0.07]',
          HEIGHT[size],
        )}
      >
        <motion.div
          className={cn('h-full rounded-full', FILL[tone])}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: d(0.5), ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
