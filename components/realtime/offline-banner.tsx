'use client'

/**
 * "No connection to the club server" (F4.5).
 *
 * Three promises this banner has to keep, in order:
 *   1. tell the truth — the link is down, staff cannot see this seat right now;
 *   2. calm the player — **the clock keeps running locally off `expiresAt`**, so
 *      nobody loses paid minutes to a bad cable;
 *   3. get out of the way — one strip at the top, never a modal, never blocking
 *      a running match.
 *
 * It shows the automatic backoff (`retryInSeconds`, `attempt`) so waiting feels
 * deliberate instead of broken, plus a manual "Try now" for the impatient.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/provider'
import type { RealtimeChannelState } from '@/hooks/use-realtime'

export function OfflineBanner({
  offline,
  status,
  attempt,
  retryInSeconds,
  pending,
  reconnectNow,
}: RealtimeChannelState) {
  const { t, tp } = useT()
  const retrying = status === 'connecting'

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          // `assertive` would interrupt a screen reader mid-sentence; the outage
          // is important but not urgent enough to talk over the player.
          role="status"
          aria-live="polite"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          // Right padding keeps the strip clear of the toast column (top-right).
          className="pointer-events-auto fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4 md:pr-88"
        >
          <div className="flex w-full max-w-3xl items-center gap-3 rounded-lg border border-warning/35 bg-warning/12 px-4 py-3 backdrop-blur-md">
            <CloudOff
              className={`size-5 shrink-0 text-warning ${retrying ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />

            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm font-semibold text-text-high">
                {t('realtime.offlineTitle')}
              </p>
              <p className="truncate text-xs leading-relaxed text-text-medium">
                {t('realtime.offlineBody')}
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <div className="hidden flex-col items-end gap-0.5 sm:flex">
                <span className="label-mono text-[10px] tabular-nums text-warning">
                  {retrying
                    ? t('realtime.reconnecting')
                    : retryInSeconds > 0
                      ? t('realtime.retryIn', { n: retryInSeconds })
                      : t('realtime.attempt', { n: Math.max(attempt, 1) })}
                </span>
                {pending > 0 && (
                  <span className="label-mono text-[10px] tabular-nums text-text-low">
                    {tp('realtime.pendingUpdates', pending)}
                  </span>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={reconnectNow}
                disabled={retrying}
                aria-label={t('realtime.retryNow')}
              >
                <RefreshCw className={retrying ? 'animate-spin' : undefined} aria-hidden="true" />
                {t('realtime.retryNow')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
