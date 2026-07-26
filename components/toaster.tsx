'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  success: { icon: CheckCircle2, color: 'var(--success)', life: 3500 },
  error: { icon: XCircle, color: 'var(--danger)', life: 6000 },
  warning: { icon: AlertTriangle, color: 'var(--warning)', life: 5000 },
  info: { icon: Info, color: 'var(--steel)', life: 3500 },
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
      initial={{ opacity: 0, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="pointer-events-auto relative w-80 overflow-hidden rounded-lg border border-border bg-surface-2/95 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] backdrop-blur"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon size={18} style={{ color }} className="mt-0.5 shrink-0" aria-hidden />
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
          <X size={16} aria-hidden />
        </button>
      </div>

      {/* Life bar — freezes while hovered/focused. */}
      {duration > 0 && (
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 origin-left"
          style={{ background: color }}
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
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
