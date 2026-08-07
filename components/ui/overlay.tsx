'use client'

/**
 * The one centring frame for every dialog in the product (F6.4).
 *
 * This exists because of a real defect found while checking `F6.1` on a 1216×693
 * window: the lock confirmation was centred with `flex items-center` inside a
 * `fixed inset-0`, so as soon as the card was taller than the window it grew
 * **in both directions** and its title left the top of the screen. Nothing could
 * scroll it back into view — the container was exactly viewport-sized, and the
 * body behind it was scroll-locked. On a short window the user was asked to
 * confirm something they could not read.
 *
 * The fix is the `min-h-full` sandwich, and both halves matter:
 *
 *   • the outer layer is the **scroll port** (`overflow-y-auto`), so an
 *     over-tall dialog can always be reached;
 *   • the inner track is `min-h-full` + `items-center`, which centres while the
 *     card fits and switches to top-aligned + scrollable the moment it does not.
 *     Plain `h-full items-center` would keep centring and clip both ends; plain
 *     `items-start` would never centre.
 *
 * Cards on top of this cap themselves with `OVERLAY_MAX_H` and scroll their own
 * body, so the outer scroll port is the *fallback* — it catches the case where
 * even a capped card cannot shrink (a header + footer taller than the window),
 * instead of being the primary mechanism.
 *
 * The scrim is `fixed`, not `absolute`: an absolute scrim is only as tall as the
 * scroll content, so scrolling a tall dialog would drag the dim edge along with
 * it and reveal the live page underneath.
 *
 * ---
 *
 * And the reason the geometry alone was not enough: **everything here is
 * portalled to `document.body`.**
 *
 * The confirmation that lost its title is rendered by `TopBar`, and the top bar
 * carries `glass` — i.e. `backdrop-filter`. A `backdrop-filter` (like `filter`,
 * `transform` and `contain`) makes the element a *containing block for fixed
 * descendants*, so `fixed inset-0` inside the header did not mean "the viewport",
 * it meant "the 64px-tall bar". The dialog was being clipped to the height of the
 * header, which is why only a sliver of its top edge was ever visible and why no
 * amount of `items-center` / `max-h` tuning could rescue it.
 *
 * That also makes the `z` ladder honest: a nested overlay competes only inside
 * its parent's stacking context, so a `z-70` dialog under a `z-40` bar would lose
 * to it. From the body, the rungs in `lib/overlay.ts` mean what they say.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { overlayZ, type OverlayLayer } from '@/lib/overlay'
import { cn } from '@/lib/utils'

interface OverlayProps {
  open: boolean
  /** Which rung of the ladder in `lib/overlay.ts`. */
  layer?: OverlayLayer
  /**
   * Called when the scrim (or the gutter around the card) is clicked. Omit for
   * a blocking layer — then the scrim swallows clicks instead of closing.
   */
  onDismiss?: () => void
  /** Heavier blur for the takeover-style dialogs (game launch, checkout). */
  blur?: 'sm' | 'md'
  /** Extra classes for the centring track, e.g. wider gutters. */
  className?: string
  children?: React.ReactNode
}

export function Overlay({
  open,
  layer = 'modal',
  onDismiss,
  blur = 'sm',
  className,
  children,
}: OverlayProps) {
  const reduced = useReducedMotion()

  // `document` does not exist during the server render, and going straight to a
  // portal on the first client render would be a hydration mismatch. Mounting on
  // the next tick costs nothing here because an overlay is never part of the
  // first paint — it only ever appears in response to something the guest did.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          // `overscroll-contain` keeps a flick inside a tall dialog from
          // scrolling the page behind it once the dialog hits its end.
          className={cn('fixed inset-0 overflow-y-auto overscroll-contain', overlayZ[layer])}
        >
          <div
            aria-hidden
            onClick={onDismiss}
            className={cn(
              // `scrim` (§3.3) — the one darkening depth in the product.
              'scrim fixed inset-0',
              blur === 'md' ? 'backdrop-blur-md' : 'backdrop-blur-sm',
            )}
          />

          <div
            // Clicks in the gutter dismiss too, but only when they land on the
            // track itself — `currentTarget` equality is what keeps a click that
            // bubbled up from inside the card from closing it, without asking
            // every card to remember `stopPropagation`.
            onClick={(e) => {
              if (onDismiss && e.target === e.currentTarget) onDismiss()
            }}
            className={cn(
              'relative flex min-h-full items-center justify-center p-4 sm:p-6',
              className,
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
