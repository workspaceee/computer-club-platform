'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CodeInput, type CodeInputHandle } from '@/components/ui/code-input'
import { Field } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  checkNickname,
  completeRegistration,
  NICKNAME_MAX,
  NICKNAME_MIN,
  resendRegistrationCode,
  startRegistration,
  type AuthResult,
  type NicknameVerdict,
  type RegistrationChallenge,
} from '@/lib/mock/api'
import { formatCountdown } from '@/lib/time'

/**
 * Where the player is in signing up (C1.4).
 *
 * Two steps, not one form: the details, then the code from the inbox. The split
 * is what makes the code screen honest — the account does not exist until the
 * code lands, so a player who walks away at the second step leaves nothing
 * behind and the nickname they were about to take stays free.
 */
export type SignupStep = 'details' | 'code'

/** What the card header needs to word a live signup. */
export interface SignupState {
  step: SignupStep
  maskedEmail?: string
  codeLength?: number
}

/**
 * Headline + subline keys per step, consumed by the card header of the screen.
 *
 * The code step borrows the recovery headline ("Check your email") because it is
 * literally the same instruction, but it gets **its own subline**: nothing is
 * being recovered here, an account is being created, and "enter the code to
 * finish signing up" is the sentence that says so.
 */
export const SIGNUP_COPY: Record<SignupStep, { lead: TKey; accent: TKey; sub: TKey }> = {
  details: { lead: 'auth.join', accent: 'auth.joinHi', sub: 'auth.registerSub' },
  code: { lead: 'auth.codeStep', accent: 'auth.codeStepHi', sub: 'auth.signupCodeSub' },
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const MIN_PASSWORD = 6

/** Debounce on the live nickname check — one request per pause, not per keystroke. */
const NICK_DEBOUNCE_MS = 400

interface RegistrationProps {
  step: SignupStep
  onStateChange: (state: SignupState) => void
  /** Back out to the sign-in form. */
  onCancel: () => void
  /**
   * The flow ends signed in — `completeRegistration` returns a session, and the
   * whole session goes up: the screen still has the seat check to run (C1.7),
   * which asks for an account id the profile does not carry.
   */
  onSuccess: (session: AuthResult) => void
  /** Localized toast, so the screen keeps owning the toast voice. */
  onToast: (tone: 'success' | 'info' | 'error', message: string) => void
  /** Shake the card, like a failed sign-in. */
  onReject: () => void
}

/** Live state of the nickname field. `idle` = nothing worth checking yet. */
type NickState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'answer'; verdict: NicknameVerdict; nickname: string; suggestions: string[] }

/**
 * Registration with a confirmed email (C1.4).
 *
 * Lives in the body of the access-terminal card, next to `PasswordRecovery` and
 * for the same reason: the flow ends in a *sign-in*, so it takes the card over
 * rather than floating above it in a dialog. Three things shape it:
 *
 *  - **The email is proven before the account exists.** `startRegistration`
 *    only opens a challenge; `completeRegistration` is the single call that
 *    writes a member. Nobody gets a half-account by closing the card.
 *  - **The rules checkbox is a consent record, not a UI guard.** The CTA stays
 *    live and the server rejects an unticked box, because "the button was
 *    disabled" is not evidence that anyone agreed to anything. The rules
 *    themselves are one tap away — asking someone to accept text they cannot
 *    read is the actual dark pattern.
 *  - **The nickname is checked as you type, and the answer is never trusted.**
 *    The check reserves nothing, so `completeRegistration` judges the name again
 *    and a lost race comes back as a field error on the name the player can fix.
 */
