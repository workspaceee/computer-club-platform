'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { AssetImage } from '@/components/ui/asset-image'
import { useEffect, useMemo, useState } from 'react'
import { AttractMode } from '@/components/attract-mode'
import {
  PasswordRecovery,
  RECOVERY_COPY,
  type RecoveryState,
} from '@/components/auth/password-recovery'
import {
  Registration,
  SIGNUP_COPY,
  type SignupState,
} from '@/components/auth/registration'
import { SeatTaken, seatTakenBody } from '@/components/auth/seat-taken'
import { BrandLabel } from '@/components/brand-label'
import { IconTile } from '@/components/icon-tile'
import { Button, IconButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { LangSwitcher } from '@/components/lang-switcher'
import { StationBadge, StationPanel } from '@/components/station-panel'
import { QrLogin } from '@/components/auth/qr-login'
import { Segmented } from '@/components/ui/segmented'
import { useIdle } from '@/hooks/use-idle'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  continueAsGuest,
  fetchStationHolder,
  login,
  loginAsDemo,
  type AuthResult,
  type StationHolder,
} from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { ID } from '@/lib/types/common'

/**
 * The three doors of the terminal (C1.2).
 *
 * `guest` is the walk-in door — the entry into the stage-2 PostPaid flow, where
 * an admin opens the visit, the clock runs *up* and the money lands on an open
 * tab settled at the counter. Stage 2 owns the machinery, so the tab ships as an
 * explained stub: it teaches the model and names its state ("soon") instead of
 * pretending to check anyone in. `C1.9` swaps the disabled CTA for the real
 * call, when the option row below the sign-in form is reworked.
 */
