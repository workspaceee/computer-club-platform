'use client'

/**
 * Confirmation dialog — "lock the station?", "end the guest session?" (F6.4).
 *
 * This is the surface the `F6.1` check caught clipping its own title on a short
 * window, and the geometry fix is entirely in `Overlay`: this file no longer
 * decides where it sits, only what it says.
 *
 * Two things beyond geometry were missing and are fixed here, because they are
 * the same defect wearing a different hat — the dialog was not really a dialog:
 *
 *   • **Escape and the focus trap.** Every other overlay routed through
 *     `useDismissableLayer`; this one hand-rolled a scrim click. So the one
 *     dialog you meet on the way out of a visit was the one you could not cancel
 *     with the keyboard, and Tab walked into the launcher behind it.
 *   • **`role="dialog"` and a described body.** Without them a screen reader
 *     announced two unlabelled buttons and no question.
 *
 * It rides the `confirm` rung, above `modal`, so confirming something raised
 * from inside a dialog is not hidden behind it.
 */

import { motion } from 'framer-motion'
import { useId } from 'react'
import { Overlay } from '@/components/ui/overlay'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useT } from '@/lib/i18n/provider'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useT()
  const titleId = useId()
  const bodyId = useId()
  const reduced = useReducedMotion()
  const panelRef = useDismissableLayer({ open, onClose: onCancel })

  // The defaults are translated, not English literals. Every caller passes a
  // localized `confirmLabel` (it is the verb of the action) and none passes
  // `cancelLabel`, so a hardcoded `'Cancel'` shipped an English button sitting
  // next to Russian copy in the one dialog you cannot avoid on the way out.
  const confirmText = confirmLabel ?? t('common.confirm')
  const cancelText = cancelLabel ?? t('common.cancel')

  return (
    <Overlay open={open} layer="confirm" onDismiss={onCancel}>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        // The cap plus an internal scroll body: a long confirmation shrinks its
        // text instead of pushing its own buttons off the screen, which on a
        // kiosk would leave no way to answer the question.
        className={cn(
          'tick-corners flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-2 outline-none',
          OVERLAY_MAX_H,
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <h3
            id={titleId}
            className="font-display text-xl font-bold uppercase tracking-tight text-text-high text-balance"
          >
            {title}
          </h3>
          <p id={bodyId} className="mt-2 text-pretty text-sm leading-relaxed text-text-medium">
            {message}
          </p>
        </div>

        {/* The answer is pinned outside the scroll area — the buttons are the
            one part that must never require scrolling to reach. */}
        <div className="flex shrink-0 gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-md py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{ background: danger ? 'var(--danger)' : 'var(--success)' }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </Overlay>
  )
}
