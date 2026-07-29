'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MockQr } from '@/components/mock-qr'
import { useRealtimeStatus } from '@/components/realtime/realtime-provider'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { ApiError, confirmQrChallenge, requestQrChallenge, type QrChallenge } from '@/lib/mock/api'
// MOCK ONLY — the companion app the prototype does not have. Goes away with
// `lib/mock/*` and `lib/realtime/admin-sim` in Stage 4, together with the demo
// plate at the bottom of this dialog; nothing above it imports this.
import { confirmQrLogin } from '@/lib/realtime/admin-sim'
import { formatCountdown } from '@/lib/time'
import type { UserProfile } from '@/lib/types/user'

/**
 * Where the handshake is. `confirmed` carries the nickname because the frame
 * brings it and the exchange takes a beat: naming the person who just approved
 * the login is the difference between "something is happening" and "you are
 * being let in".
 */
type Phase =
  | { kind: 'loading' }
  | { kind: 'live' }
  | { kind: 'expired' }
  | { kind: 'confirmed'; nickname: string }
  | { kind: 'failed' }

interface QrLoginProps {
  open: boolean
  /** Back out of the handshake. */
  onCancel: () => void
  /** The flow ends signed in — the exchanged ticket returns a session. */
  onSuccess: (profile: UserProfile) => void
  /** Localized toast, so the screen keeps owning the toast voice. */
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
}

/**
 * Sign in by phone — the real handshake (C1.5).
 *
 * The old dialog was theatre: it asked for a challenge, slept 2.5 s and then
 * called an endpoint that signed in the demo account no matter what. Nothing on
 * screen belonged to the station, nothing could expire, and no phone was
 * involved anywhere. What replaced it is the shape the real flow has:
 *
 *  1. **The station shows a code it owns.** `requestQrChallenge` binds the
 *     handshake to this seat and returns a deadline; the square *and* six
 *     typeable characters are both on screen, because a camera that will not
 *     focus is not a reason to be locked out of your own account.
 *  2. **The answer arrives out of band.** Confirmation is not polled — it is
 *     pushed as `login.qr.confirmed`, addressed to the seat, since a station
 *     with nobody signed in has no session to poll with. This dialog is the one
 *     place in the client that subscribes to the bus *before* there is a user.
 *  3. **The frame is a claim, not a credential.** It carries a single-use
 *     `grantToken` which the station spends at `confirmQrChallenge`; the server
 *     decides. So a replayed frame, a frame for a code that has since been
 *     refreshed, or one meant for another seat logs nobody in — the checks below
 *     drop the first two, `scope.machineId` drops the third.
 *
 * The deadline is real and visible: a code on a public monitor that lives forever
 * is a spare key on the desk. When it dies the dialog says so and offers a new
 * one instead of spinning at a player who will otherwise stand there waiting.
 */
