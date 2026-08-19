'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { CodeInput, type CodeInputHandle } from '@/components/ui/code-input'
import { DEV_SHORTCUTS } from '@/lib/dev-flags'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  fetchPausedVisit,
  unlockWithPin,
  type AuthResult,
  type PausedVisit,
} from '@/lib/mock/api'
import type { SessionSnapshot } from '@/lib/types/session'
import { formatDurationParts } from '@/lib/time'

/**
 * The remainder as "HH:MM" — the spec's shape, for the surfaces that want it.
 *
 * Kept exported and unchanged: `active-elsewhere.tsx` prints another client's
 * hold with it, where the number really is a static amount and not a clock.
 */
export function formatRemainder(seconds: number): string {
  const { hours, minutes } = formatDurationParts(seconds)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * The remainder as a running clock — "HH:MM:SS".
 *
 * The card used to print `formatRemainder`, and on a station that a player sits
 * in front of for a minute that reads as a dead screen: two digits that never
 * move, next to a keypad, with no way to tell a live surface from a frozen one.
 * Seconds are what make it legible as a *clock*, and they are also the cheapest
 * possible sign of life — nothing else on this screen moves.
 */
function formatRemainderLive(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

/**
 * The remainder, re-derived from the club's last answer once a second.
 *
 * **Derived, never decremented** — the same rule the one clock of the launcher
 * follows (`components/session-manager.tsx`, F6.3). The anchor is when the
 * server's number arrived; the reading is that number minus the wall-clock time
 * since. A station that slept, or a tab the browser throttled to one tick a
 * minute, comes back with the correct value on its very first frame instead of
 * however many ticks it managed to run.
 *
 * The poll every `REFRESH_MS` re-anchors it, so the display can drift by at most
 * ten seconds from what the club believes before it is corrected.
 */
function useLiveRemainder(secondsLeft: number): number {
  // `performance.now()` is monotonic: `Date.now()` can be stepped by an NTP
  // correction on a station that has been up all evening, and a clock that jumps
  // backwards would print a *growing* remainder on a paused visit.
  const anchor = useRef({ at: 0, seconds: secondsLeft })
  const [, setFrame] = useState(0)

  // A fresh server answer replaces the anchor rather than adjusting the reading.
  if (anchor.current.seconds !== secondsLeft) {
    anchor.current = { at: performance.now(), seconds: secondsLeft }
  }

  useEffect(() => {
    anchor.current = { at: performance.now(), seconds: secondsLeft }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setInterval(() => setFrame((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [secondsLeft])

  const elapsed = Math.floor((performance.now() - anchor.current.at) / 1000)
  return Math.max(0, anchor.current.seconds - elapsed)
}

/**
 * How often the card re-reads the visit holding this seat.
 *
 * The remainder is still the *club's* number and still not animated down — the
 * clock is stopped, so nothing here counts. What this fixes is the number going
 * stale: a visit can sit on this screen for minutes while an admin tops the
 * account up, closes the overrun, or the club re-prices the seat, and a card that
 * read `secondsLeft` once at mount would keep promising an amount that no longer
 * exists. Same 10 s beat the seat-taken panel polls on, and for the same reason:
 * nothing is addressed to this client while it is nobody's session.
 */
const REFRESH_MS = 10_000

interface SessionPausedProps {
  /** The visit holding this seat, as read by `fetchPausedVisit`. */
  visit: PausedVisit
  /** PIN accepted: the account *and* the resumed visit, in one answer. */
  onSuccess: (session: AuthResult, snapshot: SessionSnapshot) => void
  /**
   * The visit is not resumable any more — ended, or already picked up by an
   * admin's key or a second client. The screen goes back to being a lock screen.
   */
  onGone: (message: TKey) => void
  /** The player would rather prove who they are the long way. */
  onUsePassword: () => void
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
  onReject: () => void
  /**
   * The keypad is spent (or was already, on a re-read).
   *
   * Reported up rather than mirrored in the parent, because the budget has one
   * owner — the club's answer, held here — and the *header* is the one thing
   * outside this card that changes with it: a subline that still says "enter your
   * PIN" over a card with no keypad is the screen contradicting itself.
   */
  onLockedChange?: (locked: boolean) => void
}

/**
 * "Session on pause — HH:MM left" (C1.10).
 *
 * The screen a member meets after "Lock PC": not a login, because nobody signed
 * out — the visit is still on this machine with its clock stopped, and the only
 * question is whether the person at the keyboard is the one who left it. So the
 * card states the club's two facts (whose visit, how much time is on it) and
 * asks for four digits instead of an email and a password. That is the whole
 * point of the feature: a player who stepped out for a smoke is back in the
 * launcher in one gesture.
 *
 * Three rules shape it:
 *
 *  - **The remainder is the server's number.** It arrives with the visit
 *    (`secondsLeft`) and is *not* animated down: the clock is paused, and a
 *    ticking countdown on a stopped visit would be the client inventing billing.
 *  - **The budget is stated out loud.** Five tries, counted by the club; the
 *    panel prints what is left after a miss, because a keypad that just shakes
 *    teaches nothing and a locked one that never warned looks broken.
 *  - **The password door stays open.** Spending the budget closes *this* door,
 *    never the account — the visit's owner still knows their password, and
 *    freezing the account because a stranger poked at a kiosk would punish the
 *    victim.
 */
export function SessionPaused({
  visit,
  onSuccess,
  onGone,
  onUsePassword,
  onToast,
  onReject,
  onLockedChange,
}: SessionPausedProps) {
  const { t, tp, formatTime } = useT()

  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Server-owned budget, re-stated from every answer rather than counted here. */
  const [attemptsLeft, setAttemptsLeft] = useState(visit.attemptsLeft)
  const [locked, setLocked] = useState(visit.attemptsLeft <= 0)

  /**
   * The visit as last read, not as first handed down.
   *
   * The prop is the mount-time answer; this is the one the card prints, so a
   * re-read can correct the remainder without the parent re-mounting the flow (and
   * without resetting a half-typed PIN).
   */
  const [live, setLive] = useState(visit)
  useEffect(() => setLive(visit), [visit])

  /**
   * The remainder as a running reading, re-derived from the club's last answer.
   *
   * Called here, at the top of the component, and not inside the JSX branch that
   * prints it: the hook owns an interval and a ref, so a conditional call would be
   * an order violation the first time the card flipped between its keypad and its
   * "door closed" state.
   */
  const liveSeconds = useLiveRemainder(live.secondsLeft)

  useEffect(() => {
    let alive = true
    const id = setInterval(() => {
      void fetchPausedVisit()
        .then((fresh) => {
          // A different visit — or none — is the parent's business to act on
          // (it owns `onGone`); this poll only ever refreshes the one it is
          // showing, so a seat taken over mid-wait cannot repaint the card with
          // a stranger's clock.
          if (!alive || !fresh || fresh.sessionId !== visit.sessionId) return
          setLive(fresh)
        })
        .catch(() => {
          // A failed read is not new information: keep the last number the club
          // gave us rather than blanking the one fact this screen exists to state.
        })
    }, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [visit.sessionId])

  /**
   * The visit is parked with nothing left on it.
   *
   * A member seat is prepaid, and `resumeSessionRow` refuses to restart a prepaid
   * clock at zero no matter who proves they own it — so a keypad here is a door
   * with no room behind it. The `submit` handler already catches that verdict
   * (`insufficientFunds` → `onGone`), but only *after* the player has typed four
   * digits and spent an attempt on an answer the digits never influenced. This is
   * the same fact known one render earlier, at mount, from the number the card is
   * already printing.
   *
   * It is deliberately not `onGone` at mount either: the visit is real, its owner
   * is standing here, and "00:00 is still on this station" plus the password door
   * is the honest thing to say. Silently falling back to a login form would make
   * the club's refusal look like the screen forgetting the visit existed.
   */
  // Read off the live figure, not the raw payload: a visit parked at 00:00:12 runs
  // out while the player is standing here, and the door has to close on the same
  // instant the card prints zero — otherwise the keypad stays up over a clock that
  // reads 00:00:00 and the club's refusal arrives only after four typed digits.
  const spent = liveSeconds <= 0
  /**
   * The keypad has no reason to exist: budget spent, or clock spent. One name for
   * the two, because every branch below cares about the *door*, not about which
   * of the two closed it — only the sentence differs.
   */
  const closed = locked || spent

  const cells = useRef<CodeInputHandle>(null)

  /**
   * Put the caret back on the row the moment it can hold one again.
   *
   * Refocusing inside the miss branch read correctly and did nothing: the cells
   * are still `disabled` at that point — `setLoading(false)` lands in `finally`
   * and the DOM only catches up on the next render — and a disabled input cannot
   * take focus, so it fell through to `<body>` and the next four digits went
   * nowhere. On a station whose keyboard is the only input device that is not a
   * cosmetic slip: the player retypes the PIN, nothing happens, and the screen
   * looks broken. The effect runs *after* the render that re-enables the row,
   * which is the first instant focus sticks.
   */
  useEffect(() => {
    if (loading || closed) return
    cells.current?.focus()
  }, [loading, closed])

  /**
   * Tell the screen above, from the *rendered* state rather than from the
   * handler — a visit read back with an already-spent budget mounts locked and
   * never passes through the miss branch, and its header has the same problem.
   */
  useEffect(() => {
    onLockedChange?.(closed)
  }, [closed, onLockedChange])

  const submit = async (value: string = pin) => {
    if (closed || loading) return
    if (value.length !== visit.pinLength) {
      setError(t('auth.pinIncomplete', { n: visit.pinLength }))
      onReject()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await unlockWithPin({ sessionId: visit.sessionId, pin: value })
      if (result.ok) {
        onToast('success', t('auth.welcomeBackToast', { name: visit.holder }))
        onSuccess(result.session, result.snapshot)
        return
      }
      // A miss is a verdict, not a crash: the card stays, the row clears, and the
      // caret goes back where the next attempt is typed.
      setPin('')
      onReject()
      if (result.reason === 'locked') {
        setLocked(true)
        setAttemptsLeft(0)
        setError(t('auth.pinLocked'))
        onToast('error', t('auth.pinLocked'))
      } else {
        setAttemptsLeft(result.attemptsLeft)
        setError(tp('auth.pinWrong', result.attemptsLeft))
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic'
      // The visit itself is gone, already running, or out of time: nothing a PIN
      // can fix, so the screen stops offering one instead of shaking at a dead
      // end. `insufficientFunds` is the last of those and the least obvious — a
      // visit can be parked here with 00:00 on it (paused at the buzzer, or read
      // back after the club counted the overrun), and `resumeSessionRow` refuses
      // to restart a spent prepaid clock no matter who proves they own it. Right
      // PIN, right player, door that cannot open: keeping the keypad up would
      // spend the budget on a verdict the digits never influenced.
      if (
        code === 'sessionExpired' ||
        code === 'conflict' ||
        code === 'notFound' ||
        code === 'insufficientFunds'
      ) {
        onGone(`errors.${code}` as TKey)
        return
      }
      setPin('')
      onReject()
      setError(t(`errors.${code}` as TKey))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="session-paused"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
      role="status"
    >
      {/* A well (§3.3): whose visit this is and what is left on it are facts
          stated *inside* the card, the same shape the seat-taken panel uses. */}
      <div className="well flex items-center gap-3 rounded-lg border border-border p-4">
        <IconTile icon={icons.timer} variant="warning" size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Data, never translated: the nickname the club knows. */}
          <span className="truncate font-display text-base font-semibold uppercase tracking-tight text-text-high">
            {live.holder}
          </span>
          <span className="label-mono text-[10px] text-text-low">
            {t('auth.seatTakenSince', { time: formatTime(new Date(live.startedAt)) })}
          </span>
        </div>
        {/* The number the whole screen exists to state. `font-clock` and
            `tabular-nums`, like every billed clock in the shell. */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-clock text-2xl font-semibold leading-none tabular-nums text-text-high">
            {formatRemainderLive(liveSeconds)}
          </span>
          <span className="label-mono text-[9px] text-text-low">
            {t('session.timeLeft')}
          </span>
        </div>
      </div>

      {closed ? (
        // The keypad is gone rather than disabled: a dead row of cells invites a
        // player to keep typing into a door that will not open again. Which
        // sentence it is matters — "too many wrong PINs" tells a player to reach
        // for their password, "no money on the balance" tells them to reach for
        // the counter, and printing the first one over a spent clock would send
        // them to a password that cannot restart it either.
        <p className="text-sm leading-relaxed text-danger" role="alert">
          {spent ? t('errors.insufficientFunds') : t('auth.pinLocked')}
        </p>
      ) : (
        <CodeInput
          ref={cells}
          value={pin}
          onValueChange={(v) => {
            setPin(v)
            setError(null)
          }}
          length={visit.pinLength}
          onComplete={(v) => void submit(v)}
          label={t('auth.pin')}
          error={error ?? undefined}
          hint={tp('auth.pinAttemptsLeft', attemptsLeft)}
          disabled={loading}
          autoFocus
          // A shared station in a room full of people: the digits are covered.
          mask
        />
      )}

      {!closed && (
        /* The screen's one bevelled CTA (§4) — the action that commits. */
        <Button
          size="lg"
          block
          cut
          loading={loading}
          onClick={() => void submit()}
          iconLeft={<icons.lock size={18} />}
        >
          {t('auth.pinUnlock')}
        </Button>
      )}

      {/* Always available, and the only way out once the budget is spent: the PIN
          is a shortcut into a visit, not the credential that owns the account. */}
      <Button
        variant="ghost"
        size="sm"
        voice="plain"
        onClick={onUsePassword}
        className="self-center text-text-low hover:bg-transparent hover:text-text-high"
      >
        {t('auth.pinUsePassword')}
      </Button>

      {/*
        Prototype plate, fenced off like the demo shortcuts on the form (C1.9):
        the seeded member PIN is printed because nothing in this prototype has a
        phone or a memory to hold it, and a reviewer who cannot get past this
        screen cannot review it. `DEV_SHORTCUTS` is build-time, so production
        drops the branch rather than hiding it — and the copy stays out of the
        dictionaries because it never reaches a player.
      */}
      {DEV_SHORTCUTS && visit.devPin && (
        <div className="flex items-center gap-1.5 border-t border-dashed border-border pt-3">
          <icons.warning size={11} className="text-warning" />
          <span className="label-mono text-[9px] text-text-low">
            dev only · PIN {visit.devPin}
          </span>
        </div>
      )}
    </motion.div>
  )
}
