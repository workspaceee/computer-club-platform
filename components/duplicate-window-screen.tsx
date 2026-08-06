'use client'

/**
 * "The launcher is already open" (C1.12, second half).
 *
 * The screen half of `useSingleWindow()`. Two launcher windows on one keyboard
 * are one machine as far as the club can tell — same seat, same session, two
 * clocks — so the rule is kept in the browser, and this is what the losing
 * window shows instead of the product.
 *
 * Three decisions, and none of them are cosmetic:
 *
 *  - **It is opaque, not a scrim.** Every other blocking layer darkens the
 *    launcher behind it because that launcher is still the truth. Here it is
 *    precisely *not*: a second clock counting down and a second "End session"
 *    button, dimmed but legible, are the thing this screen exists to take away.
 *    So it paints the station's own background over them, `app-ambient` and the
 *    grid included, and the window reads as a station that has nothing on it
 *    rather than a launcher behind glass.
 *  - **No buttons.** There is nothing to press: the other window is the
 *    launcher, and this one cannot become it by asking. The lock is *queued*,
 *    so the moment the real window closes this one is granted it and the panel
 *    leaves by itself — which is why the last line promises exactly that. A
 *    "Retry" here would be a button that does what the browser already did.
 *  - **`role="status"`, not `alert`.** Nobody did anything wrong and nothing
 *    failed; a duplicate window is a mistake of the hand, and it is announced
 *    once, after the panel has settled.
 *
 * It is the top rung of the ladder (`overlayZ.blocking`) for the same reason the
 * end of the visit is: a half-finished checkout in a window that is not the
 * station must not be reachable, and least of all *above* the notice saying so.
 */

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import { overlayZ } from '@/lib/overlay'
import { cn } from '@/lib/utils'

export function DuplicateWindowScreen() {
  const { t } = useT()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      // The scroll port only — the centring happens on the `min-h-full`
      // sandwich inside, so a long translation on a short window scrolls from
      // the top instead of being clipped above the edge (F6.1).
      className={cn('app-ambient fixed inset-0 overflow-y-auto overscroll-contain', overlayZ.blocking)}
      role="status"
    >
      <div className="hairline-grid pointer-events-none fixed inset-0 opacity-60" />

      <div className="relative flex min-h-full flex-col items-center justify-center gap-6 px-6 py-10">
        <div className="glass-strong tick-corners flex w-full max-w-md flex-col items-center gap-5 rounded-xl px-6 py-8 text-center sm:px-10">
          {/* Info, not warning: the club is fine and the seat is theirs. The
              glyph is the station's own — the fact is about this PC. */}
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full border border-info/30 bg-info/10 text-info"
          >
            <icons.display size={24} />
          </span>

          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-text-high text-balance sm:text-3xl">
              {t('auth.duplicateWindow')}{' '}
              <span className="text-primary text-glow">{t('auth.duplicateWindowHi')}</span>
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-text-medium text-pretty">
              {t('auth.duplicateWindowBody')}
            </p>
          </div>

          {/* What the window is waiting for, and the promise that it acts on its
              own once it gets it. `aria-live="off"`: the panel above is already
              one announcement, and this line never changes. */}
          <p
            aria-live="off"
            className="label-mono flex items-center gap-2 text-[10px] tracking-[0.18em] text-text-low"
          >
            <icons.pending size={12} className="animate-spin text-primary" aria-hidden />
            {t('auth.duplicateWindowWaiting')}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
