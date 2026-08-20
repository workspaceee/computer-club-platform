'use client'

/**
 * The club's day ending, announced (C2.11).
 *
 * Three marks — 60, 30 and 10 minutes before closing — each spoken once, and
 * after closing an informing overlay over a launcher that keeps working. The
 * whole feature rests on one product decision, so it is worth stating before the
 * code: **closing time does not end a session.** A game is never interrupted
 * (MVP §0.2) and the minutes on the seat were already paid for, so nothing here
 * pauses the clock, banks a remainder or logs anybody out. What closing does end
 * is *selling* — the shop and the bar — and that is enforced in `shop-view.tsx`
 * and `cart-drawer.tsx`, not here.
 *
 * That decision is what makes the rest of the file read the way it does:
 *
 *  1. **This is a watcher, like `time-warnings.tsx`, not a second clock.** The
 *     remainder comes from `useClubHours()`, which re-derives off the product's
 *     one interval (F6.3). Marks are *compared*, not counted, for the same reason
 *     C2.6 compares them: a throttled tab or a station that dozed can jump
 *     straight past 30 minutes, and a watcher that waited for `=== 30` would
 *     never speak. All marks a jump crossed are retired at once and only the most
 *     urgent of them is said out loud.
 *
 *  2. **The session's own clock outranks the club's.** A player with 12 minutes
 *     of paid time left is already being told to wrap up by C2.6, and that
 *     warning is the actionable one — it can be answered by extending, while
 *     "the club closes in 30 minutes" cannot. So when the session is inside its
 *     own warning window the closing marks are retired *silently*: not queued for
 *     later, because a toast that arrives after the last-call takeover would be
 *     the shell arguing with itself about which clock matters.
 *
 *  3. **The closed overlay is dismissable and offers no purchase.** A player
 *     mid-round has to be able to put it away, exactly like the C2.6 takeover —
 *     and, like it, the dismissal says what it does not change: the station is
 *     closed down by an admin in person. Members get "Save and exit" (the same
 *     hold-then-lock pair every other exit performs, so two ways out cannot
 *     produce two balances); a walk-in gets the counter and a call button
 *     instead, because a guest settles a tab rather than banking a remainder.
 *
 * Mounted in `GlobalOverlays`, so it survives every section change and can cover
 * the launcher rather than live inside it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { Overlay } from '@/components/ui/overlay'
import { useClubHours } from '@/hooks/use-club-hours'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useSfx } from '@/hooks/use-sfx'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { callStaff, toApiError } from '@/lib/mock/api'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { holdSeat } from '@/lib/seat'
import { sessionReport, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * The marks, in minutes, loudest last — same shape and same reason as the C2.6
 * table: "the most urgent mark crossed" is then simply the last match.
 *
 * Deliberately *not* `ClubSettings.warningThresholds`: those are the low-time
 * marks of a **session**, and an admin who shortens a session warning must not
 * thereby move the club's closing announcement. See the note on `openHours`.
 */
const MARKS = [
  { minutes: 60, urgent: false },
  { minutes: 30, urgent: false },
  { minutes: 10, urgent: true },
] as const

/**
 * Inside this many seconds of their own deadline, the player belongs to C2.6.
 *
 * It is the largest session mark (15 minutes), so the two features hand over at
 * exactly the point the other one starts speaking, with no window where both do
 * and none where neither does.
 */
const SESSION_WINS_BELOW_SECONDS = 15 * 60

/** Marks the remainder has fallen below that nobody has spoken for yet. */
function crossedMarks(minutesUntilClose: number, announced: number[]) {
  return MARKS.filter((mark) => minutesUntilClose <= mark.minutes && !announced.includes(mark.minutes))
}

export function ClubClosing() {
  const { t, tp } = useT()
  const { play } = useSfx()
  const club = useClubHours()

  const screen = useStore((s) => s.screen)
  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const timerRunning = useStore((s) => s.timerRunning)
  const toast = useStore((s) => s.toast)

  /**
   * Marks already retired, for this visit only.
   *
   * Local rather than in the store — unlike C2.6's `warnedMinutes`, nothing else
   * in the product needs to know which closing marks have been spoken, and the
   * component is mounted once above both screens, so its state already lives
   * exactly as long as a visit does. The reset below is what makes "once per
   * visit" true for the *next* player on this station.
   */
  const [announced, setAnnounced] = useState<number[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (screen !== 'lock') return
    setAnnounced([])
    setDismissed(false)
  }, [screen])

  // The overlay was put away by *this* player about *this* closing. When the club
  // opens again the dismissal has nothing left to refer to.
  useEffect(() => {
    if (club.open) setDismissed(false)
  }, [club.open])

  /**
   * Everything the announcement needs besides the minute itself, behind a ref.
   * Listing `t` or `toast` as dependencies would re-run the effect when the
   * language changed or the toast queue moved — which is precisely how a
   * once-per-visit warning becomes twice.
   */
  const latest = useRef({ t, tp, toast, play })
  latest.current = { t, tp, toast, play }

  const minutesUntilClose = club.minutesUntilClose

  useEffect(() => {
    // Nothing to announce before the schedule has been read, on a shut club (the
    // overlay speaks for that), or on a club that never closes — `null` is
    // "no closing in sight", never "closing now".
    if (!club.ready || !club.open || minutesUntilClose === null) return
    // A lock screen has no visit to warn, and a stopped clock is somebody else's
    // problem to explain (a pause overlay is already up).
    if (screen === 'lock' || !timerRunning) return

    const crossed = crossedMarks(minutesUntilClose, announced)
    if (crossed.length === 0) return

    setAnnounced((prev) => [...prev, ...crossed.map((m) => m.minutes)])

    // Decision 2: the player's own deadline is the actionable one. Retired above,
    // said nothing about here. Postpaid has no deadline of its own, so it never
    // takes this branch.
    if (billingMode !== 'postpaid' && seconds <= SESSION_WINS_BELOW_SECONDS) return

    const mark = crossed[crossed.length - 1]
    const { t: tr, tp: trp, toast: raise, play: cue } = latest.current

    raise('warning', mark.urgent ? tr('session.closingBodyUrgent') : tr('session.closingBody'), {
      title: trp('session.closingTitle', mark.minutes),
      // Held until dismissed at the last mark, for the same reason C2.6 holds
      // its urgent ones: the player it is for is looking at a game, and a
      // 6-second toast they never saw is a warning that did not happen.
      duration: mark.urgent ? 0 : 8000,
    })

    // The same cue the session marks use. A player learns one sound for "the
    // clock wants you", and it is on the list allowed through while a game holds
    // the machine (F8.4) — which is the entire point of warning by sound.
    cue('time-warning')
  }, [club.ready, club.open, minutesUntilClose, screen, timerRunning, billingMode, seconds, announced])

  const open = club.ready && !club.open && screen !== 'lock' && !dismissed

  return <ClubClosedOverlay open={open} onDismiss={() => setDismissed(true)} />
}

