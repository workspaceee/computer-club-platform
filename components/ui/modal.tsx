'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useId } from 'react'
import { IconButton } from '@/components/ui/button'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'max-w-[min(96vw,1400px)] h-[92vh]',
} as const

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Dialog title — required for an accessible name. */
  title?: React.ReactNode
  /** Tracked micro-label left of the title, e.g. "SYS". */
  eyebrow?: React.ReactNode
  size?: keyof typeof SIZES
  /** Sticky footer content — usually the confirm/cancel buttons. */
  footer?: React.ReactNode
  /** Hide the close button (for blocking states like "session paused"). */
  hideClose?: boolean
  /** Disable dismissal via overlay click / Escape. */
  dismissable?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * The single modal of the product (F1.8).
 *
 * Overlay + Escape + click-outside + focus trap + scroll lock all come from
 * `useDismissableLayer`, which Drawer (F1.9) reuses — so both surfaces behave
 * identically and Escape always peels only the topmost layer.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  size = 'md',
  footer,
  hideClose = false,
  dismissable = true,
  className,
  children,
}: ModalProps) {
  const titleId = useId()
  const reduced = useReducedMotion()
  const panelRef = useDismissableLayer({
    open,
    onClose,
    closeOnEscape: dismissable,
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <div
            aria-hidden
            onClick={dismissable ? onClose : undefined}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
            className={cn(
              'glass-strong tick-corners relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl outline-none',
              SIZES[size],
              className,
            )}
          >
            {/* Top accent hairline — the signature edge of every IMBA surface. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(229,53,43,0.8) 50%, transparent)',
              }}
            />

            {(title || !hideClose) && (
              <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(229,53,43,0.12),transparent_60%)]" />
                <div className="relative flex min-w-0 items-center gap-3">
                  {eyebrow && (
                    <>
                      <span className="label-mono text-[10px] text-primary">{eyebrow}</span>
                      <span className="h-3 w-px bg-border-strong" aria-hidden />
                    </>
                  )}
                  {title && (
                    <h2
                      id={titleId}
                      className="truncate font-display text-lg font-bold uppercase tracking-tight text-text-high"
                    >
                      {title}
                    </h2>
                  )}
                </div>
                {!hideClose && (
                  <IconButton label="Close dialog" size="sm" onClick={onClose} className="relative">
                    <X />
                  </IconButton>
                )}
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
