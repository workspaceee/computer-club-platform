'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** `pill` = red filled pill (language switch). `outline` = bordered tab (mode switch). */
  variant?: 'pill' | 'outline'
  size?: 'sm' | 'md'
  /** Fully rounded track — used by the compact language switcher. */
  round?: boolean
  /** Stretch every segment to equal width. Default true. */
  fill?: boolean
  /** Accessible name for the group. */
  label?: string
  className?: string
}

/**
 * Segmented control with the shared sliding pill (F1.6).
 *
 * Consolidates the three near-identical switchers that existed in
 * `lock-screen.tsx` (login/register, EN/RU/LT) and `settings-modal.tsx`
 * (resolution). The pill animates with `layoutId` + spring per
 * docs/DESIGN.md §6, and is skipped entirely when motion is reduced.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'outline',
  size = 'md',
  round = false,
  fill = true,
  label,
  className,
}: SegmentedProps<T>) {
  // Unique per instance so two switchers on one screen don't share a pill.
  const layoutId = useId()
  const reduced = useReducedMotion()

  const pad = size === 'sm' ? 'p-0.5' : 'p-1'
  const seg =
    size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'relative flex border border-border bg-black/40',
        round ? 'rounded-full' : 'rounded-md',
        pad,
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 font-display font-semibold uppercase tracking-widest transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
              round ? 'rounded-full' : 'rounded-sm',
              seg,
              fill && 'flex-1',
              active
                ? variant === 'pill'
                  ? 'text-primary-foreground'
                  : 'text-text-high'
                : 'text-text-low hover:text-text-medium',
              o.disabled && 'pointer-events-none opacity-40',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className={cn(
                  'absolute inset-0',
                  round ? 'rounded-full' : 'rounded-sm',
                  variant === 'pill'
                    ? // Translucent instead of a solid red fill, so the pill
                      // reads as lit glass over the track: the shell's shared
                      // neon (`.neon-edge` — same paint as `.neon-ring`, minus
                      // the `position: relative` that would collapse this
                      // `absolute inset-0` overlay) is what marks the active
                      // segment now, not a block of colour.
                      'neon-edge bg-primary/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(229,53,43,0.32)] backdrop-blur-sm'
                    : 'border border-primary/40 bg-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(229,53,43,0.18)]',
                )}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', bounce: 0.2, duration: 0.45 }
                }
              />
            )}
            <span className="relative z-[1] flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