type Mode = 'login' | 'register' | 'guest'

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
  /**
   * Password recovery (C1.3) is a *state of the sign-in door*, not a fourth
   * segment: it is the repair path for one of the three, and putting it in the
   * switcher would advertise "forgot my password" as a way to enter the club.
   * `null` means the normal form; anything else takes the card body over and the
   * switcher hides, so the screen still offers exactly one committing action.
   */
  const [recovery, setRecovery] = useState<RecoveryState | null>(null)
  /**
   * Signup (C1.4) *is* a segment, so unlike recovery it does not need a null to
   * mean "not here" — but it still needs a step, because the second one (the
   * emailed code) rewords the header and takes the switcher away. `null`
   * outside the register tab keeps the two facts in one place: whether the flow
   * is live, and where it is.
   */
  const [signup, setSignup] = useState<SignupState | null>(null)
  /**
   * An arrival that authenticated fine and cannot have the chair (C1.7).
   *
   * It holds both halves of the situation: **who** is sitting here, and **what**
   * was about to happen. Keeping the pending entry as a closure is what makes
   * the gate work for all five doors — sign-in, demo, QR, signup and recovery
   * each end differently (their own toast, profile or guest label), and none of
   * them has to know that a seat check exists between them and the launcher.
   */
  const [blocked, setBlocked] = useState<{
    holder: StationHolder
    /**
     * The *arrival's* account, not the holder's — `null` for a walk-in. The
     * re-check has to ask the same question the gate asked, and the answer
     * depends on who is standing here.
     */
    userId: ID | null
    enter: () => void
  } | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // login fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const [touched, setTouched] = useState(false)

  const loginErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (identifier && identifier.includes('@') && !emailOk(identifier))
      e.identifier = t('errors.invalidEmail')
    if (password && password.length < 6) e.password = t('errors.tooShort', { min: 6 })
    return e
  }, [identifier, password, t])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  /**
   * Who is holding this seat *against this arrival* — `null` when nobody is.
   *
   * The one place that decides admission (C1.7). `StationInfo.status` cannot
   * answer this: `occupied` is an aggregate for the floor map and names nobody,
   * so the question "is the live session on this machine mine?" needs the
   * session row itself.
   *
   * Two `null`s that are not "the seat is empty":
   *  - **The holder is the arrival.** A paused visit is exactly what "Lock PC"
   *    leaves behind, so its owner walks straight back into it. `C1.10` adds the
   *    PIN in front of that door; today the account match is the proof.
   *  - **The read failed.** A timeout is not evidence of a hold, and refusing
   *    entry on it would lock a paying member out of their own seat because one
   *    request dropped. The launcher opens its own session guard behind this one.
   */
  const heldBy = async (userId: ID | null): Promise<StationHolder | null> => {
    try {
      const holder = await fetchStationHolder()
      if (!holder) return null
      return userId && holder.userId === userId ? null : holder
    } catch {
      return null
    }
  }

  /**
   * The last gate before the launcher: every door runs its arrival through this.
   *
   * `enter` is only called when the chair is actually free, so the welcome toast
   * and the screen swap stay together — a player told "Welcome back" and then
   * shown a "station is in use" panel would read the second screen as a bug.
   */
  const admit = async (userId: ID | null, enter: () => void) => {
    const holder = await heldBy(userId)
    if (!holder) {
      enter()
      return
    }
    // The card stops spinning: nothing else is in flight, and the panel that
    // replaces the form has its own action.
    setLoading(false)
    setBlocked({ holder, userId, enter })
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
      // The endpoint returns a session (`profile` + `userId` + token + role): the
      // shell needs the profile, the seat check needs the id.
      const { profile, userId } = await login({ identifier, password })
      await admit(userId, () => {
        toast('success', t('auth.welcomeBackToast', { name: profile.nickname }))
        loginSuccess(profile)
      })
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

  /**
   * Signup ends *signed in* (C1.4), the same way recovery does:
   * `completeRegistration` returns a session, and telling somebody who is
   * standing at the station "account created, now log in" would be theatre.
   *
   * `signup` is cleared before the shell swaps the screen, so the card cannot
   * paint a code-step header over a login form for one frame.
   */
  const finishSignup = async ({ profile, userId }: AuthResult) => {
    setSignup(null)
    // The chair is checked for a brand-new member too (C1.7): an account created
    // at an occupied station is a real account, and it still cannot sit down.
    await admit(userId, () => {
      toast('success', t('auth.accountCreatedToast', { name: profile.nickname }))
      // A brand-new profile keeps the language picked on this station.
      loginSuccess({ ...profile, lang })
    })
  }

  const demoLogin = async () => {
    setLoading(true)
    try {
      const { profile, userId } = await loginAsDemo()
      await admit(userId, () => {
        toast('info', t('auth.enteringDemo'))
        loginSuccess(profile)
      })
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
      // A walk-in has no account, so nothing can match the holder: `null` means
      // *any* live session on this seat blocks them (C1.7). Which is the point —
      // the visit they were handed is exactly the second one nobody wants opened
      // on top of the first.
      await admit(null, () => {
        toast('info', t('guest.startedToast', { label }))
        guestSuccess({ guestId, label })
      })
    } catch (err) {
      setLoading(false)
      reportError(err)
    }
  }

  /**
   * QR sign-in (C1.5) lives in `QrLogin`, which owns the whole handshake: the
   * station code, its deadline, the `login.qr.confirmed` subscription and the
   * ticket exchange. The screen keeps only the two things that are its own — the
   * dialog's open state and what "signed in" means here.
   *
   * The generation guard that used to sit on this screen moved into the flow with
   * the promises it was guarding: cancelling has to outrank an in-flight
   * exchange, or a guest who backs out and starts typing their password gets
   * signed in as whoever the phone confirmed a second later.
   */
  const finishQr = async ({ profile, userId }: AuthResult) => {
    setQrOpen(false)
    await admit(userId, () => loginSuccess(profile))
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setTouched(false)
    // Leaving the register tab drops the pending signup on purpose: the account
    // does not exist until the code is confirmed, so nothing is lost and the
    // nickname that was about to be claimed stays free. Coming back opens a
    // fresh form rather than a stale challenge whose code has since expired.
    setSignup(m === 'register' ? { step: 'details' } : null)
  }

  /**
   * Enter the repair path (C1.3).
   *
   * The typed identifier is carried over only when it is an address — half of
   * the players sign in with a nickname, and prefilling `dan_v` into a field
   * labelled "Account email" would look like the club already knows it is wrong.
   */
  const startRecovery = () => {
    setRecovery({ step: 'email' })
    setTouched(false)
  }

  /**
   * The flow ends *signed in*, not back at the form: `completePasswordReset`
   * returns a session, so the same welcome toast and `loginSuccess` as a normal
   * unlock run here. Clearing `recovery` first keeps the card from painting a
   * recovery header for the frame before the shell swaps the screen out.
   */
  const finishRecovery = async ({ profile, userId }: AuthResult) => {
    setRecovery(null)
    await admit(userId, () => {
      toast('success', t('auth.welcomeBackToast', { name: profile.nickname }))
      loginSuccess(profile)
    })
  }

  // Headline is split in two so the accent word can be highlighted where the
  // language has one; EN → "Welcome back", RU/LT → single phrase (F2.6).
  // A live recovery outranks the mode: the card body belongs to the flow, so the
  // one headline over it has to name the *step*, not the door it came from.
  const headline = useMemo(() => {
    // A held seat outranks everything, including a live flow: the player is past
    // authentication and the card is now about the *chair*, not the door (C1.7).
    if (blocked) return { lead: t('auth.seatTaken'), accent: t('auth.seatTakenHi') }
    if (recovery) {
      const copy = RECOVERY_COPY[recovery.step]
      return { lead: t(copy.lead), accent: t(copy.accent) }
    }
    if (mode === 'login') return { lead: t('auth.welcome'), accent: t('auth.welcomeHi') }
    // Signup's second step borrows the recovery headline — "check your email" is
    // the same instruction — so the header follows the *step*, not the tab.
    if (mode === 'register' && signup) {
      const copy = SIGNUP_COPY[signup.step]
      return { lead: t(copy.lead), accent: t(copy.accent) }
    }
    if (mode === 'register') return { lead: t('auth.join'), accent: t('auth.joinHi') }
    return { lead: t('guest.lockTitle'), accent: t('guest.lockTitleHi') }
  }, [blocked, mode, recovery, signup, t])

  const subline = blocked
    ? // The whole sentence, holder's name included, lives in the subline: the
      // panel below states *who and since when*, and printing the instruction
      // twice on one card would make the second copy look like a different rule.
      t(seatTakenBody(blocked.holder), { name: blocked.holder.holder })
    : recovery
    ? // Only the code step reads these, and it is the step that has them: the
      // masked address and the code length travel up from the endpoint's answer
      // rather than being guessed here.
      t(RECOVERY_COPY[recovery.step].sub, {
        email: recovery.maskedEmail ?? '',
        n: recovery.codeLength ?? 6,
      })
    : mode === 'login'
      ? t('auth.loginSub')
      : mode === 'register'
        ? t(SIGNUP_COPY[signup?.step ?? 'details'].sub, {
            email: signup?.maskedEmail ?? '',
            n: signup?.codeLength ?? 6,
          })
        : t('guest.lockSub')

  // Clock and date follow the active language's locale (F2.4).
  const timeStr = now ? formatTime(now) : '--:--'
  const dateStr = now ? formatFullDate(now) : ''

  return (
    // `veil-base` (§3), not `bg-black`: the opaque floor under the backdrop is
    // the same hole as `bg-black/NN` — a black chosen in JSX (F9.7b).
    <div className="veil-base relative flex h-full min-h-dvh w-full overflow-hidden">
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
        Readability veils (§3.1): floor, then two shaping gradients. Directional
        by design — the pie exists to buy contrast *under the clock and the
        card*, not to dim the photograph, which is already graded dark.

        The densities used to live here as inline `style` gradients and now live
        in `globals.css` (`.veil-login-*`, F9.2), where the reasoning behind
        every stop is written down and where the third screen with a background
        medium can reuse them instead of re-eyeballing them. Order is meaningful:
        these composite in DOM order.
      */}
      <div aria-hidden className="veil-login-floor absolute inset-0" />
      <div aria-hidden className="veil-login-h absolute inset-0" />
      <div aria-hidden className="veil-login-v absolute inset-0" />
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
          {/* Eyebrow: the rule now fades out of the primary instead of being a
              flat 60 % bar, which matches the hairline treatment on the card. */}
          <span className="label-mono flex items-center gap-2.5 text-[11px] text-primary/90">
            <span className="h-px w-8 bg-gradient-to-r from-primary/15 to-primary" />
            {t('auth.localTime')}
          </span>
          {/* Sized between the original 7/9rem slab (too wide — it ran into the
              card column) and the 4.75/6rem correction (too timid to lead the
              screen). Seconds were dropped: a lock screen is read at a glance,
              and a live 1 Hz digit next to a breathing tube was two competing
              rhythms. */}
          <span className="neon-digits font-clock text-[5.75rem] font-semibold leading-[0.85] tabular-nums text-text-high xl:text-[7.5rem]">
            {timeStr}
          </span>
          {/* The date used to be plain 18px body text, which read as a caption
              from a different design system sitting under a neon sign. Same
              mono/uppercase/tracked language as the eyebrow above ties the
              three lines into one lockup, and a soft dark shadow keeps it
              legible over the brighter patches of the backdrop. */}
          <span className="label-mono text-[13px] leading-relaxed text-text-medium [text-shadow:0_1px_10px_rgba(0,0,0,0.75)] xl:text-sm">
            {dateStr}
          </span>
        </motion.div>

        {/* Station strip (C1.6) — the seat's own readout. The five hardcoded
            chips that used to sit here are now one component reading the club
            (`GET /api/club/station`) and the station agent, so this screen can
            no longer claim a seat is free while an admin has it in maintenance. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        >
          <StationPanel />
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
          // T1 (§4.2) — this screen's one traveling ring. Everything else here
          // (station badge, five telemetry chips) is T2 static, so the moving
          // light points at the only thing you can act on: the way in.
          // Kept on idle even though the attract overlay spends its own T1 on
          // the wake hint: the budget is one per *visible* screen, and for the
          // 1.2s cross-fade both are in the tree on purpose. Dropping the class
          // when `idle` flips would pop the card's brightest feature off while
          // the card itself is still half-opaque — a rule tidier than the
          // screen, which F9 forbids.
          className={`neon-ring relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0a0b10]/40 shadow-[0_32px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${idle ? 'pointer-events-none' : ''}`}
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
              {/* Was `PC-17 · Online` with a hardcoded green dot — the header
                  stating a fact the strip below it now reads from the club, and
                  free to contradict it. `StationBadge` reads the same
                  `useSeatStatus` the chip does, so the two lines cannot disagree. */}
              <StationBadge />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={
                  blocked
                    ? 'seat-taken'
                    : recovery
                    ? `recovery-${recovery.step}`
                    : mode === 'register' && signup
                      ? `register-${signup.step}`
                      : mode
                }
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
                  {subline}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ------- mode switch : segmented tabs ------- */}
            {/* Was a hand-rolled track with its own `layoutId` pill. `Segmented`
                (F1.6) owns that geometry now, including the reduced-motion
                escape the local copy never had, and it renders a real
                `radiogroup` instead of two `aria-pressed` buttons. */}
            {/* Three segments, not two: the walk-in door is a peer of the two
                member doors, not a footnote under the form (C1.2). `size="sm"`
                because the third label is what broke the `md` track — LT renders
                the pair as "Prisijungti / Registracija", and at 12 px with
                0.14em tracking three uppercase segments wrapped inside a
                448 px card (F2.6 again). */}
            {/* Hidden while recovering (C1.3): the flow owns the card, and a live
                switcher would offer two committing paths at once — tapping
                "Register" mid-code would drop a challenge the player is halfway
                through without ever saying so. The way back is the flow's own
                "Back to sign in". */}
            {/* Same reasoning for the signup code step (C1.4): a live challenge
                is halfway through, and tapping "Sign in" mid-code would throw it
                away silently. The way back is the flow's own "Change details" /
                "Back to sign in". */}
            {/* And gone entirely while the seat is held (C1.7): the three doors
                all lead to the same chair, so offering them would invite the
                player to try the other two against the same hold. */}
            {!blocked && !recovery && signup?.step !== 'code' && (
              <Segmented<Mode>
                className="mt-6"
                size="sm"
                label={t('auth.accessTerminal')}
                options={[
                  { value: 'login', label: t('auth.signIn') },
                  { value: 'register', label: t('auth.register') },
                  { value: 'guest', label: t('guest.badge') },
                ]}
                value={mode}
                onChange={switchMode}
              />
            )}
          </div>

          {/* ------- form body ------- */}
          <div className="relative z-[2] p-7 pt-5">
            <AnimatePresence mode="wait">
              {blocked ? (
                /* The seat is held by somebody else's live session (C1.7). The
                   panel names the occupant and re-checks; the way past it is an
                   admin with a key, which is why there is no third button. */
                <SeatTaken
                  key="seat-taken"
                  holder={blocked.holder}
                  onRecheck={() => heldBy(blocked.userId)}
                  onFreed={blocked.enter}
                  onStillHeld={(holder) => setBlocked({ ...blocked, holder })}
                  onCancel={() => setBlocked(null)}
                  onToast={toast}
                  onReject={triggerShake}
                />
              ) : recovery ? (
                <PasswordRecovery
                  key="recovery"
                  initialEmail={identifier.includes('@') ? identifier : ''}
                  step={recovery.step}
                  onStateChange={setRecovery}
                  onCancel={() => setRecovery(null)}
                  onSuccess={finishRecovery}
                  onToast={toast}
                  onReject={triggerShake}
                />
              ) : mode === 'login' ? (
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
                    onValueChange={setIdentifier}
                    placeholder={t('auth.userOrEmailPlaceholder')}
                    error={touched ? loginErrors.identifier : undefined}
                    autoComplete="username"
                    autoFocus
                  />
                  <Field
                    label={t('auth.password')}
                    icon={<icons.lock size={15} />}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onValueChange={setPassword}
                    placeholder={t('auth.passwordPlaceholder')}
                    error={touched ? loginErrors.password : undefined}
                    autoComplete="current-password"
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

                  {/* Sits under the field it repairs and is right-aligned, so it
                      reads as a footnote to the password rather than a second
                      way in. Ghost/plain, `-mt-1`: the row it opens is a repair,
                      and only the bevelled CTA below commits (§4). */}
                  <Button
                    variant="ghost"
                    size="sm"
                    voice="plain"
                    onClick={startRecovery}
                    disabled={loading}
                    className="-mt-1 self-end px-0 text-text-low hover:bg-transparent hover:text-text-high"
                  >
                    {t('auth.forgotPassword')}
                  </Button>

                  {/* The one bevelled CTA of the screen (§4) — `cut` is reserved
                      for the single action that commits. */}
                  <Button type="submit" size="lg" block cut loading={loading}>
                    {t('auth.unlock')}
                  </Button>

                  <div className="my-1 flex items-center gap-3 text-text-low">
                    <span className="h-px flex-1 bg-border" />
                    <span className="label-mono text-[10px]">{t('auth.orContinue')}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <OptionButton
                      onClick={() => setQrOpen(true)}
                      icon={icons.qr}
                      label={t('auth.qrLogin')}
                      disabled={loading}
                    />
                    <OptionButton
                      onClick={demoLogin}
                      icon={icons.demo}
                      label={t('auth.demo')}
                      disabled={loading}
                    />
                    <OptionButton
                      onClick={demoAdmin}
                      icon={icons.staff}
                      label={t('auth.admin')}
                      disabled={loading}
                    />
                  </div>

                  {/* Walk-in check-in — opens the guest surface of the same
                      launcher shell, not a separate app (F6.2 / F6.8). */}
                  <Button
                    variant="ghost"
                    size="sm"
                    voice="plain"
                    onClick={startGuest}
                    disabled={loading}
                    iconLeft={<icons.guest size={14} />}
                    className="mt-1 self-center text-text-low hover:bg-transparent hover:text-text-high"
                  >
                    {t('guest.continueAsGuest')}
                  </Button>
                </motion.form>
              ) : mode === 'register' && signup ? (
                /* The whole signup, including the emailed code step, lives in
                   `Registration` (C1.4): the card keeps the header and the
                   shake, the flow keeps the fields, the challenge and the two
                   deadlines. */
                <Registration
                  key="register"
                  step={signup.step}
                  onStateChange={setSignup}
                  onCancel={() => switchMode('login')}
                  onSuccess={finishSignup}
                  onToast={toast}
                  onReject={triggerShake}
                />
              ) : (
                <GuestPanel key="guest" />
              )}
            </AnimatePresence>
          </div>

          {/* ------- card footer strip ------- */}
          {/* Firmware strip — a plate on the card, so `pill` (§3.3). */}
          <div className="pill relative z-[2] flex items-center justify-end border-t border-border px-7 py-3">
            <span className="label-mono text-[9px] text-text-low">
              {t('common.shell')} v2.4
            </span>
          </div>
        </motion.div>

        {/* mobile clock + station */}
        <div className="mt-8 flex items-center gap-4 lg:hidden">
          <span className="font-clock text-3xl font-semibold tabular-nums text-text-high">{timeStr}</span>
          {/* `compact`: on a phone the six-chip strip wraps into three lines of
              noise, and the one fact a player needs there is whether the seat is
              theirs to take. */}
          <StationPanel variant="compact" />
        </div>
      </div>

      {/* Idle attract mode overlay */}
      <AnimatePresence>{idle && <AttractMode />}</AnimatePresence>

      <QrLogin
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        onSuccess={finishQr}
        onToast={toast}
      />
    </div>
  )
}