export function QrLogin({ open, onCancel, onSuccess, onToast }: QrLoginProps) {
  const { t } = useT()
  // A confirmation that cannot arrive is worth saying out loud: the phone talks
  // to the club, and while the station's own link is down there is nothing to
  // wait for. The global banner explains the outage; this line explains what it
  // costs *here*.
  const { offline } = useRealtimeStatus()

  const [challenge, setChallenge] = useState<QrChallenge | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [secondsLeft, setSecondsLeft] = useState(0)

  /**
   * Cancelling has to outrank every promise in flight, or a guest who backs out
   * and starts typing their password gets signed in as whoever the phone
   * confirmed a second later. Bumping the generation invalidates the previous
   * run: an answer from an older one is dropped instead of applied.
   */
  const run = useRef(0)

  const issue = useCallback(async () => {
    const mine = ++run.current
    setPhase({ kind: 'loading' })
    setChallenge(null)
    try {
      const next = await requestQrChallenge()
      if (run.current !== mine) return
      setChallenge(next)
      // The deadline is counted from the moment the answer landed, not from a
      // server timestamp: a club PC's clock is not to be trusted (F3.7), which
      // is why the endpoint hands over a duration.
      setSecondsLeft(next.expiresInSec)
      setPhase({ kind: 'live' })
    } catch (err) {
      if (run.current !== mine) return
      setPhase({ kind: 'failed' })
      onToast('error', t(errorKey(err)))
    }
  }, [onToast, t])

  // Open → a fresh handshake. Closing invalidates whatever was in flight, so a
  // reopen never inherits the previous code or its countdown.
  useEffect(() => {
    if (!open) {
      run.current += 1
      setChallenge(null)
      setPhase({ kind: 'loading' })
      setSecondsLeft(0)
      return
    }
    void issue()
  }, [open, issue])

  // The visible deadline. Stops at the `live` phase on purpose: once a phone has
  // confirmed, the code has done its job and a ticking number next to "unlocking"
  // would only look like a threat.
  useEffect(() => {
    if (phase.kind !== 'live') return
    if (secondsLeft <= 0) {
      setPhase({ kind: 'expired' })
      return
    }
    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1_000)
    return () => clearTimeout(timer)
  }, [phase.kind, secondsLeft])

  /**
   * The confirmation. Subscribed only while the dialog is open, and every frame
   * is matched against the code currently on screen: the bus is shared, frames
   * can be replayed on reconnect, and "a QR confirmation arrived" is not the same
   * statement as "this square was approved".
   */
  useRealtimeEvent(
    'login.qr.confirmed',
    (event) => {
      const { challengeId, grantToken, nickname } = event.payload
      if (!challenge || challengeId !== challenge.challengeId) return
      // A replayed frame must not start a second exchange.
      if (phase.kind === 'confirmed') return

      const mine = ++run.current
      setPhase({ kind: 'confirmed', nickname })

      void confirmQrChallenge(challengeId, grantToken)
        .then(({ profile }) => {
          if (run.current !== mine) return
          onToast('success', t('auth.qrVerified'))
          onSuccess(profile)
        })
        .catch((err) => {
          if (run.current !== mine) return
          // The ticket was refused or the code died between the frame and the
          // exchange. Back to a code the player can actually use.
          setPhase({ kind: 'expired' })
          onToast('error', t(errorKey(err)))
        })
    },
    open,
  )

  const dead = phase.kind === 'expired' || phase.kind === 'failed'

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      eyebrow="QR"
      title={t('auth.qrLogin')}
      footer={
        <div className="flex flex-col gap-2">
          {/* The repair, and only when there is something to repair: a live code
              needs no button, and an always-present "new code" invites a player
              to replace a square their phone is already reading. */}
          {dead && (
            <Button
              size="md"
              block
              cut
              onClick={() => void issue()}
              iconLeft={<icons.retry size={16} />}
            >
              {t('auth.qrNewCode')}
            </Button>
          )}
          <Button variant="secondary" size="md" block onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {/* The square dims rather than disappears when the code dies: the layout
            has to hold still, or the dialog jumps under the player's hand at the
            exact moment they are reaching for the phone. */}
        <div
          className={`relative transition-opacity duration-240 ${dead ? 'opacity-25' : 'opacity-100'}`}
        >
          <MockQr payload={challenge?.payload ?? ''} />
        </div>

        <p className="font-display text-lg font-bold text-text-high text-balance">
          {t('auth.scanWithApp')}
        </p>
        <p className="text-pretty text-center text-xs leading-relaxed text-text-medium">
          {t('auth.qrSub')}
        </p>

        {/* The typeable form of the same handshake. `font-clock` + wide tracking
            because this is read off a monitor from a standing distance and then
            retyped — the one string on this screen that has to survive that. */}
        <div className="well flex w-full flex-col items-center gap-1.5 rounded-lg border border-border p-4">
          <span className="label-mono text-[10px] text-text-low">{t('auth.qrStationCode')}</span>
          <span
            className={`font-clock text-2xl font-semibold tracking-[0.3em] tabular-nums ${
              dead ? 'text-text-low' : 'text-text-high'
            }`}
          >
            {challenge?.stationCode ?? '•••-•••'}
          </span>
        </div>

        {/* One status line, and it always says which of the four things is true. */}
        <div className="min-h-10 flex flex-col items-center gap-1.5">
          {phase.kind === 'loading' && (
            <StatusLine spinning>{t('common.loading')}</StatusLine>
          )}

          {phase.kind === 'live' && (
            <>
              <StatusLine spinning>{t('auth.waitingConfirmation')}</StatusLine>
              <span className="label-mono text-[10px] text-text-low">
                {t('auth.codeExpiresIn', { time: formatCountdown(secondsLeft) })}
              </span>
            </>
          )}

          {phase.kind === 'confirmed' && (
            <StatusLine tone="success" icon={<icons.secure size={14} />}>
              {t('auth.qrConfirmedBy', { name: phase.nickname })}
            </StatusLine>
          )}

          {dead && (
            <StatusLine tone="warning" icon={<icons.info size={14} />}>
              {phase.kind === 'failed' ? t('errors.generic') : t('auth.qrExpired')}
            </StatusLine>
          )}

          {/* Independent of the phase: an outage does not expire the code, it
              only means nothing can answer it yet. */}
          {offline && phase.kind !== 'confirmed' && (
            <span className="text-pretty text-center text-[11px] leading-relaxed text-warning">
              {t('auth.qrOffline')}
            </span>
          )}
        </div>

        {/* MOCK ONLY — there is no companion app, so the way to answer the
            handshake is named instead of hidden. Same "announced, not broken"
            plate the emailed codes use (§3.3): unmistakably a prototype
            affordance, not part of the product.

            The button plays the *phone*, and that is all it plays. It calls the
            phone's endpoint through `admin-sim` — approve server-side, then
            publish `login.qr.confirmed` — and then gets out of the way: the
            frame travels the real bus, this dialog receives it through its
            normal subscription, matches it against the code on screen and
            spends the ticket at `confirmQrChallenge`. Every guard stays live, so
            this is the missing actor rather than a shortcut past the handshake.

            It lives *here* and not on `/dev/bus` because the two have to be on
            one screen: the bus is in-memory per tab and the console is another
            route, so navigating there would unmount the dialog and take the live
            challenge with it. Same reason the OTP flows print their code in the
            dialog instead of somewhere a player would have to leave for. */}
        <div className="well flex w-full flex-col gap-2 rounded-lg border border-warning/30 p-3">
          <span className="label-mono flex items-center gap-2 text-[9px] text-warning">
            <icons.info size={11} />
            {t('auth.qrDemoTitle')}
          </span>
          <span className="text-pretty text-[11px] leading-relaxed text-text-low">
            {t('auth.qrDemoNote')}
          </span>
          {/* Only while a code is actually live: an expired or failed handshake
              has nothing to approve, and a button that answers a dead code would
              make the countdown above it a decoration. */}
          <Button
            size="sm"
            variant="secondary"
            block
            disabled={phase.kind !== 'live'}
            onClick={() => {
              // `null` means the code died between the render and the click.
              // Say so instead of leaving the player pressing a button that
              // silently does nothing.
              if (!confirmQrLogin()) onToast('error', t('auth.qrExpired'))
            }}
            iconLeft={<icons.qr size={14} />}
          >
            {t('auth.qrDemoConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** One row of status: optional spinner or glyph, one sentence, one tone. */
function StatusLine({
  children,
  spinning = false,
  icon,
  tone = 'medium',
}: {
  children: React.ReactNode
  spinning?: boolean
  icon?: React.ReactNode
  tone?: 'medium' | 'success' | 'warning'
}) {
  const color =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-text-medium'
  return (
    <p className={`flex items-center gap-2 text-center text-sm ${color}`}>
      {spinning ? (
        <icons.pending size={14} className="animate-spin text-primary" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </p>
  )
}

/** Turns any thrown value into the dictionary key for its code (F2.2). */
function errorKey(err: unknown): TKey {
  return `errors.${err instanceof ApiError ? err.code : 'generic'}` as TKey
}
