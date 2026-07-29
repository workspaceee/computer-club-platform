'use client'

import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { CodeInput, type CodeInputHandle } from '@/components/ui/code-input'
import { DEV_SHORTCUTS } from '@/lib/dev-flags'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  unlockWithPin,
  type AuthResult,
  type PausedVisit,
} from '@/lib/mock/api'
import type { SessionSnapshot } from '@/lib/types/session'
import { formatDurationParts } from '@/lib/time'

/**
 * The remainder as the spec words it — "HH:MM", not "HH:MM:SS".
 *
 * Seconds are deliberately dropped: the clock is *stopped*, so a live-looking
 * `:07` on a paused visit would suggest time is still burning while the player
 * stands at the keypad. Hours stay even at zero, because the two-group shape is
 * what makes the number read as an amount of time rather than a wall clock.
 */
export function formatRemainder(seconds: number): string {
  const { hours, minutes } = formatDurationParts(seconds)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

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
}: SessionPausedProps) {
  const { t, tp, formatTime } = useT()

  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Server-owned budget, re-stated from every answer rather than counted here. */
  const [attemptsLeft, setAttemptsLeft] = useState(visit.attemptsLeft)
  const [locked, setLocked] = useState(visit.attemptsLeft <= 0)

  const cells = useRef<CodeInputHandle>(null)

  const submit = async (value: string = pin) => {
    if (locked || loading) return
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
        cells.current?.focus()
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic'
      // The visit itself is gone or already running: nothing a PIN can fix, so
      // the screen stops offering one instead of shaking at a dead end.
      if (code === 'sessionExpired' || code === 'conflict' || code === 'notFound') {
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
            {visit.holder}
          </span>
          <span className="label-mono text-[10px] text-text-low">
            {t('auth.seatTakenSince', { time: formatTime(new Date(visit.startedAt)) })}
          </span>
        </div>
        {/* The number the whole screen exists to state. `font-clock` and
            `tabular-nums`, like every billed clock in the shell. */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-clock text-2xl font-semibold leading-none tabular-nums text-text-high">
            {formatRemainder(visit.secondsLeft)}
          </span>
          <span className="label-mono text-[9px] text-text-low">
            {t('session.timeLeft')}
          </span>
        </div>
      </div>

      {locked ? (
        // The keypad is gone rather than disabled: a dead row of cells invites a
        // player to keep typing into a door that will not open again.
        <p className="text-sm leading-relaxed text-danger" role="alert">
          {t('auth.pinLocked')}
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

      {!locked && (
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
