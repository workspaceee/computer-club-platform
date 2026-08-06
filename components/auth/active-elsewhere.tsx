'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { DEV_SHORTCUTS } from '@/lib/dev-flags'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { ApiError, requestTransfer, type TransferRequest } from '@/lib/mock/api'
// MOCK ONLY — the shift admin's app this prototype does not have. It answers the
// ask from inside the card, exactly like the QR dialog plays the phone next to
// the code it owns, and it goes away with `lib/mock/*` in Stage 4. Nothing above
// the dev plate at the bottom of this file imports it.
import { approveSessionTransfer } from '@/lib/realtime/admin-sim'
import type { ID } from '@/lib/types/common'

interface ActiveElsewhereProps {
  /** The seat the visit is on, as the club writes it (`PC #05`). */
  machineLabel: string
  /** The visit being moved, so an approval cannot move a different one. */
  sessionId: ID
  /**
   * The row is on this seat now — run the gate again.
   *
   * Not "enter the launcher": the move only put the session on this machine, and
   * *claiming* it is still a write the caller owns (the same rule `SeatTaken`
   * follows when a hold is released). Going back through `admit` is what adopts
   * the visit, with its used seconds and its tab, and what refuses again if the
   * chair was taken in the meantime.
   */
  onMoved: () => void
  /** Nothing left to move: the visit ended or was picked up somewhere else. */
  onGone: (message: TKey) => void
  /** Back to the sign-in form, for whoever is next at this keyboard. */
  onCancel: () => void
  /** Localized toast, so the screen keeps owning the toast voice. */
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
  /** Shake the card, like a refused sign-in. */
  onReject: () => void
}

/**
 * "Your session is running on another PC" (C1.12).
 *
 * The mirror of `SeatTaken`, and deliberately not the same panel. There the
 * chair is held by a stranger and the only exit is an admin's key, so the card
 * offers a re-check and nothing else. Here the chair is free and the *visit* is
 * the player's own — so the card offers the one repair that belongs to them:
 * ask for it to be moved to this keyboard.
 *
 * What it may not do is move it itself. The other seat still has their bag on it
 * and possibly a friend in the chair, so the write that ends a visit somewhere
 * else in the club belongs to the shift admin — the same reason C1.7 has no "end
 * their session" button. The station asks; the approval arrives as a
 * `session.moved` frame on the bus, which is what this panel waits for.
 *
 * Two states, one card: the ask, and the wait. The wait is not a spinner over a
 * blank card — it names the seat the player has to collect their things from,
 * because that walk is the actual next step.
 */
