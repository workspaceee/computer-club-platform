'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { CodeInput, type CodeInputHandle } from '@/components/ui/code-input'
import { Field } from '@/components/ui/field'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  completePasswordReset,
  requestPasswordReset,
  resendPasswordResetCode,
  verifyPasswordResetCode,
  type PasswordResetChallenge,
} from '@/lib/mock/api'
import { formatCountdown } from '@/lib/time'
import type { UserProfile } from '@/lib/types/user'

/**
 * Where the player is in the recovery flow (C1.3).
 *
 * Three steps, not one form, because each one asks for a different *kind* of
 * proof and can fail on its own: the address, the code from the inbox, the new
 * password. Merging them would mean a rejected code throws away a typed
 * password, and a station is exactly where that happens — the player is typing
 * on a shared keyboard with someone waiting behind them.
 */
export type RecoveryStep = 'email' | 'code' | 'password'

/**
 * What the *card header* needs to know about a live recovery — the step and,
 * once a code is out, who it was sent to.
 *
 * The masked address travels up instead of the header copy travelling down: the
 * screen renders exactly one headline in one place (its `AnimatePresence`
 * block), and this flow only supplies the values that go into it. The full
 * address never leaves the endpoint — `maskedEmail` is already `p•••@imba.club`.
 */
export interface RecoveryState {
  step: RecoveryStep
  maskedEmail?: string
  codeLength?: number
}

