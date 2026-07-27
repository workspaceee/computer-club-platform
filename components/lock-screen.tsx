'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { AssetImage } from '@/components/ui/asset-image'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AttractMode } from '@/components/attract-mode'
import { BrandLabel } from '@/components/brand-label'
import { LangSwitcher } from '@/components/lang-switcher'
import { MockQr } from '@/components/mock-qr'
import { Overlay } from '@/components/ui/overlay'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useIdle } from '@/hooks/use-idle'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  confirmQrChallenge,
  continueAsGuest,
  login,
  loginAsDemo,
  register,
  requestQrChallenge,
} from '@/lib/mock/api'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

/** Idle time before the attract mode kicks in (ms). */
const IDLE_TIMEOUT_MS = 30_000

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function LockScreen() {
  const loginSuccess = useStore((s) => s.loginSuccess)
  const guestSuccess = useStore((s) => s.guestSuccess)
  const toast = useStore((s) => s.toast)
  const now = useClock()
  const idle = useIdle(IDLE_TIMEOUT_MS)

  const { t, lang, formatTime, formatFullDate } = useT()

  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // login fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // register fields
  const [rUser, setRUser] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPass, setRPass] = useState('')
  const [rConfirm, setRConfirm] = useState('')

  const [touched, setTouched] = useState(false)

  const loginErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (identifier && identifier.includes('@') && !emailOk(identifier))
      e.identifier = t('errors.invalidEmail')
    if (password && password.length < 6) e.password = t('errors.tooShort', { min: 6 })
    return e
  }, [identifier, password, t])

  const registerErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (rEmail && !emailOk(rEmail)) e.email = t('errors.invalidEmail')
    if (rPass && rPass.length < 6) e.password = t('errors.tooShort', { min: 6 })
    if (rConfirm && rConfirm !== rPass) e.confirm = t('errors.passwordsMismatch')
    return e
  }, [rEmail, rPass, rConfirm, t])

  const passStrength = useMemo(() => {
    let s = 0
    if (rPass.length >= 6) s++
    if (/[A-Z]/.test(rPass)) s++
    if (/[0-9]/.test(rPass)) s++
    if (/[^A-Za-z0-9]/.test(rPass)) s++
    return s
  }, [rPass])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!identifier || !password || Object.keys(loginErrors).length > 0) {
      triggerShake()
      return
    }
    setLoading(true)
    try {
      // The endpoint returns a session (`profile` + token + role); the shell only
      // needs the profile.
      const { profile } = await login({ identifier, password })
      toast('success', t('auth.welcomeBackToast', { name: profile.nickname }))
      loginSuccess(profile)
    } catch (err) {
      setLoading(false)
      triggerShake()
      reportError(err)
    }
  }

  /** Turns any thrown value into the localized copy for its code (F2.2). */
  const reportError = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : 'generic'
    toast('error', t(`errors.${code}` as TKey))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!rUser || !rEmail || !rPass || Object.keys(registerErrors).length > 0) {
      triggerShake()
      return
    }
    setLoading(true)
    try {
      const { profile } = await register({
        nickname: rUser,
        email: rEmail,
        password: rPass,
        confirmPassword: rConfirm,
      })
      toast('success', t('auth.accountCreated'))
      // A brand-new profile keeps the language picked on this station.
      loginSuccess({ ...profile, lang })
    } catch (err) {
      setLoading(false)
      triggerShake()
      reportError(err)
    }
  }

  const demoLogin = async () => {
    setLoading(true)
    try {
      const { profile } = await loginAsDemo()
      toast('info', t('auth.enteringDemo'))
      loginSuccess(profile)
    } catch (err) {
      setLoading(false)
      reportError(err)
    }
  }

  const demoAdmin = () => {
    toast('info', t('auth.adminSeparateApp'))
  }

  // Walk-in check-in. `guestCheckoutEnabled` can be off, so the failure path is
  // a normal API error, not a silently dead button.
  const startGuest = async () => {
    setLoading(true)
    try {
      const { guestId, label } = await continueAsGuest()
      toast('info', t('guest.startedToast', { label }))
      guestSuccess({ guestId, label })
    } catch (err) {
      setLoading(false)
      reportError(err)
    }
  }

  // Cancelling the QR handshake has to *outrank* the in-flight promise, or a
  // guest who backs out and starts typing their password gets signed in as
  // whoever the phone confirmed a second later. The generation counter is the
  // guard: `cancelQr` bumps it, and a resolved challenge from an older
  // generation is discarded instead of logging anyone in.
  const qrRun = useRef(0)

  const cancelQr = () => {
    qrRun.current += 1
    setQrOpen(false)
  }

  const startQr = async () => {
    const run = ++qrRun.current
    setQrOpen(true)
    try {
      const challenge = await requestQrChallenge()
      // The mock confirms immediately, but the real handshake waits for the phone —
      // so the pending state stays up for a beat before polling.
      await new Promise((resolve) => setTimeout(resolve, 2500))
      const { profile } = await confirmQrChallenge(challenge.challengeId)
      if (qrRun.current !== run) return
      setQrOpen(false)
      toast('success', t('auth.qrVerified'))
      loginSuccess(profile)
    } catch (err) {
      if (qrRun.current !== run) return
      setQrOpen(false)
      reportError(err)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setTouched(false)
  }

  // Headline is split in two so the accent word can be highlighted where the
  // language has one; EN → "Welcome back", RU/LT → single phrase (F2.6).
  const headline = useMemo(
    () =>
      mode === 'login'
        ? { lead: t('auth.welcome'), accent: t('auth.welcomeHi') }
        : { lead: t('auth.join'), accent: t('auth.joinHi') },
    [mode, t],
  )

  // Clock and date follow the active language's locale (F2.4).
  const timeStr = now ? formatTime(now) : '--:--'
  const secStr = now ? String(now.getSeconds()).padStart(2, '0') : '--'
  const dateStr = now ? formatFullDate(now) : ''

  return (
    <div className="relative flex h-full min-h-dvh w-full overflow-hidden bg-black">
      {/* ------- cinematic backdrop ------- */}
      <div className="absolute inset-0">
        <AssetImage
          src="/lock-bg.webp"
          alt=""
          priority
          sizes="100vw"
          className="object-cover"
          // This is the first paint of the whole product on a station that boots
          // into it, so it blurs up from an LQIP instead of flashing black, and
          // degrades to the plate rather than to nothing (F7.5).
          fallback="plate"
        />
      </div>
      {/*
        Readability veils (§3.1). Directional by design: the pie exists to buy
        contrast *under the clock and the card*, not to dim the photograph.

        The flat `bg-black/45` + cold `rgba(8,10,18,.35)` pair that used to sit
        here was calibrated for a bright, red-blown room shot. The current
        backdrop is already graded dark with crushed blacks, so those two layers
        were subtracting detail it has none to spare — the neon sign went grey
        and the figure went to mud, which reads as a *soft* image rather than a
        dark one. A gentle 18 % floor is enough to keep a stray bright frame in
        range; the shaping is left to the two gradients.
      */}
      <div className="absolute inset-0 bg-black/[0.18]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,6,10,0.55) 0%, rgba(5,6,10,0.05) 42%, rgba(5,6,10,0.5) 72%, rgba(5,6,10,0.82) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,6,10,0.5) 0%, transparent 22%, transparent 68%, rgba(5,6,10,0.72) 100%)',
        }}
      />
      <ParticleField />

      {/* =================== Language switcher (F2.4) =================== */}
      <LangSwitcher showLabel className="absolute right-4 top-4 z-30 lg:right-6 lg:top-6" />

      {/* =================== Corner signature =================== */}
      <BrandLabel className="absolute bottom-4 right-4 z-30 lg:bottom-6 lg:right-6" />

      {/* =================== LEFT — station identity =================== */}
      {/* The lockup used to head this column; it now signs the bottom-right
          corner (see `BrandLabel`), which leaves the clock as the first thing
          read and clears the neon sign in the backdrop art. The telemetry
          strip stays pinned to the bottom edge (its original home), while
          the clock's `my-auto` centres it in the space above — plain
          `justify-between` with two children would strand the clock at the
          ceiling. */}
      <div className="relative z-10 hidden flex-1 flex-col gap-12 p-10 lg:flex xl:p-14">
        {/* giant clock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="my-auto flex flex-col gap-3"
        >
          <span className="label-mono flex items-center gap-2 text-[11px] text-primary">
            <span className="h-px w-8 bg-primary/60" />
            {t('auth.localTime')}
          </span>
          <div className="flex items-end gap-2.5">
            <span className="neon-text neon-digits font-clock text-[4.75rem] font-semibold leading-[0.85] tabular-nums text-text-high xl:text-[6rem]">
              {timeStr}
            </span>
            <span className="mb-1.5 font-clock text-xl font-medium tabular-nums text-primary xl:mb-2 xl:text-2xl">
              :{secStr}
            </span>
          </div>
          <span className="text-lg text-text-medium">{dateStr}</span>
        </motion.div>

        {/* telemetry strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-wrap items-center gap-3"
        >
          <StationBadge />
          <Telemetry icon={<icons.network size={13} />} label={t('auth.ping')} value="4 ms" />
          <Telemetry icon={<icons.display size={13} />} label={t('auth.display')} value="240 Hz" />
          <Telemetry icon={<icons.hardware size={13} />} label={t('auth.gpu')} value="RTX 4080" />
          <Telemetry
            icon={<icons.status size={13} />}
            label={t('auth.status')}
            value={t('auth.optimal')}
            accent
          />
        </motion.div>
      </div>

      {/* =================== RIGHT — access terminal =================== */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-10 lg:w-[44%] lg:min-w-[480px] lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={
            shake
              ? { x: [0, -10, 10, -8, 8, -4, 4, 0], opacity: 1, y: 0 }
              : idle
                ? { opacity: 0, y: 56, scale: 0.9, x: 0 }
                : { opacity: 1, y: 0, x: 0, scale: 1 }
          }
          transition={
            shake
              ? { duration: 0.5 }
              : idle
                ? { duration: 0.6, ease: 'easeIn' }
                : { duration: 0.7, delay: 0.1, ease: 'easeOut' }
          }
          className={`neon-ring relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0a0b10]/80 shadow-[0_32px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${idle ? 'pointer-events-none' : ''}`}
        >
          {/* subtle top accent line */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(229,53,43,0.8) 50%, transparent)',
            }}
          />

          {/* ------- card header : access terminal ------- */}
          <div className="relative z-[2] px-7 pt-7">
            <div className="flex items-center justify-between">
              <span className="label-mono flex items-center gap-2 text-[10px] text-primary">
                <icons.secure size={12} />
                {t('auth.accessTerminal')}
              </span>
              <span className="label-mono flex items-center gap-1.5 text-[10px] text-text-low">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                PC-17 · {t('common.online')}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-5"
              >
                <h1 className="font-display text-[2.1rem] font-bold uppercase leading-[0.95] tracking-tight text-text-high text-balance">
                  {headline.lead}
                  {/* RU/LT keep the accent word empty — the headline stays one phrase. */}
                  {headline.accent && (
                    <>
                      {' '}
                      <span className="text-glow text-primary">{headline.accent}</span>
                    </>
                  )}
                  <span className="caret-blink ml-1 font-normal text-primary">_</span>
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-text-medium">
                  {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ------- mode switch : segmented tabs ------- */}
            <div className="mt-6 grid grid-cols-2 rounded-lg border border-border bg-black/40 p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative rounded-md py-2 font-display text-xs font-semibold uppercase tracking-widest transition-colors ${
                    mode === m ? 'text-text-high' : 'text-text-low hover:text-text-medium'
                  }`}
                  aria-pressed={mode === m}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-md border border-primary/40 bg-primary/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(229,53,43,0.18)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                  <span className="relative z-[1]">
                    {m === 'login' ? t('auth.signIn') : t('auth.register')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ------- form body ------- */}
          <div className="relative z-[2] p-7 pt-5">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleLogin}
                  className="flex flex-col gap-4"
                >
                  <Field
                    label={t('auth.userOrEmail')}
                    icon={<icons.player size={15} />}
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder={t('auth.userOrEmailPlaceholder')}
                    error={touched ? loginErrors.identifier : undefined}
                    autoFocus
                  />
                  <Field
                    label={t('auth.password')}
                    icon={<icons.lock size={15} />}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder={t('auth.passwordPlaceholder')}
                    error={touched ? loginErrors.password : undefined}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="text-text-low transition-colors hover:text-text-high"
                        aria-label={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPass ? <icons.conceal size={18} /> : <icons.reveal size={18} />}
                      </button>
                    }
                  />

                  <PrimaryButton loading={loading} label={t('auth.unlock')} />

                  <div className="my-1 flex items-center gap-3 text-text-low">
                    <span className="h-px flex-1 bg-border" />
                    <span className="label-mono text-[10px]">{t('auth.orContinue')}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <SecondaryButton
                      onClick={startQr}
                      icon={<icons.qr size={16} />}
                      label={t('auth.qrLogin')}
                    />
                    <SecondaryButton
                      onClick={demoLogin}
                      icon={<icons.demo size={16} />}
                      label={t('auth.demo')}
                    />
                    <SecondaryButton
                      onClick={demoAdmin}
                      icon={<icons.staff size={16} />}
                      label={t('auth.admin')}
                    />
                  </div>

                  {/* Walk-in check-in — opens the guest surface of the same
                      launcher shell, not a separate app (F6.2 / F6.8). */}
                  <button
                    type="button"
                    onClick={startGuest}
                    disabled={loading}
                    className="mt-1 flex items-center justify-center gap-2 rounded-sm py-1.5 text-xs font-medium text-text-low transition-colors hover:text-text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
                  >
                    <icons.guest size={14} />
                    {t('guest.continueAsGuest')}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleRegister}
                  className="flex flex-col gap-4"
                >
                  <Field
                    label={t('auth.username')}
                    icon={<icons.player size={15} />}
                    value={rUser}
                    onChange={setRUser}
                    placeholder={t('auth.usernamePlaceholder')}
                    autoFocus
                  />
                  <Field
                    label={t('auth.email')}
                    icon={<icons.email size={15} />}
                    value={rEmail}
                    onChange={setREmail}
                    placeholder={t('auth.emailPlaceholder')}
                    error={touched ? registerErrors.email : undefined}
                  />
                  <div>
                    <Field
                      label={t('auth.password')}
                      icon={<icons.lock size={15} />}
                      type="password"
                      value={rPass}
                      onChange={setRPass}
                      placeholder={t('auth.minChars')}
                      error={touched ? registerErrors.password : undefined}
                    />
                    {rPass && (
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
                                  : 'rgba(255,255,255,0.1)',
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
                    value={rConfirm}
                    onChange={setRConfirm}
                    placeholder={t('auth.repeat')}
                    error={touched ? registerErrors.confirm : undefined}
                  />

                  <PrimaryButton loading={loading} label={t('auth.createAccount')} />
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* ------- card footer strip ------- */}
          <div className="relative z-[2] flex items-center justify-between border-t border-border bg-black/30 px-7 py-3">
            <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
              <icons.lock size={10} className="text-success" />
              {t('auth.encrypted')}
            </span>
            <span className="label-mono text-[9px] text-text-low">
              {t('common.shell')} v2.4
            </span>
          </div>
        </motion.div>

        {/* mobile clock + station */}
        <div className="mt-8 flex items-center gap-4 lg:hidden">
          <span className="font-clock text-3xl font-semibold tabular-nums text-text-high">{timeStr}</span>
          <StationBadge />
        </div>
      </div>

      {/* Idle attract mode overlay */}
      <AnimatePresence>{idle && <AttractMode />}</AnimatePresence>

      <QrDialog open={qrOpen} onCancel={cancelQr} />
    </div>
  )
}

/**
 * Sign-in-by-phone dialog (F6.4).
 *
 * The last hand-rolled overlay in the product, and it carried every defect the
 * `F6.1` pass fixed elsewhere:
 *
 *   • it was `absolute inset-0` inside the lock-screen root rather than a
 *     portalled `fixed` layer, so it centred against the *page* — on a short
 *     window the QR block grew past both edges with no scroll port to recover it;
 *   • it hard-coded `z-50`, which is the `banner` rung: a reconnect strip and
 *     this dialog fought over the same plane, winner decided by render order;
 *   • it had **no way out**. No Escape, no scrim click, no button — the guest who
 *     opened it by mistake watched a spinner until the handshake timed out. On a
 *     kiosk, with a queue behind them, that is the worst possible dead end.
 *
 * Routing it through `Overlay` fixes the geometry and the ladder; the explicit
 * cancel button fixes the dead end, because a scrim click alone is not a
 * discoverable exit for a first-time walk-in guest.
 */
function QrDialog({ open, onCancel }: { open: boolean; onCancel: () => void }) {
  const { t } = useT()
  const titleId = useId()
  const bodyId = useId()
  const panelRef = useDismissableLayer({ open, onClose: onCancel })

  return (
    <Overlay open={open} layer="modal" onDismiss={onCancel}>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          'glass-strong flex w-full max-w-sm flex-col overflow-hidden rounded-3xl outline-none',
          OVERLAY_MAX_H,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-8">
          <MockQr />
          <p id={titleId} className="font-display text-lg font-bold text-text-high text-balance">
            {t('auth.scanWithApp')}
          </p>
          <p id={bodyId} className="flex items-center gap-2 text-sm text-text-medium">
            <icons.pending size={14} className="animate-spin text-primary" aria-hidden />
            {t('auth.waitingConfirmation')}
          </p>
        </div>

        {/* Pinned outside the scroll body — the way out must never be the thing
            you have to scroll to find. */}
        <div className="shrink-0 px-8 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-md border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {t('common.cancel')}
          </button>
        </div>
      </motion.div>
    </Overlay>
  )
}

function StationBadge() {
  const { t } = useT()
  return (
    <span className="glass neon-ring flex items-center gap-2 rounded-full px-3.5 py-1.5">
      <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
      <span className="font-display text-sm font-bold tracking-wide text-text-high">PC #17</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-success">
        {t('auth.stationReady')}
      </span>
    </span>
  )
}

function Telemetry({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <span className="glass neon-ring flex items-center gap-2 rounded-full px-3 py-1.5">
      <span className={accent ? 'text-success' : 'text-primary'}>{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-text-low">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-text-high">{value}</span>
    </span>
  )
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  trailing,
  autoFocus,
}: {
  label: string
  icon?: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  trailing?: React.ReactNode
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label-mono text-[10px] text-text-low">{label}</label>
      <div
        className="flex items-center gap-2.5 rounded-lg border bg-black/40 px-3.5 transition-all focus-within:border-primary focus-within:bg-black/60 focus-within:shadow-[0_0_0_3px_rgba(229,53,43,0.14),0_0_24px_-6px_rgba(229,53,43,0.35)]"
        style={{ borderColor: error ? 'var(--danger)' : 'var(--border)' }}
      >
        {icon && <span className="shrink-0 text-text-low">{icon}</span>}
        <input
          type={type}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-text-high outline-none placeholder:text-text-low"
        />
        {trailing}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function PrimaryButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden bg-primary font-display text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_0_24px_rgba(229,53,43,0.35)] transition-all hover:bg-primary-hover hover:shadow-[0_0_36px_rgba(229,53,43,0.55)] disabled:opacity-70 [clip-path:polygon(0_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%)]"
    >
      {/* sheen sweep on hover */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
      {loading ? <icons.pending size={18} className="animate-spin" /> : label}
    </button>
  )
}

function SecondaryButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-md border border-border bg-white/[0.03] px-2 py-3 text-[11px] font-medium text-text-medium transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-text-high hover:shadow-[0_0_20px_-4px_rgba(229,53,43,0.45)]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary shadow-[0_0_12px_rgba(229,53,43,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all group-hover:border-primary/60 group-hover:bg-primary/20 group-hover:text-white group-hover:shadow-[0_0_18px_rgba(229,53,43,0.5),0_0_4px_rgba(255,255,255,0.3)]">
        {icon}
      </span>
      {label}
    </button>
  )
}

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: `${(i * 53) % 100}%`,
        delay: (i % 6) * 1.2,
        duration: 9 + (i % 5),
        size: 2 + (i % 2),
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{ left: p.left, width: p.size, height: p.size, bottom: -10 }}
          animate={{ y: [0, -700], opacity: [0, 0.5, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
