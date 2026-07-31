'use client'

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useId } from 'react'
import { IconButton } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useT } from '@/lib/i18n/provider'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  // `svh`, like `OVERLAY_MAX_H`: a `vh`-tall takeover overshoots the visible
  // area whenever the browser keeps its own chrome on screen.
  full: 'max-w-[min(96vw,1400px)] h-[calc(100svh-2rem)]',
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
  /**
   * Which rung of `lib/overlay.ts` the card sits on.
   *
   * `modal` for everything a player opened themselves. `takeover` for the one
   * dialog the *clock* opens (C2.6): the last minute of a visit has to cover a
   * half-finished checkout the way expiry does, and a dialog on the normal rung
   * would appear *under* whatever the player happened to have up. A prop rather
   * than a second copy of this card, so the most important dialog in the product
   * cannot drift from the product's one dialog.
   */
  layer?: 'modal' | 'takeover'
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
  layer = 'modal',
  className,
  children,
}: ModalProps) {
  const titleId = useId()
  const { t } = useT()
  const reduced = useReducedMotion()
  const panelRef = useDismissableLayer({
    open,
    onClose,
    closeOnEscape: dismissable,
  })

  return (
    <Overlay open={open} layer="modal" onDismiss={dismissable ? onClose : undefined}>
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
        // `OVERLAY_MAX_H` replaces the old `max-h-[88vh]`: `vh` on a kiosk
        // browser measures the largest possible viewport, so the card was taller
        // than the space it had and its header hid under the browser UI (F6.4).
        className={cn(
          'glass-strong tick-corners relative flex w-full flex-col overflow-hidden rounded-xl outline-none',
          size === 'full' ? SIZES.full : cn(SIZES[size], OVERLAY_MAX_H),
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
              // The only string the primitive owns, so it comes from the
              // dictionary like every other word on screen (F2.2) — a
              // screen-reader-only name is still copy.
              <IconButton label={t('common.close')} size="sm" onClick={onClose} className="relative">
                <icons.close />
              </IconButton>
            )}
          </header>
        )}

        {/* The card's own scroll body. This is what keeps the outer scroll port
            idle in the normal case: the header and footer stay pinned and only
            the content moves. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </footer>
        )}
      </motion.div>
    </Overlay>
  )
}