/**
 * "Guest" tab of the access terminal (C1.2).
 *
 * The walk-in has nothing to type, so this panel is not a form: it is the one
 * place in the client that explains the PostPaid model before anybody owes
 * money — admin opens the visit, minutes and orders pile onto one tab, the tab
 * is settled at the counter. Stage 2 builds the machinery, so the CTA is
 * deliberately dead and *says* it is ("soon") rather than throwing `forbidden`
 * at a guest who tapped it: an error toast would blame the guest for a feature
 * that does not exist yet.
 *
 * The live walk-in check-in still hangs under the sign-in form as a quiet ghost
 * button until `C1.9` reworks that row and moves the real call up here.
 */
function GuestPanel() {
  const { t } = useT()

  const steps = [
    { icon: icons.staff, text: t('guest.flowStep1') },
    { icon: icons.bill, text: t('guest.flowStep2') },
    { icon: icons.payment, text: t('guest.flowStep3') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {/* A well (§3.3): explanatory copy sits *in* the card, not on another
          panel floating above it. */}
      <div className="well flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="label-mono flex items-center gap-2 text-[10px] text-text-medium">
            <icons.timer size={12} className="text-primary" />
            {t('guest.flowTitle')}
          </span>
          {/* Status plate, so `pill` + a warning tone: the feature is announced,
              not broken (§3.3). */}
          <span className="label-mono rounded-sm border border-warning/30 bg-warning/12 px-2 py-0.5 text-[9px] text-warning">
            {t('guest.soon')}
          </span>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <IconTile icon={s.icon} variant="muted" size="sm" />
              <span className="flex-1 pt-1 text-pretty text-xs leading-relaxed text-text-medium">
                {s.text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-pretty text-xs leading-relaxed text-text-low">{t('guest.soonNote')}</p>

      {/* Same slot and height as the two forms' CTA, but *not* `cut` and not
          primary: the bevel is the screen's one committing action (§4), and a
          45 %-opacity red slab still reads as pressable. A dead control should
          look dead. `C1.9` promotes this to `primary cut` with the real call. */}
      <Button
        size="lg"
        variant="secondary"
        block
        disabled
        iconLeft={<icons.guest size={18} />}
      >
        {t('guest.startVisit')}
      </Button>
    </motion.div>
  )
}

/**
 * Tertiary way-in tile — icon over label, three to a row under the CTA.
 *
 * A composition, not a component: `Button` supplies the frame, the focus ring
 * and the `stack` layout, `IconTile` the framed glyph. `voice="plain"` is the
 * F2.6 fix — LT renders `admin` as "Administratorius", and tracked uppercase
 * made that three lines in a ~90 px cell.
 */
function OptionButton({
  onClick,
  icon,
  label,
  disabled,
}: {
  onClick: () => void
  icon: LucideIcon
  label: string
  disabled?: boolean
}) {
  return (
    <Button
      variant="secondary"
      voice="plain"
      stack
      onClick={onClick}
      disabled={disabled}
      className="h-auto px-2 text-[11px] leading-tight text-text-medium hover:text-text-high"
    >
      <IconTile
        icon={icon}
        variant="primary"
        size="sm"
        className="transition-all group-hover/button:border-primary/60 group-hover/button:bg-primary/20"
      />
      {label}
    </Button>
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
