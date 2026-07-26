'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { useMotionDuration } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

type Side = 'top' | 'bottom' | 'left' | 'right'

const POSITION: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const ENTER: Record<Side, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
}

interface TooltipProps {
  /** Tooltip body. Keep it to one short line — this is a hint, not a dialog. */
  content: React.ReactNode
  side?: Side
  /** Open delay in ms. Pointer only; keyboard focus opens instantly. */
  delay?: number
  /** Skip rendering the tooltip entirely (e.g. on touch kiosks). */
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Delayed hint (F1.13).
 *
 * Wraps any trigger in an inline-flex span, describes it via `aria-describedby`
 * and opens on hover *and* focus, so keyboard users get the same information.
 * Escape closes it without bubbling up to the parent overlay.
 */
export function Tooltip({
  content,
  side = 'top',
  delay = 350,
  disabled = false,
  className,
  children,
}: TooltipProps) {
  const id = useId()
  const d = useMotionDuration()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => clear, [])

  const show = (instant = false) => {
    clear()
    if (instant || delay === 0) return setOpen(true)
    timer.current = setTimeout(() => setOpen(true), delay)
  }

  const hide = () => {
    clear()
    setOpen(false)
  }

  if (disabled) return <>{children}</>

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={() => show()}
      onPointerLeave={hide}
      onFocusCapture={() => show(true)}
      onBlurCapture={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          hide()
        }
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>

      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, ...ENTER[side] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...ENTER[side] }}
            transition={{ duration: d(0.15), ease: 'easeOut' }}
            className={cn(
              'glass-strong pointer-events-none absolute z-[80] w-max max-w-56 rounded-md px-2.5 py-1.5',
              'text-xs leading-relaxed text-text-high',
              POSITION[side],
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