/**
 * "The club is closed" — an informing takeover, not an ending.
 *
 * `takeover` rather than `blocking`: the visit is still running and a checkout
 * the player is half-way through is still theirs to finish, so this must not
 * cover a dialog the way the end-of-visit screen does.
 */
function ClubClosedOverlay({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const { t, formatTime } = useT()
  const club = useClubHours()

  const guest = useStore((s) => s.guest)
  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const toast = useStore((s) => s.toast)
  const lockPc = useStore((s) => s.lockPc)

  const [busy, setBusy] = useState<'admin' | 'exit' | null>(null)
  const [called, setCalled] = useState(false)

  const panelRef = useDismissableLayer({ open, onClose: onDismiss, closeOnEscape: true })

  const call = useCallback(async () => {
    setBusy('admin')
    try {
      await callStaff({ category: 'other' })
      setCalled(true)
      toast('info', t('session.callAdminSent'))
    } catch (error) {
      toast('error', t(`errors.${toApiError(error).code}` as TKey))
    } finally {
      setBusy(null)
    }
  }, [t, toast])

  /**
   * Leaving on the player's own terms — the same pair as the lock confirmation
   * and the C2.6 takeover, in the same order: tell the club what it has not heard
   * about yet (read off the anchors, never a total computed here), then lock. Two
   * ways out of a visit must not produce two different balances.
   */
  const saveAndExit = useCallback(() => {
    setBusy('exit')
    void holdSeat(sessionReport(useStore.getState()))
    toast('info', t('session.lockedToast'))
    lockPc()
  }, [lockPc, t, toast])

  const isGuest = guest !== null

  return (
    <Overlay open={open} layer="takeover" blur="md" onDismiss={onDismiss}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-closed-title"
        aria-describedby="club-closed-body"
        className={cn(
          'panel-raised flex w-full max-w-md flex-col gap-5 overflow-y-auto rounded-lg border border-border p-6',
          OVERLAY_MAX_H,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
            <icons.night size={28} className="text-warning" aria-hidden />
          </span>
          <h2
            id="club-closed-title"
            className="font-display text-xl font-black uppercase text-balance text-text-high"
          >
            {t('session.closedTitle')}
          </h2>
          <p id="club-closed-body" className="text-pretty text-sm leading-relaxed text-text-medium">
            {t('session.closedBody')}
          </p>
        </div>

        {/* The proof of the sentence above, and the reason this overlay is not an
            ending: the same digits as the HUD, still moving. A postpaid tab counts
            *up* into an open bill, so it has no remainder to show and printing
            00:00 would read as a seat with nothing left on it. */}
        {billingMode !== 'postpaid' && (
          <div className="flex flex-col items-center gap-1">
            <span className="label-mono text-[9px] text-text-low">
              {t('session.closedClockLabel')}
            </span>
            <Countdown seconds={seconds} size="md" noPulse />
          </div>
        )}

        {/* When the doors open again — the one fact a closed club is asked for. */}
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-sunken px-4 py-3">
          <span className="label-mono text-[9px] text-text-low">
            {t('session.closedOpensLabel')}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-text-high">
            {club.opensAt ? formatTime(club.opensAt) : t('session.closedOpensUnknown')}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          {isGuest ? (
            // A walk-in banks nothing — the tab is settled by a human at the
            // counter, so the honest lines are that fact and a way to reach one.
            <>
              <p className="text-pretty text-center text-xs leading-relaxed text-text-medium">
                {t('session.closedGuestHint')}
              </p>
              <Button
                variant="secondary"
                size="md"
                voice="plain"
                loading={busy === 'admin'}
                disabled={called || busy !== null}
                onClick={() => void call()}
                iconLeft={<icons.support aria-hidden />}
              >
                {called ? t('session.callAdminAgain') : t('session.closedCallAdmin')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="md"
                loading={busy === 'exit'}
                disabled={busy !== null}
                onClick={saveAndExit}
                iconLeft={<icons.lock aria-hidden />}
              >
                {t('session.closedSaveExit')}
              </Button>
              <p className="text-pretty text-center text-xs leading-relaxed text-text-medium">
                {t('session.closedSaveExitHint')}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-border pt-4">
          <Button variant="ghost" size="sm" voice="plain" onClick={onDismiss}>
            {t('session.closedDismiss')}
          </Button>
          {/* The one thing dismissal must not be allowed to imply. */}
          <p className="text-center text-[11px] leading-relaxed text-text-low">
            {t('session.closedDismissHint')}
          </p>
        </div>
      </div>
    </Overlay>
  )
}
