'use client'

import { motion } from 'framer-motion'
import { useMotionDuration } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'xp' | 'coin'

const STROKE: Record<Tone, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  xp: 'var(--xp)',
  coin: 'var(--coin)',
}

interface RingProgressProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  value: number
  max?: number
  /** Outer diameter in px. */
  size?: number
  /** Track/arc thickness in px. */
  thickness?: number
  tone?: Tone
  /** Accessible name for the arc. */
  label?: string
  /** Content in the centre (level number, icon, percent). */
  children?: React.ReactNode
}

/**
 * Circular progress (F1.12) — the XP ring from `profile-view.tsx`.
 *
 * Arc starts at 12 o'clock and fills clockwise. Centre is a free slot so the
 * same ring serves level badges, session time and quest completion.
 */
export function RingProgress({
  value,
  max = 100,
  size = 96,
  thickness = 6,
  tone = 'xp',
  label,
  className,
  children,
  ...props
}: RingProgressProps) {
  const d = useMotionDuration()
  const safeMax = max <= 0 ? 1 : max
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / safeMax)

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-label={label}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: d(0.7), ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${STROKE[tone]}55)` }}
        />
      </svg>

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  )
}
