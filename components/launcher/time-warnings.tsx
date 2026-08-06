'use client'

/**
 * Running out of time, announced (C2.6).
 *
 * Four marks — 15, 10, 5 and 1 minute — each spoken once, and at the last one a
 * takeover with the three ways a visit can end. This file is the *watcher*: it
 * owns no clock and no interval, it only reads the second the one interval in
 * `session-manager.tsx` derived (F6.3) and asks whether a mark has been passed
 * that the visit has not been told about yet.
 *
 * Four decisions shape it, and each is a bug that would otherwise be here.
 *
 *  1. **Marks are compared, not counted.** The clock is re-derived rather than
 *     decremented, so it can jump: a backgrounded tab is throttled to a tick a
 *     minute, and a sleeping kiosk runs no timers at all. Watching for
 *     `seconds === 300` would miss the 5-minute mark on any station that dozed
 *     through it. Asking "is the remainder now below a mark nobody has announced"
 *     cannot miss, however coarse the sampling.
 *
 *  2. **A jump announces only its most urgent mark.** A machine that wakes with
 *     four minutes left has crossed 15, 10 *and* 5 while asleep. Three stacked
 *     toasts would evict each other (`MAX_TOASTS` is 3) and the top one would say
 *     "15 minutes left" over a seat that has four. All crossed marks are retired
 *     in one write, and the smallest of them is the one that speaks.
 *
 *  3. **Prepaid only.** A walk-in's clock counts *up* into an open tab: there is
 *     no deadline to warn about, and telling a guest they have "5 minutes left"
 *     would be the shell inventing a limit the club never sold.
 *
 *  4. **The takeover is dismissable, the deadline is not.** A player one minute
 *     from the end may be mid-round, and a modal they cannot put away is a modal
 *     that costs them the match. "Keep playing" closes it and says, in the same
 *     breath, that the station still locks — the copy carries the honesty the
 *     interaction cannot.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { Overlay } from '@/components/ui/overlay'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useExtendTime } from '@/hooks/use-extend-time'
import { useSfx } from '@/hooks/use-sfx'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { callStaff, fetchSessionDetail, toApiError, type SessionDetail } from '@/lib/mock/api'
import { holdSeat } from '@/lib/seat'
import { unreportedSeconds, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * The marks, in minutes, loudest last.
 *
 * Sorted descending so "the most urgent mark crossed" is simply the last match —
 * see `crossedMarks`. `final: true` on the 1-minute mark is what promotes it from
 * a toast to the takeover, kept here rather than as an `if (minutes === 1)` in the
 * effect so the whole schedule of C2.6 reads in one place.
 */
const MARKS = [
  { minutes: 15, urgent: false },
  { minutes: 10, urgent: false },
  { minutes: 5, urgent: true },
  { minutes: 1, urgent: true, final: true },
] as const

/**
 * Which marks the remainder has fallen below and nobody has spoken for.
 *
 * Returned loudest-first purely so the caller can read `at(-1)` as "the most
 * urgent"; the whole list is what gets retired, because a mark left armed behind
 * a more urgent one would fire on the next tick and contradict it.
 */
function crossedMarks(seconds: number, warned: number[]) {
  return MARKS.filter((mark) => seconds <= mark.minutes * 60 && !warned.includes(mark.minutes))
}

