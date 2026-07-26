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
import { TimerOff } from 'lucide-react'
import { useEffect } from 'react'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import { useStore } from '@/lib/store'

export function SessionManager() {
  const { t } = useT()
  const syncClock = useStore((s) => s.syncClock)
  const timerRunning = useStore((s) => s.timerRunning)
  const sessionExpired = useStore((s) => s.sessionExpired)
  const clearExpired = useStore((s) => s.clearExpired)
  const applySnapshot = useStore((s) => s.applySnapshot)

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
    const interval = setInterval(syncClock, 1000)

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
  }, [timerRunning, syncClock])

  useEffect(() => {
    if (!sessionExpired) return
    const t = setTimeout(() => clearExpired(), 3000)
    return () => clearTimeout(t)
  }, [sessionExpired, clearExpired])

  return (
    <AnimatePresence>
      {sessionExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center backdrop-blur"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
          >
            <TimerOff size={40} className="text-primary" />
          </motion.div>
          <h2 className="font-display text-2xl font-black uppercase text-text-high text-balance sm:text-3xl">
            {t('session.expired')}
          </h2>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-text-medium">
            {t('session.expiredBody')}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
