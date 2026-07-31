'use client'

/**
 * Paused by an admin, without leaving the visit (C2.7).
 *
 * An admin freezes the seat mid-session — a break, a payment at the counter,
 * maintenance — and the player gets a full-screen answer instead of a launcher
 * that has silently stopped counting. Three decisions define it, and each one is
 * the bug that would otherwise be here.
 *
 *  1. **It writes nothing about the clock.** `SessionManager` already adopts the
 *     `snapshot` on `session.paused` / `session.resumed` (F6.3), and that
 *     snapshot arrives with `state: 'paused'`, which lands as `timerRunning:
 *     false`, `expiresAt: null` and the remainder banked. So "time is not spent"
 *     is not implemented here at all — it is a consequence of the one write path,
 *     and this file only listens for the *reason*, which is the single fact the
 *     store has no field for. A second `pauseSession()` call from here would be
 *     two components racing to own one clock.
 *
 *  2. **It is a scrim, not a screen.** The launcher stays mounted underneath —
 *     no route change, no unmount, no remount on resume. That is what "returns to
 *     the game without losing context" means concretely: a half-typed search, an
 *     open cart and the scroll position of the game grid are all still there when
 *     the overlay goes away, because nothing was ever torn down. Sending a paused
 *     seat to the lock screen (`SessionPaused`, C1.10) would take the PIN as the
 *     price of a 30-second break.
 *
 *  3. **Nothing dismisses it.** No close button, no Escape, no backdrop click —
 *     `Overlay` gets no `onDismiss`, so it renders no dismiss affordance. A pause
 *     the player can click away is a pause that only paused the clock, and the
 *     screen would then disagree with the club about whether the seat is usable.
 *     The one action offered is calling the admin, which is the only move that can
 *     actually end the wait.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { formatRemainder } from '@/components/auth/session-paused'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { callStaff, toApiError } from '@/lib/mock/api'
import type { PauseReason } from '@/lib/realtime/events'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * The club's cause, in the player's words.
 *
 * A map rather than `t(\`session.pauseReason${reason}\`)` so an unknown reason
 * from a newer server falls back to a sentence instead of rendering a raw key at
 * the player — the reason is the whole point of this overlay, so it is the last
 * thing allowed to come out as `session.pauseReasonFoo`.
 */
const REASON_KEY: Record<PauseReason, TKey> = {
  staff: 'session.pauseReasonStaff',
  break: 'session.pauseReasonBreak',
  paymentRequired: 'session.pauseReasonPaymentRequired',
  maintenance: 'session.pauseReasonMaintenance',
}

export function SessionPauseOverlay() {
  const { t } = useT()

  const toast = useStore((s) => s.toast)
  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)

  /**
   * `null` is "not paused". The reason and the open flag are one piece of state
   * on purpose: an overlay that could be open with no reason to show is exactly
   * the "paused, cause unknown" screen this feature exists to avoid.
   */
  const [reason, setReason] = useState<PauseReason | null>(null)
  const [busy, setBusy] = useState(false)
  const [called, setCalled] = useState(false)

  useRealtimeEvent('session.paused', (event) => {
    setReason(event.payload.reason)
    // A fresh pause is a fresh wait: the admin who lifted the last one is not
    // necessarily watching this one, so the call button is offered again.
    setCalled(false)
  })

  useRealtimeEvent('session.resumed', () => {
    setReason(null)
    // The confirmation lands *after* the overlay is gone, on top of the launcher
    // the player is being handed back — the same way every other status in the
    // product reports.
    toast('success', t('session.pauseResumedToast'))
  })

  const call = useCallback(async () => {
    setBusy(true)
    try {
      await callStaff({ category: 'other' })
      setCalled(true)
      toast('info', t('session.callAdminSent'))
    } catch (error) {
      toast('error', t(`errors.${toApiError(error).code}` as TKey))
    } finally {
      setBusy(false)
    }
  }, [t, toast])

  const open = reason !== null

  return (
    // `blocking`: a frozen seat outranks every dialog, cart and confirmation,
    // because none of them can be completed until the club lifts the pause. No
    // `onDismiss` — see the note at the top of the file.
    <Overlay open={open} layer="blocking" blur="md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-pause-title"
        aria-describedby="session-pause-body"
        className={cn(
          'panel-raised flex w-full max-w-md flex-col items-center gap-5 overflow-y-auto rounded-lg border border-border p-6 text-center',
          OVERLAY_MAX_H,
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
          <icons.timer size={28} className="text-warning" aria-hidden />
        </span>

        <div className="flex flex-col gap-2">
          <h2
            id="session-pause-title"
            className="font-display text-xl font-black uppercase text-balance text-text-high"
          >
            {t('session.pauseTitle')}
          </h2>
          <p id="session-pause-body" className="text-pretty text-sm leading-relaxed text-text-medium">
            {t('session.pauseBody')}
          </p>
        </div>

        {/* The cause, given its own framed block rather than another paragraph:
            it is the one line on this screen the player is actually looking for. */}
        <div className="flex w-full flex-col gap-1 rounded-md border border-border bg-surface-sunken p-4">
          <span className="label-mono text-[9px] text-text-low">{t('session.pauseReasonLabel')}</span>
          <p className="text-pretty text-sm leading-relaxed text-text-high">
            {t(reason ? REASON_KEY[reason] : 'session.pauseReasonUnknown')}
          </p>
        </div>

        {/* The proof of the promise above, and only where there is one to show: a
            postpaid tab counts *up* into an open bill, so it has no remainder to
            hold and printing 00:00 would read as a seat with nothing left on it. */}
        {billingMode !== 'postpaid' && (
          <div className="flex flex-col items-center gap-1">
            <span className="label-mono text-[9px] text-text-low">{t('session.pauseRemaining')}</span>
            {/* Deliberately not a `Countdown`: that component's job is to animate a
                number downwards, and the entire message here is that this one is
                standing still. */}
            <span className="font-mono text-3xl font-black tabular-nums text-text-high">
              {formatRemainder(seconds)}
            </span>
          </div>
        )}

        <p className="text-pretty text-xs leading-relaxed text-text-medium">
          {t('session.pauseWaitHint')}
        </p>

        <Button
          variant="secondary"
          size="md"
          voice="plain"
          loading={busy}
          disabled={called || busy}
          onClick={() => void call()}
          iconLeft={<icons.support aria-hidden />}
        >
          {called ? t('session.callAdminAgain') : t('session.pauseCallAdmin')}
        </Button>
      </div>
    </Overlay>
  )
}