export function TimeWarnings() {
  const { t, tp } = useT()
  const { play } = useSfx()

  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const timerRunning = useStore((s) => s.timerRunning)
  const sessionExpired = useStore((s) => s.sessionExpired)
  const warnedMinutes = useStore((s) => s.warnedMinutes)
  const noteTimeWarning = useStore((s) => s.noteTimeWarning)
  const toast = useStore((s) => s.toast)
  const setSessionPanelOpen = useStore((s) => s.setSessionPanelOpen)

  const [lastCallOpen, setLastCallOpen] = useState(false)

  /**
   * The effect fires on a *clock tick*, so everything it needs besides the second
   * itself is read through a ref. Listing `toast`, `t` and the rest as
   * dependencies would re-arm the whole watcher every time the language changed
   * or the toast queue moved — harmless in isolation, but it is exactly how a
   * "once per visit" announcement becomes twice.
   */
  const latest = useRef({ t, tp, toast, play, noteTimeWarning, setSessionPanelOpen })
  latest.current = { t, tp, toast, play, noteTimeWarning, setSessionPanelOpen }

  useEffect(() => {
    // A stopped clock crosses nothing, and a finished visit has its own screen
    // (`SessionManager`) — warning about a minute left on top of "session
    // expired" is the one combination that reads as a malfunction.
    if (!timerRunning || sessionExpired) return
    // Postpaid counts up. There is no deadline to be near.
    if (billingMode === 'postpaid') return

    const crossed = crossedMarks(seconds, warnedMinutes)
    if (crossed.length === 0) return

    // Loudest one wins: the list is descending, so the last element is the
    // smallest remainder and therefore the only honest thing to say.
    const mark = crossed[crossed.length - 1]
    const { t: tr, tp: trp, toast: raise, play: cue, noteTimeWarning: note } = latest.current

    note(crossed.map((m) => m.minutes))

    if ('final' in mark && mark.final) {
      // The toast goes up *as well as* the takeover. It is not decoration: the
      // takeover announces itself through `role="dialog"` and a focus move, and a
      // player who has dismissed a previous one still needs the fact in the
      // queue where every other status in the product lands.
      raise('warning', tr('session.warnFinal'), { duration: 0 })
      setLastCallOpen(true)
    } else {
      raise('warning', mark.urgent ? tr('session.warnBodyUrgent') : tr('session.warnBody'), {
        title: trp('session.warnTitle', mark.minutes),
        // Held until dismissed at five minutes: the player the warning is for is
        // the one looking at a game, not at the launcher, and a 4-second toast
        // they were never shown is a warning that did not happen.
        duration: mark.urgent ? 0 : 6000,
      })
    }

    // One cue per mark, and it is the same one every time — a player learns
    // "that sound means the clock" once. It is on the allowed list while a game
    // holds the machine (F8.4), which is the whole point of warning by sound.
    cue('time-warning')
  }, [seconds, warnedMinutes, timerRunning, sessionExpired, billingMode])

  // The takeover cannot outlive the thing it is about: expiry replaces it with the
  // end-of-visit screen, and a granted extension makes it a lie. Both arrive as a
  // change to state this component already reads, so neither needs an event.
  useEffect(() => {
    if (sessionExpired || seconds > 60) setLastCallOpen(false)
  }, [sessionExpired, seconds])

  return (
    <LastCall
      open={lastCallOpen}
      seconds={seconds}
      onClose={() => setLastCallOpen(false)}
      onOpenPanel={() => {
        setLastCallOpen(false)
        setSessionPanelOpen(true)
      }}
    />
  )
}

/**
 * The last minute (C2.6).
 *
 * Its own `takeover` rung above every dialog, because at 60 seconds nothing the
 * player had open matters more — but under `toast`, so the answer to pressing
 * "Extend" is readable on top of the card that offered it.
 */
