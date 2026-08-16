'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import type { StationHolder } from '@/lib/mock/api'

/**
 * How often the screen re-reads the seat on its own.
 *
 * The player is standing at the machine waiting for an admin to close somebody
 * else's visit, so the release has to show up without them touching anything —
 * but the pushes that would carry it are scoped to *this* client's identity
 * (F4.3), and the session holding the seat belongs to a stranger. Nothing is
 * addressed here, so this screen polls. 10 s is short enough that the walk from
 * the counter is the slow part and long enough not to hammer the endpoint.
 */
const AUTO_RECHECK_MS = 10_000

/**
 * Which of the three "the seat is taken" lines fits this hold.
 *
 * Exported because the *card header* renders it: the lock screen paints exactly
 * one headline and one subline, in one place, and a flow that takes the card over
 * supplies only the keys that go into them (the same division `RECOVERY_COPY`
 * and `SIGNUP_COPY` use). The panel below therefore never repeats the sentence.
 *
 * Paused outranks "guest", because it changes what the player should expect: a
 * paused visit *looks* finished — the launcher is gone, this is a lock screen —
 * and still owns the seat. Saying "a guest visit is running" instead would
 * describe the account and hide the reason.
 */
export function seatTakenBody(holder: StationHolder): TKey {
  if (holder.state === 'paused') return 'auth.seatTakenPausedBody'
  return holder.userId === null ? 'auth.seatTakenGuestBody' : 'auth.seatTakenBody'
}

interface SeatTakenProps {
  /** Who holds the seat, as last read. Re-stated on every re-check. */
  holder: StationHolder
  /**
   * Re-reads the seat and applies the *same* admission rule the screen used to
   * get here. `null` means nothing blocks this arrival any more.
   *
   * The rule stays in the caller on purpose: one place decides who may sit down,
   * or this panel becomes a second opinion able to let somebody past a hold.
   */
  onRecheck: () => Promise<StationHolder | null>
  /** The hold is gone — let the arrival that was held back in. */
  onFreed: () => void
  /** Still held, possibly by a different person than a moment ago. */
  onStillHeld: (holder: StationHolder) => void
  /** Back to the sign-in form, for whoever is next at this keyboard. */
  onCancel: () => void
  /** Localized toast, so the screen keeps owning the toast voice. */
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
  /** Shake the card, like a refused sign-in. */
  onReject: () => void
}

/**
 * "This chair is taken" (C1.7).
 *
 * The last gate of the lock screen, and the one that has nothing to do with
 * credentials: the password was right, the account is fine, and the station is
 * already running somebody else's visit. So it takes the card body the way the
 * other flows do instead of appearing as an error toast over the form — a toast
 * would be gone in four seconds, and the fact it carries ("go to the counter")
 * is the whole next step.
 *
 * Two rules shape it:
 *
 *  - **No self-service repair.** There is no "end their session" button here,
 *    and there must not be: a client that could evict a live session from a lock
 *    screen would be a way for anyone in the room to end a stranger's paid
 *    visit. The only exit is the admin's key, so the only thing the panel does
 *    is *name* it — and re-check, which decides nothing.
 *  - **It names the person, not a status.** `occupied` is what the seat map
 *    says; a player looking at this screen needs to know whose session it is, so
 *    they can tell the admin, and whether it is merely paused — because a paused
 *    visit is exactly the case where the machine looks free and is not.
 */
export function SeatTaken({
  holder,
  onRecheck,
  onFreed,
  onStillHeld,
  onCancel,
  onToast,
  onReject,
}: SeatTakenProps) {
  const { t, formatTime } = useT()
  const [checking, setChecking] = useState(false)

  /**
   * Guards the poll against the button and itself: a re-check that is already in
   * flight must not be started again, or a slow answer and a fresh one race to
   * decide whether the seat is free.
   */
  const busy = useRef(false)

  /**
   * One re-check, shared by the button and the timer.
   *
   * `silent` is what tells them apart. A tap deserves an answer either way —
   * "still held by X" plus the same shake a refused sign-in gets, so the screen
   * visibly *did* something. The poll must stay quiet: a toast every 10 s while
   * somebody waits for the admin would be the product nagging them about a
   * situation they already know about.
   */
  const recheck = async (silent: boolean) => {
    if (busy.current) return
    busy.current = true
    if (!silent) setChecking(true)
    try {
      const held = await onRecheck()
      if (!held) {
        onToast('success', t('auth.seatTakenFreedToast'))
        onFreed()
        return
      }
      onStillHeld(held)
      if (!silent) {
        onToast('info', t('auth.seatTakenStillHeld', { name: held.holder }))
        onReject()
      }
    } finally {
      busy.current = false
      setChecking(false)
    }
  }

  useEffect(() => {
    const id = setInterval(() => void recheck(true), AUTO_RECHECK_MS)
    return () => clearInterval(id)
    // The interval only calls `recheck`, whose inputs are refs and props read at
    // call time, so re-arming it on every render would reset the countdown to
    // the next poll instead of keeping one steady beat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
      // The whole panel is one announcement, and it arrives *after* an action
      // the player took (a sign-in that went through). `alert` would interrupt;
      // `status` reads it once the card has settled.
      role="status"
    >
      {/* A well (§3.3): the seat's current occupant is a fact stated inside the
          card, not another panel floating over it. */}
      <div className="well flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          {/* Warning, not danger: nothing is broken and nobody did anything
              wrong — the seat is simply busy. The glyph follows the club's one
              icon per meaning: a member is `player`, a walk-in is `guest`. */}
          <IconTile
            icon={holder.userId === null ? icons.guest : icons.player}
            variant="warning"
            size="md"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* The name is data (an admin-authored nickname), so it is never
                translated and never truncated into something unreadable — it is
                what the player will say at the counter. */}
            <span className="truncate font-display text-base font-semibold uppercase tracking-tight text-text-high">
              {holder.holder}
            </span>
            <span className="label-mono text-[10px] text-text-low">
              {t('auth.seatTakenSince', { time: formatTime(new Date(holder.startedAt)) })}
            </span>
          </div>
          {/* Status plate (§3.3) — only for a paused hold, which is the one state
              worth printing: it is why a held seat can look free. An active one
              needs no plate, because the headline above already says "in use"
              and the station badge next to it says so again; a third copy would
              read as a fourth fact rather than the same one. */}
          {holder.state === 'paused' && (
            <span className="label-mono shrink-0 rounded-sm border border-warning/30 bg-warning/12 px-2 py-0.5 text-[9px] text-warning">
              {t('session.paused')}
            </span>
          )}
        </div>
      </div>

      {/* The only action on the card while the hold stands, so it carries the
          screen's one bevel (§4): it is the way in, once the way in exists. */}
      <Button
        size="lg"
        block
        cut
        loading={checking}
        onClick={() => void recheck(false)}
        iconLeft={<icons.retry size={18} />}
      >
        {t('auth.seatTakenRecheck')}
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
    </motion.div>
  )
}