export function ActiveElsewhere({
  machineLabel,
  sessionId,
  onMoved,
  onGone,
  onCancel,
  onToast,
  onReject,
}: ActiveElsewhereProps) {
  const { t } = useT()
  /** The pending ask. `null` while the card is still offering it. */
  const [request, setRequest] = useState<TransferRequest | null>(null)
  const [asking, setAsking] = useState(false)

  const ask = async () => {
    if (asking) return
    setAsking(true)
    try {
      const next = await requestTransfer(sessionId)
      setRequest(next)
      onToast('info', t('auth.transferRequestedToast'))
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic'
      /**
       * Both of these mean the same thing to the player: there is no longer a
       * visit elsewhere to bring here. `sessionExpired` is the visit ending
       * while the card was up; `conflict` is it already being on this seat —
       * somebody carried it over, or an earlier ask was approved. Saying
       * "already changed, refresh and try again" over a lock screen with no
       * refresh would be the club talking to itself.
       */
      if (code === 'sessionExpired' || code === 'conflict') {
        onGone('auth.transferGone')
        return
      }
      onReject()
      onToast('error', t(`errors.${code}` as TKey))
    } finally {
      setAsking(false)
    }
  }

  /**
   * The approval, as it actually arrives: a frame on the bus (C2.8 listens to the
   * same one).
   *
   * Every frame is matched against the ask on screen. The bus is shared and
   * replays its backlog on reconnect, so "a session was moved" is not the same
   * statement as "*this* session was moved *here*" — without both checks a
   * replayed frame from an admin's earlier "Move to B-05" would let this card
   * claim a seat nobody approved.
   *
   * Only subscribed while an ask is pending: before that there is nothing this
   * screen could act on, and a station sitting on a lock screen has no business
   * reacting to moves that belong to other visits.
   */
  useRealtimeEvent(
    'session.moved',
    (event) => {
      if (!request) return
      const { sessionId: moved, toMachineId } = event.payload
      if (moved !== sessionId || toMachineId !== request.toMachineId) return
      onToast('success', t('auth.transferDoneToast'))
      onMoved()
    },
    request !== null,
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
      // One announcement, arriving after something the player did (a sign-in
      // that went through). `status`, not `alert`: nothing is wrong here.
      role="status"
    >
      {/* A well (§3.3): the seat the visit is on is a fact stated inside the
          card, not another panel floating over it. */}
      <div className="well flex items-start gap-3 rounded-lg border border-border p-4">
        {/* Warning, not danger: nothing is broken and nobody is in the way — the
            account is simply playing across the room. */}
        <IconTile icon={icons.display} variant="warning" size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* The seat label is data the club authors (`PC #05`), so it is never
              translated: it is the string the player reads out loud, either to
              walk back to it or to name it at the counter. */}
          <span className="truncate font-display text-base font-semibold uppercase tracking-tight text-text-high">
            {t('auth.activeElsewhereSeat', { machine: machineLabel })}
          </span>
          <span className="label-mono text-[10px] text-text-low">
            {t('session.running')}
          </span>
        </div>
      </div>

      {request === null ? (
        <>
          {/* The one bevelled action of the card (§4) — the repair this refusal,
              unlike C1.7's, is allowed to offer. */}
          <Button
            size="lg"
            block
            cut
            loading={asking}
            onClick={() => void ask()}
            iconLeft={<icons.forward size={18} />}
          >
            {t('auth.transferHere')}
          </Button>

          {/* Not a repair, just a way out of a dead end: the next person at this
              keyboard gets the form back without waiting for the attract mode. */}
          <Button
            variant="ghost"
            size="sm"
            voice="plain"
            onClick={onCancel}
            className="self-center text-text-low hover:bg-transparent hover:text-text-high"
          >
            {t('auth.backToSignIn')}
          </Button>
        </>
      ) : (
        <>
          {/* The wait, stated as two facts rather than a spinner over nothing:
              who has to answer, and what the player does meanwhile. */}
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm leading-relaxed text-text-high">
              <icons.pending size={15} className="shrink-0 animate-spin text-primary" />
              {t('auth.transferPending')}
            </span>
            <span className="text-pretty text-xs leading-relaxed text-text-medium">
              {t('auth.transferPendingNote', { machine: machineLabel })}
            </span>
          </div>

          {/*
            MOCK ONLY — there is no admin app, so the way to answer the ask is
            named instead of hidden. Same "announced, not broken" plate the
            emailed codes and the QR dialog use (§3.3).

            It lives *here* and not on `/dev/bus` for the reason the QR button
            does: the bus is in-memory per tab and the console is another route,
            so navigating there would unmount this card and take the pending ask
            with it.

            And it plays the *admin*, nothing more. It calls the admin's endpoint
            through `admin-sim` — move the row, then publish `session.moved` —
            and gets out of the way: the frame travels the real bus, this card
            receives it through its normal subscription, matches it against the
            ask on screen and only then claims the seat. Every guard stays live.
          */}
          {DEV_SHORTCUTS && (
            <div className="well flex flex-col gap-2 rounded-lg border border-warning/30 p-3">
              <span className="label-mono flex items-center gap-2 text-[9px] text-warning">
                <icons.info size={11} />
                {t('auth.transferDemoTitle')}
              </span>
              <span className="text-pretty text-[11px] leading-relaxed text-text-low">
                {t('auth.transferDemoNote')}
              </span>
              <Button
                size="sm"
                variant="secondary"
                block
                onClick={() => {
                  // `null` means the ask died between the render and the click —
                  // the visit ended, or it was answered already. Say so instead
                  // of leaving the player pressing a button that does nothing.
                  if (!approveSessionTransfer(request.requestId)) onGone('auth.transferGone')
                }}
                iconLeft={<icons.staff size={14} />}
              >
                {t('auth.transferDemoApprove')}
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            voice="plain"
            onClick={onCancel}
            className="self-center text-text-low hover:bg-transparent hover:text-text-high"
          >
            {t('auth.backToSignIn')}
          </Button>
        </>
      )}
    </motion.div>
  )
}
