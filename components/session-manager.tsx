'use client'

/**
 * The one clock of the application (F6.3).
 *
 * There is exactly one interval in the product, and it lives here. It does not
 * count: it calls `syncClock()`, which re-derives the number from the session
 * anchors (`expiresAt` / `runningSince`). That distinction is what makes the
 * clock survive the two things a kiosk does all evening —
 *
 *   • **minimising / backgrounding**: browsers throttle a background timer to
 *     once a minute or stop it outright, so a decrementing counter would come
 *     back minutes rich. Re-deriving returns the same truth no matter how many
 *     ticks were skipped.
 *   • **sleep**: a suspended machine runs no timers at all. On wake the very
 *     first call produces the correct value, and an already-passed deadline
 *     expires the session immediately rather than counting down to it again.
 *
 * The interval is also resynced on the events that mark "we were away" —
 * visibility, focus, and coming back online — because otherwise the display
 * could sit up to a second stale at exactly the moment the guest is looking at
 * it. It is mounted only while the clock runs, so the lock screen does not keep
 * a 1 Hz wake-up alive for nothing.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect } from 'react'
import { useHeartbeat } from '@/hooks/use-heartbeat'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import { overlayZ } from '@/lib/overlay'
import { releaseSeat } from '@/lib/seat'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function SessionManager() {
  const { t } = useT()
  const syncClock = useStore((s) => s.syncClock)
  const timerRunning = useStore((s) => s.timerRunning)
  const sessionExpired = useStore((s) => s.sessionExpired)
  const clearExpired = useStore((s) => s.clearExpired)
  const applySnapshot = useStore((s) => s.applySnapshot)
  // Stage 2: the periodic reading the club is owed. It counts ticks and reports
  // on every tenth one; deciding *whether* there is anything to send belongs to
  // the hook, so this component stays about the clock (C2.15).
  const onTick = useHeartbeat()

  // Server truth wins over anything derived here: a granted 15 minutes arrives as
  // a *new deadline*, and the next tick simply reads it. Because the clock is a
  // derivation, adopting a snapshot needs no reconciliation — there is no counter
  // to patch, and no way for the grant to be lost or double-applied.
  useRealtimeEvent(['time.added', 'session.paused', 'session.resumed'], (event) => {
    applySnapshot(event.payload.snapshot)
  })

  useEffect(() => {
    if (!timerRunning) return

    // Sync once on mount too: resuming a visit must not show a stale second
    // while waiting for the first tick.
    syncClock()
    // The clock's tick, and the club being told about it, are the same tick
    // (F6.3, C2.15): stage 2 rides this interval instead of starting a second
    // one, so there is nothing to keep in step and no extra wake-up on an idle
    // station. `syncClock()` goes first — the reading is derived from the
    // anchors, so it is read after they have been re-derived, never before.
    const interval = setInterval(() => {
      syncClock()
      onTick()
    }, 1000)

    // `visibilitychange` covers minimise/restore and tab switching; `focus`
    // covers the window being raised without a visibility change; `online`
    // covers the wake-from-sleep case, where the network comes back before the
    // guest touches anything.
    const resync = () => syncClock()
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    window.addEventListener('online', resync)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
      window.removeEventListener('online', resync)
    }
  }, [timerRunning, syncClock, onTick])

  useEffect(() => {
    if (!sessionExpired) return
    const t = setTimeout(() => {
      // A spent clock ends the visit, so it hands the chair back like every
      // other exit does (C1.7). Without this the third way a session can end —
      // not sign-out, not "end guest session", but running out — would leave the
      // seat reading "occupied" with nobody on it, and the next player would be
      // sent to the counter for a key they do not need.
      void releaseSeat()
      clearExpired()
    }, 3000)
    return () => clearTimeout(t)
  }, [sessionExpired, clearExpired])

  return (
    <AnimatePresence>
      {sessionExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // The end of the visit is the top rung and the only one allowed there:
          // it must cover a half-finished checkout, an open cart and any dialog,
          // because none of them mean anything once the clock has run out (F6.4).
          //
          // This element is the *scroll port* only. It used to also be the
          // centring flex container (`min-h-svh` + `justify-center` on the same
          // node), which is the same defect `F6.1` caught in the confirmations:
          // a flex container that is exactly viewport-tall centres overflow in
          // both directions, and the half above the scroll origin cannot be
          // scrolled back — so on a short window (or in a long translation) the
          // "time is up" heading was cut off above the top edge.
          className={cn(
            // `scrim` (§3.3), not the hand-picked 85 % this used to carry. The
            // end of a visit is the *strongest* rung on the depth axis, but it
            // is still the same kind of darkening as a dialog backdrop, and what
            // actually makes the launcher unreadable behind it is `backdrop-blur`
            // plus `overlayZ.blocking` — the extra 15 % of black only made one
            // screen in the product darker than every other layer, for no reason
            // anybody had written down.
            'scrim fixed inset-0 overflow-y-auto overscroll-contain backdrop-blur',
            overlayZ.blocking,
          )}
        >
          {/* The `min-h-full` sandwich, same as `components/ui/overlay.tsx`:
              centred while it fits, top-aligned and scrollable the moment it
              does not. */}
          <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15"
            >
              <icons.sessionEnded size={40} className="text-primary" />
            </motion.div>
            <h2 className="font-display text-2xl font-black uppercase text-text-high text-balance sm:text-3xl">
              {t('session.expired')}
            </h2>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-text-medium">
              {t('session.expiredBody')}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