function LastCall({
  open,
  seconds,
  onClose,
  onOpenPanel,
}: {
  open: boolean
  seconds: number
  onClose: () => void
  onOpenPanel: () => void
}) {
  const { t } = useT()

  const toast = useStore((s) => s.toast)
  const setView = useStore((s) => s.setView)
  const lockPc = useStore((s) => s.lockPc)

  const [busy, setBusy] = useState<'admin' | 'exit' | null>(null)
  const [called, setCalled] = useState(false)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  // Distinct from `detail === null`: the fetch failing also leaves no payload,
  // and "answered" is what the shop button waits on.
  const [answered, setAnswered] = useState(false)

  /**
   * The payload the extend is built from, asked once when the takeover opens.
   *
   * Imperative rather than `useApi`, unlike the card and the panel: this layer
   * appears at a *clock tick*, not from a click, and it must not adopt a cache
   * entry that has been sitting there since the visit began — the banked total is
   * the one number in it that a grant made a minute ago has already changed.
   *
   * A failure resolves as `answered` with no payload, which the hook reads as
   * zero banked minutes and the panel renders as the shop. In the last minute a
   * spinner that never resolves is the worst of the three outcomes.
   */
  useEffect(() => {
    if (!open) return
    let live = true
    setAnswered(false)
    fetchSessionDetail()
      .then((d) => {
        if (live) {
          setDetail(d)
          setAnswered(true)
        }
      })
      .catch(() => {
        if (live) setAnswered(true)
      })
    return () => {
      live = false
    }
  }, [open])

  /**
   * The same extend the home card and the session panel offer (C3.3).
   *
   * This takeover used to own a third copy of the sequence — its own steps table,
   * its own `extendSession` call, its own sales gate. Three copies of the act that
   * moves a deadline is how the last minute ends up offering a step the panel
   * would have refused, so it is one hook with three mounts.
   *
   * No `onGranted`: there is nothing here to refresh. A successful grant lifts the
   * remainder back over 60 s, and the effect in `TimeWarnings` closes this panel
   * on that change — re-reading a payload for a layer that is going away would
   * only put a request on the wire during the busiest second of the visit.
   *
   * `sales` comes back through it (C2.12): extending is a *server* mutation even
   * when it spends banked minutes rather than money, so it is gated with the rest
   * of the till. The other two buttons are deliberately **not** gated, and this is
   * the takeover where that matters most — a player one minute from the end, with
   * a dead link, needs to be able to call a human and to bank what is left.
   */
  const extendCtl = useExtendTime(detail)
  const sales = extendCtl.sales
  // The three actions share one inert state, so granting time cannot be raced by
  // "save and exit" — but each keeps its own spinner.
  const anyBusy = busy !== null || extendCtl.busy

  const panelRef = useDismissableLayer({
    open,
    onClose,
    // Escape closes it, like every other layer in the product: a takeover that
    // swallows the key the whole shell has taught is a takeover the player fights.
    closeOnEscape: true,
  })

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
   * "Save and exit" — the player ending the visit on their own terms.
   *
   * The same pair the lock confirmation performs, in the same order and for the
   * same reasons: the club is told how much of the visit it has not heard about
   * yet (read off the anchors, never a total computed here), and only then does
   * the station go to the lock screen with the remainder banked. Leaving through
   * this button and leaving through the avatar menu must not produce two
   * different balances.
   */
  const saveAndExit = useCallback(() => {
    setBusy('exit')
    void holdSeat(unreportedSeconds(useStore.getState()))
    toast('info', t('session.lockedToast'))
    lockPc()
  }, [lockPc, t, toast])

  const shop = useCallback(() => {
    onClose()
    setView('shop')
  }, [onClose, setView])

  return (
    <Overlay open={open} layer="takeover" blur="md" onDismiss={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="last-call-title"
        aria-describedby="last-call-body"
        className={cn(
          'panel-raised flex w-full max-w-md flex-col gap-5 overflow-y-auto rounded-lg border border-danger/40 p-6',
          OVERLAY_MAX_H,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15">
            <icons.timer size={28} className="text-danger" aria-hidden />
          </span>
          <h2
            id="last-call-title"
            className="font-display text-xl font-black uppercase text-balance text-text-high"
          >
            {t('session.lastCallTitle')}
          </h2>
          {/* The live digits, from the one clock. `noPulse`: the panel is already
              the alarm, and the state pulse on top of a takeover is §4.2's second
              runner for one fact. */}
          <div className="flex flex-col items-center gap-1">
            <span className="label-mono text-[9px] text-text-low">{t('session.lastCallClock')}</span>
            <Countdown seconds={seconds} size="md" noPulse />
          </div>
          <p
            id="last-call-body"
            className="text-pretty text-sm leading-relaxed text-text-medium"
          >
            {t('session.lastCallBody')}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {extendCtl.steps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap justify-center gap-2">
                {extendCtl.steps.map((minutes) => (
                  <Button
                    key={minutes}
                    variant="primary"
                    size="md"
                    loading={extendCtl.extending === minutes}
                    disabled={anyBusy || !sales.canSpend}
                    onClick={() => void extendCtl.extend(minutes)}
                    iconLeft={<icons.add aria-hidden />}
                  >
                    {`${t('session.lastCallExtend')} +${minutes}`}
                  </Button>
                ))}
              </div>
              {/* In the last minute a dead button with no caption is the cruellest
                  version of this panel: the player reads it as "my time is gone".
                  Both pauses are captioned for that reason — `reason` is exclusive,
                  so exactly one line appears — and each says the state lifts by
                  itself, while the two buttons below stay live. */}
              {sales.reason === 'closed' && (
                <p
                  role="status"
                  className="text-pretty text-center text-xs leading-relaxed text-warning"
                >
                  {t('session.extendClosedHint')}
                </p>
              )}
              {sales.reason === 'offline' && (
                <p
                  role="status"
                  className="text-pretty text-center text-xs leading-relaxed text-warning"
                >
                  {`${t('realtime.salesTitle')} — ${t('realtime.salesHint')}`}
                </p>
              )}
            </div>
          ) : (
            // Nothing banked, so the honest primary action is the shop. Rendered
            // only once the fetch has answered — an "Open shop" flashed at a
            // player who *does* have pass minutes sends them to buy what they own.
            answered && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-pretty text-center text-xs leading-relaxed text-text-medium">
                  {t('session.lastCallExtendHint')}
                </p>
                <Button
                  variant="primary"
                  size="md"
                  disabled={anyBusy}
                  onClick={shop}
                  iconLeft={<icons.shop aria-hidden />}
                >
                  {t('session.lastCallShop')}
                </Button>
              </div>
            )
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              size="md"
              voice="plain"
              loading={busy === 'admin'}
              disabled={called || anyBusy}
              onClick={() => void call()}
              iconLeft={<icons.support aria-hidden />}
            >
              {called ? t('session.callAdminAgain') : t('session.lastCallAdmin')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              voice="plain"
              loading={busy === 'exit'}
              disabled={anyBusy}
              onClick={saveAndExit}
              iconLeft={<icons.lock aria-hidden />}
            >
              {t('session.lastCallSaveExit')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-border pt-4">
          <Button variant="ghost" size="sm" voice="plain" onClick={onOpenPanel}>
            {t('session.openMine')}
          </Button>
          <Button variant="ghost" size="sm" voice="plain" onClick={onClose}>
            {t('session.lastCallDismiss')}
          </Button>
          {/* The one thing dismissal must not be allowed to imply. */}
          <p className="text-center text-[11px] leading-relaxed text-text-low">
            {t('session.lastCallDismissHint')}
          </p>
        </div>
      </div>
    </Overlay>
  )
}
