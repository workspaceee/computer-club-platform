'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect, useRef, useState } from 'react'
import { overlayZ } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import type { Toast } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Toaster (F1.20).
 *
 * Four kinds, one icon each, auto-dismiss with a visible progress bar, queue
 * capped at 3 by the store, and `role="status"` on the live region so screen
 * readers announce transient feedback without stealing focus. Errors get
 * `role="alert"` and a longer default life because they matter more.
 */
const CONFIG = {
  success: { icon: icons.success, color: 'var(--success)', life: 3500 },
  error: { icon: icons.error, color: 'var(--danger)', life: 6000 },
  warning: { icon: icons.warning, color: 'var(--warning)', life: 5000 },
  info: { icon: icons.info, color: 'var(--steel)', life: 3500 },
} as const

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast)
  const { icon: Icon, color, life } = CONFIG[toast.kind]
  const duration = toast.duration ?? life
  const [paused, setPaused] = useState(false)
  const remaining = useRef(duration)
  const startedAt = useRef(Date.now())

  // Auto-dismiss, pausable on hover/focus so long messages stay readable.
  useEffect(() => {
    if (duration === 0 || paused) return
    startedAt.current = Date.now()
    const t = setTimeout(() => dismiss(toast.id), remaining.current)
    return () => {
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current))
      clearTimeout(t)
    }
  }, [toast.id, dismiss, duration, paused])

  return (
    <motion.div
      layout
      // Slides in from the left edge, matching the bottom-left anchor of the
      // column: a card must enter and leave toward the nearest screen edge,
      // otherwise it reads as flying across the content.
      initial={{ opacity: 0, x: -40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      // Neon treatment matching the lock/attract chips: a thin kind-coloured
      // border that glows outward, a faint tint of the same colour washing in
      // from the accent edge, and a white hairline along the top — the same
      // recipe as the club's neon signage, just in the semantic colour instead
      // of brand red so success/error/warning stay legible at a glance.
      className="pointer-events-auto relative w-80 overflow-hidden rounded-xl bg-surface-2/90 backdrop-blur-md"
      style={{
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
        boxShadow: `0 0 0.5px color-mix(in srgb, ${color} 90%, white), 0 0 14px -4px ${color}, 0 16px 40px -16px rgba(0,0,0,0.8)`,
        backgroundImage: `linear-gradient(105deg, color-mix(in srgb, ${color} 14%, transparent) 0%, transparent 45%)`,
      }}
    >
      {/* top hairline — the bright "tube" edge of the neon */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${color} 70%, white), transparent)`,
        }}
      />
      <div className="flex items-start gap-3 px-4 py-3">
        {/* icon chip: glowing dot of the kind colour instead of a bare glyph */}
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent), 0 0 8px -2px ${color}`,
          }}
        >
          <Icon size={15} aria-hidden />
        </span>
        <div className="flex-1">
          {toast.title && (
            <p className="mb-0.5 font-display text-[11px] font-bold uppercase tracking-widest text-text-high">
              {toast.title}
            </p>
          )}
          <p className={cn('text-sm leading-relaxed', toast.title ? 'text-text-medium' : 'text-text-high')}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          className="-mr-1 -mt-1 rounded-sm p-1 text-text-low outline-none transition-colors hover:text-text-high focus-visible:ring-2 focus-visible:ring-primary/70"
          aria-label="Dismiss notification"
        >
          <icons.close size={16} aria-hidden />
        </button>
      </div>

      {/* Life bar — freezes while hovered/focused. */}
      {duration > 0 && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 origin-left"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: paused ? undefined : 0 }}
          transition={{ duration: remaining.current / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const hasError = toasts.some((t) => t.kind === 'error')

  return (
    <div
      // Live region: polite for feedback, assertive when something failed.
      role={hasError ? 'alert' : 'status'}
      aria-live={hasError ? 'assertive' : 'polite'}
      aria-relevant="additions"
      // Bottom-LEFT — the single anchor for every transient notification in the
      // app. It started at `top-4`, inside the top bar, so a toast covered the
      // very chip it was talking about ("+150 coins" landing on the coin
      // balance); moving it down fixed that, and moving it left also keeps it
      // clear of the right-hand column (slide dots, action buttons, drawers).
      // The 6rem rung clears the fixed mobile bar on narrow screens, where
      // covering the navigation would be worse than covering content; both rungs
      // then add `--frame-inset-bottom` because the column is bottom-fixed under
      // `viewportFit: 'cover'` (C2.9) — the bar moved up by the device inset, so
      // the toasts above it must move with it, and the desktop rung carries it
      // too for a landscape PWA. Resolves to plain 6rem/1rem on a kiosk display.
      //
      // Newest last in the column: the queue is oldest → newest, so with a
      // bottom anchor the freshest message is the one nearest the corner the
      // eye is drawn to, and older ones drift upward out of the way.
      className={cn(
        'pointer-events-none fixed bottom-[calc(6rem+var(--frame-inset-bottom))] left-4 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-[calc(1rem+var(--frame-inset-bottom))]',
        overlayZ.toast,
      )}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
