'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useId } from 'react'
import { IconButton } from '@/components/ui/button'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

type Side = 'right' | 'bottom'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  /** Which edge the panel slides in from. */
  side?: Side
  /** Sticky footer — totals, checkout CTA. */
  footer?: React.ReactNode
  dismissable?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * Sliding panel (F1.9) — cart, notification centre, "My session".
 *
 * Shares the exact behavioural core with Modal (F1.8) via
 * `useDismissableLayer`; only the geometry and entry transform differ.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  side = 'right',
  footer,
  dismissable = true,
  className,
  children,
}: DrawerProps) {
  const titleId = useId()
  const reduced = useReducedMotion()
  const panelRef = useDismissableLayer({ open, onClose, closeOnEscape: dismissable })

  const isRight = side === 'right'
  const offscreen = isRight ? { x: '100%', y: 0 } : { x: 0, y: '100%' }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70]"
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
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 34 }
            }
            className={cn(
              'glass-strong absolute flex flex-col overflow-hidden outline-none',
              isRight
                ? 'inset-y-0 right-0 w-full max-w-md rounded-l-xl border-l'
                : 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t',
              className,
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(229,53,43,0.8) 50%, transparent)',
              }}
            />

            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
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
              <IconButton label="Close panel" size="sm" onClick={onClose}>
                <X />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <footer className="shrink-0 border-t border-border px-5 py-4">{footer}</footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