/** Headline + subline keys per step, consumed by the card header of the screen. */
export const RECOVERY_COPY: Record<RecoveryStep, { lead: TKey; accent: TKey; sub: TKey }> = {
  email: { lead: 'auth.recover', accent: 'auth.recoverHi', sub: 'auth.recoverSub' },
  code: { lead: 'auth.codeStep', accent: 'auth.codeStepHi', sub: 'auth.codeStepSub' },
  password: {
    lead: 'auth.newPasswordStep',
    accent: 'auth.newPasswordStepHi',
    sub: 'auth.newPasswordSub',
  },
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const MIN_PASSWORD = 6

interface PasswordRecoveryProps {
  /** Prefilled from the sign-in field when the player typed an address there. */
  initialEmail?: string
  step: RecoveryStep
  onStateChange: (state: RecoveryState) => void
  /** Back out to the sign-in form. */
  onCancel: () => void
  /** The flow ends signed in — see `completePasswordReset`. */
  onSuccess: (profile: UserProfile, name: string) => void
  /** Localized toast, so the screen keeps owning the toast voice. */
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
  /** Shake the card, like a failed sign-in. */
  onReject: () => void
}

/**
 * Password recovery by email OTP (C1.3).
 *
 * Lives in the body of the access-terminal card rather than in a `Modal`: a
 * dialog implies "small detour you will come back from", and this flow ends in a
 * *sign-in*, not back at the form behind the scrim. So it takes the card over —
 * the mode switcher hides, the headline follows the step, and one back arrow
 * leads home. The header copy is supplied by `RECOVERY_COPY` so the card keeps
 * rendering exactly one headline in one place.
 *
 * The two facts that shape the code step:
 *
 *  - **The cooldown is a fact about the server, not a disabled button.** The
 *    countdown here is seeded from `resendAfterSec` in the response and the
 *    endpoint answers `rateLimited` regardless, so a held-down Enter on a kiosk
 *    keyboard cannot outrun the UI.
 *  - **Expired ≠ wrong.** A dead code offers a resend (`timeout`), a mistyped
 *    one clears the cells and keeps the timer running (`invalidCode`). Same red
 *    frame, two different repairs.
 */
export function PasswordRecovery({
  initialEmail = '',
  step,
  onStateChange,
  onCancel,
  onSuccess,
  onToast,
  onReject,
}: PasswordRecoveryProps) {
  const { t } = useT()

  const [email, setEmail] = useState(initialEmail)
  const [challenge, setChallenge] = useState<PasswordResetChallenge | null>(null)
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  /**
   * Both timers are **deadlines in epoch ms**, never counters that get
   * decremented. A decrementing number drifts the moment the tab is
   * backgrounded or the station stutters — the same rule the session countdown
   * follows (F3.7). `tick` only re-renders; it never subtracts.
   */
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (step !== 'code') return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [step])

  /**
   * Caret repair after a rejected or resent code.
   *
   * The cells are `disabled` while the request is in flight, which blurs the
   * row, and the parent clears the value — so the player is left with six empty
   * boxes and no caret. Bumping this counter *in the same commit* that releases
   * `loading` means the effect runs against enabled inputs; calling `.focus()`
   * straight from the catch block would aim at a still-disabled cell.
   */
  const codeRef = useRef<CodeInputHandle>(null)
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) codeRef.current?.focus(0)
  }, [refocus])

  const now = Date.now()
  const resendIn = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0
  const expiresIn = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const codeDead = expiresAt !== null && expiresIn === 0

  /** Turns a thrown value into the localized copy for its code (F2.2). */
  const report = useCallback(
    (err: unknown) => {
      const code = err instanceof ApiError ? err.code : 'generic'
      onToast('error', t(`errors.${code}` as TKey))
      return code
    },
    [onToast, t],
  )

  /**
   * Moves to a step *and* hands the header the facts it needs to word it.
   *
   * The challenge is passed explicitly on the hop that creates it: `setChallenge`
   * has not committed yet when `sendCode` advances, so reading state here would
   * announce the code step with no address in it — "Enter the 6-digit code sent
   * to " is worse than no header at all. `null` clears the facts on the way back
   * to the address step.
   */
  const go = useCallback(
    (next: RecoveryStep, from?: PasswordResetChallenge | null) => {
      const src = from === undefined ? challenge : from
      onStateChange({
        step: next,
        maskedEmail: src?.maskedEmail,
        codeLength: src?.codeLength,
      })
    },
    [challenge, onStateChange],
  )

  /** Applies a fresh challenge: masked address, code TTL, resend cooldown. */
  const accept = (next: PasswordResetChallenge) => {
    setChallenge(next)
    const at = Date.now()
    setResendAt(at + next.resendAfterSec * 1000)
    setExpiresAt(at + next.expiresInSec * 1000)
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOk(email)) {
      setFieldError(t('errors.invalidEmail'))
      onReject()
      return
    }
    setFieldError(null)
    setLoading(true)
    try {
      const next = await requestPasswordReset(email)
      accept(next)
      setCode('')
      onToast('info', t('auth.codeSentToast', { email: next.maskedEmail }))
      go('code', next)
    } catch (err) {
      report(err)
      onReject()
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!challenge || resendIn > 0) return
    setFieldError(null)
    setLoading(true)
    try {
      const next = await resendPasswordResetCode(challenge.challengeId)
      accept(next)
      setCode('')
      setRefocus((n) => n + 1)
      onToast('info', t('auth.codeResentToast'))
    } catch (err) {
      const code = report(err)
      // The server refused inside its own window — trust it over the local
      // clock and put the guard back up.
      if (code === 'rateLimited') setResendAt(Date.now() + 60_000)
    } finally {
      setLoading(false)
    }
  }

  /**
   * `CodeInput` fires `onComplete` on the sixth digit, and the same submit runs
   * from the button. The guard keeps a fast typist from sending the code twice
   * and burning one of the five attempts on their own keystroke.
   */
  const verifying = useRef(false)

  const verify = useCallback(
    async (entered: string) => {
      if (!challenge || verifying.current) return
      if (entered.length !== challenge.codeLength) {
        setFieldError(t('errors.required'))
        onReject()
        return
      }
      verifying.current = true
      setFieldError(null)
      setLoading(true)
      try {
        const { resetToken: token, expiresInSec } = await verifyPasswordResetCode(
          challenge.challengeId,
          entered,
        )
        setResetToken(token)
        setExpiresAt(Date.now() + expiresInSec * 1000)
        go('password')
      } catch (err) {
        const failed = report(err)
        setFieldError(t(`errors.${failed}` as TKey))
        // Wrong digits are cleared, because the next thing the player does is
        // read the mail again and type six new ones. An expired code is *not*
        // cleared: the fix is the resend button, not retyping.
        if (failed === 'invalidCode') {
          setCode('')
          setRefocus((n) => n + 1)
        }
        onReject()
      } finally {
        verifying.current = false
        setLoading(false)
      }
    },
    [challenge, go, onReject, report, t],
  )

  const passwordErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (password && password.length < MIN_PASSWORD) {
      e.password = t('errors.tooShort', { min: MIN_PASSWORD })
    }
    if (confirm && confirm !== password) e.confirm = t('errors.passwordsMismatch')
    return e
  }, [password, confirm, t])

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challenge || !resetToken) return
    if (
      password.length < MIN_PASSWORD ||
      confirm !== password ||
      Object.keys(passwordErrors).length > 0
    ) {
      setFieldError(t('errors.validation'))
      onReject()
      return
    }
    setFieldError(null)
    setLoading(true)
    try {
      const { profile } = await completePasswordReset({
        challengeId: challenge.challengeId,
        resetToken,
        password,
        confirmPassword: confirm,
      })
      onSuccess(profile, profile.nickname)
    } catch (err) {
      report(err)
      onReject()
      setLoading(false)
    }
  }

  return (
    <motion.div
      key={`recovery-${step}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {step === 'email' && (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <Field
            label={t('auth.recoverEmail')}
            icon={<icons.email size={15} />}
            type="email"
            value={email}
            onValueChange={(v) => {
              setEmail(v)
              setFieldError(null)
            }}
            placeholder={t('auth.emailPlaceholder')}
            error={fieldError ?? undefined}
            autoComplete="email"
            autoFocus
          />
          {/* The screen's single bevelled CTA moves with the step (§4): only one
              action commits at a time, so only one `cut` is on screen. */}
          <Button type="submit" size="lg" block cut loading={loading}>
            {t('auth.sendCode')}
          </Button>
          <BackToSignIn label={t('auth.backToSignIn')} onClick={onCancel} disabled={loading} />
        </form>
      )}

      {step === 'code' && challenge && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void verify(code)
          }}
          className="flex flex-col gap-4"
        >
          <CodeInput
            ref={codeRef}
            label={t('auth.code')}
            length={challenge.codeLength}
            value={code}
            onValueChange={(v) => {
              setCode(v)
              setFieldError(null)
            }}
            onComplete={(v) => void verify(v)}
            error={fieldError ?? (codeDead ? t('auth.codeDead') : undefined)}
            hint={
              codeDead ? undefined : t('auth.codeExpiresIn', { time: formatCountdown(expiresIn) })
            }
            disabled={loading}
            autoFocus
          />

          {/* MOCK ONLY — nothing here sends mail, so the code is printed instead
              of hidden. A well with a `warning` plate, the same "announced, not
              broken" treatment the guest tab uses (§3.3): it is unmistakably a
              prototype affordance and not part of the product. */}
          {challenge.devCode && (
            <div className="well flex flex-col gap-1.5 rounded-lg border border-warning/30 p-3">
              <span className="label-mono flex items-center gap-2 text-[9px] text-warning">
                <icons.info size={11} />
                {t('auth.demoCode')}
                <span className="font-clock text-sm tracking-[0.35em] text-text-high">
                  {challenge.devCode}
                </span>
              </span>
              <span className="text-pretty text-[11px] leading-relaxed text-text-low">
                {t('auth.demoCodeNote')}
              </span>
            </div>
          )}

          <Button type="submit" size="lg" block cut loading={loading} disabled={codeDead}>
            {t('auth.confirmCode')}
          </Button>

          <div className="flex flex-col items-center gap-1">
            {/* The cooldown is *stated*, not implied by a dead button: "New code
                in 00:47" tells the player to wait, a greyed control tells them
                the club is broken. */}
            <Button
              variant="ghost"
              size="sm"
              voice="plain"
              onClick={resend}
              disabled={loading || resendIn > 0}
              iconLeft={<icons.retry size={14} />}
              className="text-text-medium hover:bg-transparent hover:text-text-high"
            >
              {resendIn > 0
                ? t('auth.resendIn', { time: formatCountdown(resendIn) })
                : t('auth.resendCode')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              voice="plain"
              onClick={() => {
                setCode('')
                setFieldError(null)
                setChallenge(null)
                setResendAt(null)
                setExpiresAt(null)
                go('email', null)
              }}
              disabled={loading}
              className="text-text-low hover:bg-transparent hover:text-text-high"
            >
              {t('auth.changeEmail')}
            </Button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <Field
            label={t('auth.newPassword')}
            icon={<icons.lock size={15} />}
            type={showPass ? 'text' : 'password'}
            value={password}
            onValueChange={(v) => {
              setPassword(v)
              setFieldError(null)
            }}
            placeholder={t('auth.minChars')}
            error={passwordErrors.password}
            autoComplete="new-password"
            autoFocus
            trailing={
              <IconButton
                size="sm"
                variant="ghost"
                label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                onClick={() => setShowPass((v) => !v)}
                className="-mr-1.5 size-8 text-text-low"
              >
                {showPass ? <icons.conceal /> : <icons.reveal />}
              </IconButton>
            }
          />
          <Field
            label={t('auth.confirmPassword')}
            icon={<icons.biometry size={15} />}
            type="password"
            value={confirm}
            onValueChange={(v) => {
              setConfirm(v)
              setFieldError(null)
            }}
            placeholder={t('auth.repeat')}
            error={passwordErrors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" size="lg" block cut loading={loading}>
            {t('auth.saveAndSignIn')}
          </Button>
          <BackToSignIn label={t('auth.backToSignIn')} onClick={onCancel} disabled={loading} />
        </form>
      )}
    </motion.div>
  )
}

/** Quiet way out, in the same slot and voice as "Continue as guest". */
function BackToSignIn({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      voice="plain"
      onClick={onClick}
      disabled={disabled}
      iconLeft={<icons.back size={14} />}
      className="self-center text-text-low hover:bg-transparent hover:text-text-high"
    >
      {label}
    </Button>
  )
}
