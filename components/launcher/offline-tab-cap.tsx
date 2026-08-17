'use client'

/**
 * The offline ceiling on a postpaid tab (C2.17).
 *
 * Presentation only: *when* this opens is decided in `time-warnings.tsx`, from
 * the one reading the club is owed (`unreportedSeconds()`) against
 * `OFFLINE_TAB_CAP_SECONDS`. This file owns what a walk-in is told once it has
 * been reached, and the whole design is an argument about what it must **not**
 * claim:
 *
 *  1. **It is not a wall.** The clock behind it keeps running, the tab is not
 *     closed and no charge is written here — money is the server's (F3.7), and a
 *     station is paused by the club, never by a client that lost its link. So
 *     both buttons hand the decision back: reach a human, or carry on informed.
 *
 *  2. **The number is the shell's, not the till's.** What is shown is the span
 *     the club has not heard about and what it comes to at the mock rate — a
 *     *preview* of a bill nobody has issued. Rendering it as a total would make
 *     an eight-hour outage look settled the moment the link returned and the
 *     server's own arithmetic replaced it.
 *
 *  3. **It is dismissable, and dismissal is honest about that.** A walk-in mid
 *     match cannot be held behind a modal that the club may take an hour to
 *     answer; the hint under "Keep playing" says the meter is unaffected instead
 *     of implying a reprieve.
 *
 * "Call the admin" is deliberately **not** gated by the outage. `support.callStaff`
 * is outside `OFFLINE_BLOCKED` on purpose (C2.12/C2.13) — reaching a human is the
 * one act an outage must never take away, and on this panel it is the only door
 * that leads anywhere.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import { Overlay } from '@/components/ui/overlay'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { callStaff, toApiError } from '@/lib/mock/api'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { timeChargeCents, useStore } from '@/lib/store'
import { formatCountdown } from '@/lib/time'
import type { Seconds } from '@/lib/types/common'
import { cn } from '@/lib/utils'

export function OfflineTabCap({
  open,
  unreported,
  onClose,
}: {
  open: boolean
  /** The reading the club has not been told about — never the length of the visit. */
  unreported: Seconds
  onClose: () => void
}) {
  const { t, tp } = useT()
  const toast = useStore((s) => s.toast)

  const [calling, setCalling] = useState(false)
  const [called, setCalled] = useState(false)

  const panelRef = useDismissableLayer({ open, onClose, closeOnEscape: true })

  const call = useCallback(async () => {
    setCalling(true)
    try {
      await callStaff({ category: 'other' })
      setCalled(true)
      toast('info', t('session.callAdminSent'))
    } catch (error) {
      toast('error', t(`errors.${toApiError(error).code}` as TKey))
    } finally {
      setCalling(false)
    }
  }, [t, toast])

  // Whole minutes, because that is the unit the tab is billed in
  // (`timeChargeCents` rounds up), and a sentence about "31 minutes 12 seconds"
  // invites an argument the shell cannot settle.
  const minutes = Math.floor(unreported / 60)

  return (
    // `modal` rather than `takeover`: this is serious but it is not a deadline,
    // and the last minute of a prepaid visit must still be able to cover it.
    <Overlay open={open} layer="modal" blur="md" onDismiss={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tab-cap-title"
        aria-describedby="tab-cap-body"
        className={cn(
          'panel-raised flex w-full max-w-md flex-col gap-5 overflow-y-auto rounded-lg border border-warning/40 p-6',
          OVERLAY_MAX_H,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
            <icons.offline size={28} className="text-warning" aria-hidden />
          </span>
          <h2
            id="tab-cap-title"
            className="font-display text-xl font-black uppercase text-balance text-text-high"
          >
            {t('session.tabCapTitle')}
          </h2>
          <p id="tab-cap-body" className="text-pretty text-sm leading-relaxed text-text-medium">
            {t('session.tabCapBody')}
          </p>
        </div>

        {/* Two readings, side by side, both labelled as *unreported* rather than
            owed: the span, and what it comes to at the club rate. */}
        <div className="flex flex-wrap justify-center gap-6 border-y border-border py-4">
          <div className="flex flex-col items-center gap-1">
            <span className="label-mono text-[9px] text-text-low">
              {t('session.tabCapElapsed')}
            </span>
            <span className="font-display text-2xl font-black tabular-nums text-text-high">
              {formatCountdown(unreported)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="label-mono text-[9px] text-text-low">{t('session.tabCapCharge')}</span>
            <Money value={timeChargeCents(unreported)} fromCents size="md" />
          </div>
        </div>
        <p className="text-pretty text-center text-xs leading-relaxed text-warning">
          {tp('session.tabCapUnbilled', minutes)}
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              size="md"
              loading={calling}
              disabled={called || calling}
              onClick={() => void call()}
              iconLeft={<icons.support aria-hidden />}
            >
              {called ? t('session.callAdminAgain') : t('session.pauseCallAdmin')}
            </Button>
            <Button variant="secondary" size="md" voice="plain" disabled={calling} onClick={onClose}>
              {t('session.tabCapDismiss')}
            </Button>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-text-low">
            {t('session.tabCapDismissHint')}
          </p>
        </div>
      </div>
    </Overlay>
  )
}