export function Registration({
  step,
  onStateChange,
  onCancel,
  onSuccess,
  onToast,
  onReject,
}: RegistrationProps) {
  const { t } = useT()

  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  /** Field errors handed down by the server, cleared as soon as the field moves. */
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  /**
   * Both timers are **deadlines in epoch ms**, never counters that get
   * decremented — a backgrounded tab or a stuttering station would freeze a
   * counter and unfreeze the cooldown with it (same rule as C1.3 and F3.7).
   */
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (step !== 'code') return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [step])

  const now = Date.now()
  const resendIn = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0
  const expiresIn = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const codeDead = expiresAt !== null && expiresIn === 0

  /** Caret repair after a rejected or resent code — see `CodeInput`'s handle. */
  const codeRef = useRef<CodeInputHandle>(null)
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) codeRef.current?.focus(0)
  }, [refocus])

  /** Turns a thrown value into the localized copy for its code (F2.2). */
  const report = useCallback(
    (err: unknown) => {
      const code = err instanceof ApiError ? err.code : 'generic'
      onToast('error', t(`errors.${code}` as TKey))
      return code
    },
    [onToast, t],
  )

  /* ---------------------------------------------------------------- *
   * Live nickname check
   * ---------------------------------------------------------------- */

  const [nick, setNick] = useState<NickState>({ kind: 'idle' })

  /**
   * The answer belongs to the keystroke that asked for it.
   *
   * A generation counter, not just the debounce timer: typing `Pro` then
   * backspacing to `Pr` leaves two requests in flight over a 200–600 ms mock
   * network, and without this guard the slower one can land last and paint
   * "free" under a name the player already changed.
   */
  const nickRun = useRef(0)

  useEffect(() => {
    const value = nickname.trim()
    const run = ++nickRun.current

    // Below the minimum there is nothing to ask about — the hint under the field
    // already states the rule, and a red "too short" on the first letter typed
    // scolds someone who is mid-word.
    if (value.length < NICKNAME_MIN) {
      setNick({ kind: 'idle' })
      return
    }

    setNick({ kind: 'checking' })
    const timer = setTimeout(() => {
      void checkNickname(value)
        .then((answer) => {
          if (nickRun.current !== run) return
          setNick({
            kind: 'answer',
            verdict: answer.verdict,
            nickname: answer.nickname,
            suggestions: answer.suggestions,
          })
        })
        .catch(() => {
          // A failed *check* is not a failed signup: the field goes quiet and the
          // server has the last word at submit. A red frame here would blame the
          // player for the club's network.
          if (nickRun.current !== run) return
          setNick({ kind: 'idle' })
        })
    }, NICK_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [nickname])

  /** Copy for the verdict — each refusal names its own repair. */
  const nickMessage = useMemo((): { error?: string; hint?: string; ok?: boolean } => {
    if (serverErrors.nickname) return { error: serverErrors.nickname }
    if (nick.kind === 'checking') return { hint: t('auth.nickChecking') }
    if (nick.kind === 'idle') {
      return { hint: t('auth.nickHint', { min: NICKNAME_MIN, max: NICKNAME_MAX }) }
    }
    switch (nick.verdict) {
      case 'free':
        return { hint: t('auth.nickFree', { nick: nick.nickname }), ok: true }
      case 'taken':
        return { error: t('auth.nickTaken', { nick: nick.nickname }) }
      case 'reserved':
        return { error: t('auth.nickReserved') }
      case 'badChars':
        return { error: t('auth.nickBadChars') }
      case 'tooShort':
        return { error: t('auth.nickTooShort', { min: NICKNAME_MIN }) }
      case 'tooLong':
        return { error: t('auth.nickTooLong', { max: NICKNAME_MAX }) }
    }
  }, [nick, serverErrors.nickname, t])

  const nickTaken = nick.kind === 'answer' && (nick.verdict === 'taken' || nick.verdict === 'reserved')

  /* ---------------------------------------------------------------- *
   * Details step
   * ---------------------------------------------------------------- */

  const detailErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (email && !emailOk(email)) e.email = t('errors.invalidEmail')
    if (password && password.length < MIN_PASSWORD) e.password = t('errors.tooShort', { min: MIN_PASSWORD })
    if (confirm && confirm !== password) e.confirm = t('errors.passwordsMismatch')
    return e
  }, [email, password, confirm, t])

  const passStrength = useMemo(() => {
    let s = 0
    if (password.length >= MIN_PASSWORD) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])

  /** Applies a fresh challenge: masked address, code TTL, resend cooldown. */
  const accept = (next: RegistrationChallenge) => {
    setChallenge(next)
    const at = Date.now()
    setResendAt(at + next.resendAfterSec * 1000)
    setExpiresAt(at + next.expiresInSec * 1000)
  }

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    // The rules box is checked locally *and* on the server. Locally so the
    // player is told which control is missing instead of getting a generic
    // toast; on the server because consent has to be recorded, not assumed.
    if (!acceptedRules) {
      setServerErrors((prev) => ({ ...prev, acceptedRules: t('auth.rulesRequired') }))
      onReject()
      return
    }
    if (
      !nickname.trim() ||
      !email ||
      !password ||
      confirm !== password ||
      nickTaken ||
      Object.keys(detailErrors).length > 0
    ) {
      onReject()
      return
    }

    setLoading(true)
    try {
      const next = await startRegistration({
        nickname,
        email,
        password,
        confirmPassword: confirm,
        acceptedRules,
      })
      accept(next)
      setCode('')
      setCodeError(null)
      setServerErrors({})
      onToast('info', t('auth.codeSentToast', { email: next.maskedEmail }))
      onStateChange({ step: 'code', maskedEmail: next.maskedEmail, codeLength: next.codeLength })
    } catch (err) {
      // Field-level answers are painted on the fields — a toast saying "check
      // the highlighted fields" with nothing highlighted is a dead end.
      if (err instanceof ApiError && err.code === 'validation' && err.fields) {
        setServerErrors(mapFieldErrors(err.fields, t, nickname.trim()))
        onToast('error', t('errors.validation'))
      } else {
        report(err)
      }
      onReject()
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------- *
   * Code step
   * ---------------------------------------------------------------- */

  /**
   * `CodeInput` fires `onComplete` on the last digit and the button submits the
   * same value; the guard keeps a fast typist from spending two of the five
   * attempts on one code.
   */
  const confirming = useRef(false)

  const confirm6 = useCallback(
    async (entered: string) => {
      if (!challenge || confirming.current) return
      if (entered.length !== challenge.codeLength) {
        setCodeError(t('errors.required'))
        onReject()
        return
      }
      confirming.current = true
      setCodeError(null)
      setLoading(true)
      try {
        const session = await completeRegistration(challenge.challengeId, entered)
        onSuccess(session)
      } catch (err) {
        // Losing the nickname race between the code being sent and typed is a
        // *details* problem, so the flow walks back to the field that owns it
        // with everything else still typed in.
        if (err instanceof ApiError && err.code === 'validation' && err.fields) {
          setServerErrors(mapFieldErrors(err.fields, t, nickname.trim()))
          onToast('error', t('errors.validation'))
          setChallenge(null)
          setCode('')
          setResendAt(null)
          setExpiresAt(null)
          onStateChange({ step: 'details' })
          onReject()
          return
        }
        const failed = report(err)
        setCodeError(t(`errors.${failed}` as TKey))
        // Wrong digits are cleared — the next thing the player does is read the
        // mail again. An expired code is not: the repair is the resend button.
        if (failed === 'invalidCode') {
          setCode('')
          setRefocus((n) => n + 1)
        }
        onReject()
      } finally {
        confirming.current = false
        setLoading(false)
      }
    },
    [challenge, nickname, onReject, onStateChange, onSuccess, onToast, report, t],
  )

  const resend = async () => {
    if (!challenge || resendIn > 0) return
    setCodeError(null)
    setLoading(true)
    try {
      const next = await resendRegistrationCode(challenge.challengeId)
      accept(next)
      setCode('')
      setRefocus((n) => n + 1)
      onToast('info', t('auth.codeResentToast'))
    } catch (err) {
      const failed = report(err)
      // The server refused inside its own window — trust it over the local clock.
      if (failed === 'rateLimited') setResendAt(Date.now() + 60_000)
    } finally {
      setLoading(false)
    }
  }

  /** Back to the form with the typed details intact; the challenge is dropped. */
  const editDetails = () => {
    setChallenge(null)
    setCode('')
    setCodeError(null)
    setResendAt(null)
    setExpiresAt(null)
    onStateChange({ step: 'details' })
  }

  return (
    <motion.div
      key={`signup-${step}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {step === 'details' && (
        <form onSubmit={submitDetails} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Field
              label={t('auth.username')}
              icon={<icons.player size={15} />}
              value={nickname}
              onValueChange={(v) => {
                setNickname(v)
                setServerErrors(({ nickname: _drop, ...rest }) => rest)
              }}
              placeholder={t('auth.usernamePlaceholder')}
              maxLength={NICKNAME_MAX}
              error={nickMessage.error}
              hint={nickMessage.hint}
              autoComplete="username"
              autoFocus
              trailing={
                nick.kind === 'checking' ? (
                  <icons.pending size={14} className="animate-spin text-text-low" aria-hidden />
                ) : nickMessage.ok ? (
                  <icons.success size={14} className="text-success" aria-hidden />
                ) : undefined
              }
            />

            {/* Only for `taken` / `reserved`: those are the two verdicts where the
                repair is a *different name*, and where a player at a keyboard
                with someone waiting behind them wants one tap, not a brainstorm. */}
            {nickTaken && nick.suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="label-mono text-[9px] text-text-low">
                  {t('auth.nickSuggestions')}
                </span>
                {nick.suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="sm"
                    voice="plain"
                    onClick={() => setNickname(s)}
                    className="h-7 px-2 text-[11px] text-text-medium"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Field
            label={t('auth.email')}
            icon={<icons.email size={15} />}
            type="email"
            value={email}
            onValueChange={(v) => {
              setEmail(v)
              setServerErrors(({ email: _drop, ...rest }) => rest)
            }}
            placeholder={t('auth.emailPlaceholder')}
            error={serverErrors.email ?? (touched ? detailErrors.email : undefined)}
            autoComplete="email"
          />

          <div>
            <Field
              label={t('auth.password')}
              icon={<icons.lock size={15} />}
              type={showPass ? 'text' : 'password'}
              value={password}
              onValueChange={setPassword}
              placeholder={t('auth.minChars')}
              error={serverErrors.password ?? (touched ? detailErrors.password : undefined)}
              autoComplete="new-password"
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
            {password && (
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        i < passStrength
                          ? passStrength <= 1
                            ? 'var(--danger)'
                            : passStrength === 2
                              ? 'var(--warning)'
                              : 'var(--success)'
                          : 'var(--border)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <Field
            label={t('auth.confirmPassword')}
            icon={<icons.biometry size={15} />}
            type="password"
            value={confirm}
            onValueChange={setConfirm}
            placeholder={t('auth.repeat')}
            error={serverErrors.confirmPassword ?? (touched ? detailErrors.confirm : undefined)}
            autoComplete="new-password"
          />

          {/* Consent, with the text one tap away. The link is a `ghost` button
              inside the label line rather than a second row: the promise and the
              thing being promised belong to the same sentence. */}
          <Checkbox
            checked={acceptedRules}
            onChange={(v) => {
              setAcceptedRules(v)
              setServerErrors(({ acceptedRules: _drop, ...rest }) => rest)
            }}
            label={t('auth.rulesAccept')}
            description={
              <Button
                variant="ghost"
                size="sm"
                voice="plain"
                onClick={() => setRulesOpen(true)}
                className="h-auto px-0 py-0 text-[11px] text-primary hover:bg-transparent hover:text-primary-hover"
              >
                {t('auth.rulesRead')}
              </Button>
            }
            error={serverErrors.acceptedRules}
          />

          {/* The screen's single bevelled CTA moves with the step (§4). It is not
              disabled by the checkbox: the refusal has to be *said*, and the
              server is the one that records consent either way. */}
          <Button type="submit" size="lg" block cut loading={loading}>
            {t('auth.sendSignupCode')}
          </Button>

          <BackButton label={t('auth.backToSignIn')} onClick={onCancel} disabled={loading} />

          <ClubRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
        </form>
      )}

      {step === 'code' && challenge && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void confirm6(code)
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
              setCodeError(null)
            }}
            onComplete={(v) => void confirm6(v)}
            error={codeError ?? (codeDead ? t('auth.codeDead') : undefined)}
            hint={codeDead ? undefined : t('auth.codeExpiresIn', { time: formatCountdown(expiresIn) })}
            disabled={loading}
            autoFocus
          />

          {/* MOCK ONLY — nothing here sends mail, so the code is printed instead
              of hidden. Same dev plate as the recovery flow (§3.3). */}
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
            {t('auth.createAccount')}
          </Button>

          <div className="flex flex-col items-center gap-1">
            {/* The cooldown is *stated*, not implied by a dead button. */}
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
              onClick={editDetails}
              disabled={loading}
              className="text-text-low hover:bg-transparent hover:text-text-high"
            >
              {t('auth.editDetails')}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  )
}

/**
 * Server field codes → localized copy.
 *
 * The API answers with machine-readable codes (`taken`, `conflict`, `tooShort`)
 * and never prose, so the mapping lives on the client — and the nickname
 * verdicts map to the same strings the live check uses, so a name refused at
 * submit reads exactly like a name refused while typing.
 */
function mapFieldErrors(
  fields: Record<string, string>,
  t: (key: TKey, vars?: Record<string, string | number>) => string,
  /** The name that was submitted, so `taken` can say *which* name lost. */
  nickname: string,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [field, code] of Object.entries(fields)) {
    switch (code) {
      case 'taken':
        out[field] = t('auth.nickTaken', { nick: nickname })
        break
      case 'reserved':
        out[field] = t('auth.nickReserved')
        break
      case 'badChars':
        out[field] = t('auth.nickBadChars')
        break
      case 'tooShort':
        out[field] =
          field === 'nickname'
            ? t('auth.nickTooShort', { min: NICKNAME_MIN })
            : t('errors.tooShort', { min: MIN_PASSWORD })
        break
      case 'tooLong':
        out[field] = t('auth.nickTooLong', { max: NICKNAME_MAX })
        break
      case 'conflict':
        out[field] = field === 'email' ? t('auth.emailTaken') : t('errors.conflict')
        break
      case 'invalidEmail':
        out[field] = t('errors.invalidEmail')
        break
      case 'passwordsMismatch':
        out[field] = t('errors.passwordsMismatch')
        break
      case 'required':
        out[field] = field === 'acceptedRules' ? t('auth.rulesRequired') : t('errors.required')
        break
      default:
        out[field] = t('errors.validation')
    }
  }
  return out
}

/**
 * The club rules, in a dialog (C1.4).
 *
 * A `Modal` and not a link out: the station browser has no address bar, so
 * "see imba.club/rules" would be a dead end at the exact moment consent is
 * asked for. Five lines, because a wall of text nobody reads is the same as no
 * rules at all — the full document is named at the bottom for anyone who wants
 * it.
 */
function ClubRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const rules: TKey[] = ['auth.rule1', 'auth.rule2', 'auth.rule3', 'auth.rule4', 'auth.rule5']

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      eyebrow={t('help.rules')}
      title={t('auth.rulesTitle')}
      footer={
        <Button variant="secondary" size="md" block onClick={onClose}>
          {t('auth.rulesGotIt')}
        </Button>
      }
    >
      <ol className="flex flex-col gap-3">
        {rules.map((key, i) => (
          <li key={key} className="flex items-start gap-3">
            <span className="label-mono mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/12 text-[10px] text-primary">
              {i + 1}
            </span>
            <span className="text-pretty text-sm leading-relaxed text-text-medium">{t(key)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-pretty text-xs leading-relaxed text-text-low">{t('auth.rulesNote')}</p>
    </Modal>
  )
}

/** Quiet way out, in the same slot and voice as "Back to sign in" (C1.3). */
function BackButton({
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
