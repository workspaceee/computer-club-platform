'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
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
import { SessionPaused, formatRemainder } from '@/components/auth/session-paused'
import { BrandLabel } from '@/components/brand-label'
import { IconTile } from '@/components/icon-tile'
import { Button, IconButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { LangSwitcher } from '@/components/lang-switcher'
import { StationBadge, StationPanel } from '@/components/station-panel'
import { QrLogin } from '@/components/auth/qr-login'
import { Segmented } from '@/components/ui/segmented'
import { DEV_SHORTCUTS } from '@/lib/dev-flags'
import { useIdle } from '@/hooks/use-idle'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import {
  ApiError,
  continueAsGuest,
  fetchPausedVisit,
  fetchStationHolder,
  login,
  loginAsDemo,
  type AuthResult,
  type PausedVisit,
  type StationHolder,
} from '@/lib/mock/api'
import type { SessionSnapshot } from '@/lib/types/session'
import { claimSeat, type Arrival } from '@/lib/seat'
import { useStore } from '@/lib/store'
import type { ID } from '@/lib/types/common'

/**
 * The three doors of the terminal (C1.2).
 *
 * `guest` is the walk-in door — the entry into the stage-2 PostPaid flow, where
 * an admin opens the visit, the clock runs *up* and the money lands on an open
 * tab settled at the counter. Stage 2 owns the machinery, so the tab ships as an
 * explained stub: it teaches the model and names its state ("soon") instead of
 * pretending to check anyone in.
 *
 * It stays a stub after C1.9, and that is the honest reading of MVP §8.1: the
 * *admin* hands a walk-in their time, so a client that could check itself in
 * would be inventing a product feature. The working check-in this prototype
 * needs to be demonstrable therefore moved where the demo account already
 * lives — behind `DEV_SHORTCUTS`, below the sign-in form.
 */
type Mode = 'login' | 'register' | 'guest'

/** Idle time before the attract mode kicks in (ms). */
const IDLE_TIMEOUT_MS = 30_000

/**
 * How long the screen keeps asking whether a paused visit is parked here (C1.10).
 *
 * Six tries, ~800 ms apart — about five seconds. Long enough to outlast the pause
 * write that "Lock PC" fires as this screen mounts (and a slow club link on top of
 * it), short enough that a genuinely free station is not polled all night.
 */
const PAUSED_READ_ATTEMPTS = 6
const PAUSED_READ_GAP_MS = 800

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
  // The clock adopts server truth after a PIN unlock (C1.10) — the same write
  // path the heartbeat and `time.added` use, so a resumed visit cannot end up
  // with a remainder the club does not agree with (F6.3).
  const applySnapshot = useStore((s) => s.applySnapshot)
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
     * The *arrival*, not the holder — a walk-in carries a `guestId` and no
     * account. The re-check has to ask the same question the gate asked and then
     * claim the seat as the same person, and both answers depend on who is
     * standing here.
     */
    arrival: Arrival
    enter: () => void
  } | null>(null)
  /**
   * The paused visit this station is holding for its own player (C1.10).
   *
   * Read once per lock screen rather than subscribed to: the row is *this*
   * station's, so the only thing that can change it while the screen is up is an
   * admin's key or the PIN typed on this keyboard — and both of those come back
   * as the answer to a request the screen already makes.
   *
   * `null` covers every seat this door cannot open: an empty station, a live
   * (unpaused) session, a walk-in with no account, a member with no PIN on file.
   * All of them get the ordinary sign-in form, and the seat check of C1.7 still
   * stands behind it.
   */
  const [paused, setPaused] = useState<PausedVisit | null>(null)
  /**
   * The player would rather use their password — or the PIN budget is spent.
   *
   * A separate flag instead of clearing `paused`, because the visit is still
   * there: whoever signs in has to be admitted against it (C1.7), and forgetting
   * it here would let the screen believe the chair is free.
   */
  const [pinDismissed, setPinDismissed] = useState(false)
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
   * Two steps, and both are needed. The read above names the occupant, which is
   * the only thing that can be *shown*; the write below is what actually decides
   * — `claimSeat` opens (or adopts) the session row on this machine, and the
   * server refuses when somebody else is on it. Without the write, "occupied"
   * would be a fixture the client politely believed and two arrivals could win
   * the same chair by reading it at the same moment.
   *
   * `enter` is only called once the seat is *ours*, so the welcome toast and the
   * screen swap stay together — a player told "Welcome back" and then shown a
   * "station is in use" panel would read the second screen as a bug.
   */
  const admit = async (arrival: Arrival, enter: () => void) => {
    const holder = await heldBy(arrival.userId)
    if (holder) {
      // The card stops spinning: nothing else is in flight, and the panel that
      // replaces the form has its own action.
      setLoading(false)
      setBlocked({ holder, arrival, enter })
      return
    }

    const claim = await claimSeat(arrival)
    if (!claim.granted) {
      setLoading(false)
      // Lost the race in the gap between the read and the write. With a name it
      // is the same dead end as before, so it gets the same panel; without one
      // there is nothing honest to print on a card whose whole job is to say
      // *whose* session this is, so the refusal stays a toast over the form.
      if (claim.holder) setBlocked({ holder: claim.holder, arrival, enter })
      else {
        triggerShake()
        toast('error', t('errors.conflict'))
      }
      return
    }

    enter()
  }

  /**
   * Ask the station, once per lock screen, whether it is holding a visit for
   * somebody who can come back (C1.10).
   *
   * Deliberately *not* read from the store. The store still remembers the member
   * who locked the machine — `lockPc` keeps the visit — and trusting that would
   * make the PIN door appear on a client that merely has a stale player in
   * memory. The seat's own row is the only thing that can say a paid visit is
   * really parked here, and it is also the only thing that knows the remainder:
   * the same read is what a *second* client (an admin's tablet, a reopened tab)
   * would get, and both have to agree about whose time is on this machine.
   *
   * A failed read is not a paused visit: the form stays, which is the same
   * fallback the seat check uses when the club cannot be reached.
   *
   * Why it asks more than once. "Lock PC" swaps the screen *immediately* and
   * reports the pause in the background (`holdSeat`, deliberately not awaited —
   * the player is waiting to see the station lock, not a spinner), so this screen
   * mounts while the seat is still settling and the very first read can honestly
   * answer "active". A single attempt would therefore lose the PIN door on the
   * one path that matters most. The window is short and bounded: it closes as
   * soon as a visit appears, and a station that is simply free stops asking
   * instead of polling the club forever.
   */
  useEffect(() => {
    let alive = true
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const read = async () => {
      attempts += 1
      const visit = await fetchPausedVisit().catch(() => null)
      if (!alive) return
      if (visit) {
        setPaused(visit)
        return
      }
      if (attempts < PAUSED_READ_ATTEMPTS) timer = setTimeout(() => void read(), PAUSED_READ_GAP_MS)
    }

    void read()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  /**
   * The PIN was right: the account and the *restarted* visit arrive together.
   *
   * Both writes are needed and in this order. `loginSuccess` is the one door
   * every arrival goes through — it swaps the screen, restores the wallet and
   * decides whether this is a returning player — and `applySnapshot` then hands
   * the clock the server's anchors, so the launcher counts the club's remainder
   * rather than whatever the store happened to have banked. Without the
   * snapshot, a station whose store was reset (a reload while paused) would open
   * the launcher with a fresh two hours nobody paid for.
   */
  const finishPin = (session: AuthResult, snapshot: SessionSnapshot) => {
    setPaused(null)
    loginSuccess(session.profile)
    applySnapshot(snapshot)
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
      await admit({ userId, guestId: null }, () => {
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
    await admit({ userId, guestId: null }, () => {
      toast('success', t('auth.accountCreatedToast', { name: profile.nickname }))
      // A brand-new profile keeps the language picked on this station.
      loginSuccess({ ...profile, lang })
    })
  }

  /**
   * The demo account (dev only, C1.9).
   *
   * A password-less way into a seeded member profile, which is a review tool and
   * not a door of the club: on a station standing in a real club it would be an
   * account anybody can take. `DEV_SHORTCUTS` keeps the button — and this call
   * with it — out of a production build.
   */
  const demoLogin = async () => {
    setLoading(true)
    try {
      const { profile, userId } = await loginAsDemo()
      await admit({ userId, guestId: null }, () => {
        toast('info', t('auth.enteringDemo'))
        loginSuccess(profile)
      })
    } catch (err) {
      setLoading(false)
      reportError(err)
    }
  }

  /**
   * Walk-in check-in (dev only, C1.9).
   *
   * The admin panel is a separate application, so the client used to carry an
   * "Admin" tile that only ever explained its own absence — a door painted on a
   * wall. It is gone; nothing here replaces it, because the way a walk-in gets
   * time is an admin at the counter (MVP §8.1) and stage 2 delivers that as a
   * pushed `session.started` event rather than a button on this screen.
   *
   * Until then the prototype still has to be walkable end to end, so this call
   * survives as a dev shortcut: it opens a real guest visit and lands on the
   * guest surface of the launcher. `guestCheckoutEnabled` can be off, so the
   * failure path is a normal API error, not a silently dead button.
   */
  const startGuest = async () => {
    setLoading(true)
    try {
      const { guestId, label } = await continueAsGuest()
      // A walk-in has no account, so nothing can match the holder: `null` means
      // *any* live session on this seat blocks them (C1.7). Which is the point —
      // the visit they were handed is exactly the second one nobody wants opened
      // on top of the first.
      await admit({ userId: null, guestId }, () => {
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
    await admit({ userId, guestId: null }, () => loginSuccess(profile))
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
    await admit({ userId, guestId: null }, () => {
      toast('success', t('auth.welcomeBackToast', { name: profile.nickname }))
      loginSuccess(profile)
    })
  }

  /**
   * Is the card the PIN door right now?
   *
   * One expression, read by the header, the switcher and the body, because the
   * three must never disagree: a "Session on pause" headline over a password form
   * would tell the player the wrong thing about what the keyboard does next.
   *
   * A held seat outranks it — `blocked` only happens *after* somebody signed in,
   * and at that point the card is about the chair.
   */
  const pinCard = paused !== null && !pinDismissed && !blocked

  // Headline is split in two so the accent word can be highlighted where the
  // language has one; EN → "Welcome back", RU/LT → single phrase (F2.6).
  // A live recovery outranks the mode: the card body belongs to the flow, so the
  // one headline over it has to name the *step*, not the door it came from.
  const headline = useMemo(() => {
    // A held seat outranks everything, including a live flow: the player is past
    // authentication and the card is now about the *chair*, not the door (C1.7).
    if (blocked) return { lead: t('auth.seatTaken'), accent: t('auth.seatTakenHi') }
    // The seat is holding *this* player's own paused visit, so the card is not a
    // login at all: it names the state of the visit and asks for a PIN (C1.10).
    if (pinCard) return { lead: t('auth.sessionPaused'), accent: t('auth.sessionPausedHi') }
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
  }, [blocked, pinCard, mode, recovery, signup, t])

  const subline = blocked
    ? // The whole sentence, holder's name included, lives in the subline: the
      // panel below states *who and since when*, and printing the instruction
      // twice on one card would make the second copy look like a different rule.
      t(seatTakenBody(blocked.holder), { name: blocked.holder.holder })
    : pinCard && paused
    ? // The remainder is stated here, in words, and *again* as a clock in the
      // panel below — the one place in this screen where a fact is printed twice
      // on purpose: the sentence is what a player reads, the clock is what they
      // check. Both come from the same server number, so they cannot disagree.
      t('auth.sessionPausedSub', {
        name: paused.holder,
        time: formatRemainder(paused.secondsLeft),
      })
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
                    : pinCard
                    ? 'session-paused'
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
            {/* And gone while the PIN door is up (C1.10): the visit parked on this
                seat is one player's, so offering "Register" or the walk-in door
                next to it would invite somebody to open a second visit on top of
                paid time that is still running out. The way past it is the PIN,
                or the panel's own "Use password instead". */}
            {!blocked && !pinCard && !recovery && signup?.step !== 'code' && (
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
                  onRecheck={() => heldBy(blocked.arrival.userId)}
                  /* Not `blocked.enter` directly: the chair being empty is not
                     the same as it being *ours*, and between the two there is a
                     write. Going back through the gate is what claims it — and
                     what re-blocks the panel, with the new name, if somebody
                     took the seat while this player was walking back from the
                     counter. */
                  onFreed={() => void admit(blocked.arrival, blocked.enter)}
                  onStillHeld={(holder) => setBlocked({ ...blocked, holder })}
                  onCancel={() => setBlocked(null)}
                  onToast={toast}
                  onReject={triggerShake}
                />
              ) : pinCard && paused ? (
                /* This station is holding its own player's paused visit (C1.10).
                   Not a login: the card states whose time is parked here and how
                   much of it is left, and asks for four digits. */
                <SessionPaused
                  key="session-paused"
                  visit={paused}
                  onSuccess={finishPin}
                  /* The visit ended or somebody else picked it up while this
                     screen was open. The PIN has nothing left to unlock, so the
                     door closes and the screen becomes an ordinary lock screen —
                     with the toast that says why, because the card the player was
                     typing into is about to disappear under them. */
                  onGone={(message) => {
                    setPaused(null)
                    setPinDismissed(false)
                    toast('info', t(message))
                  }}
                  onUsePassword={() => setPinDismissed(true)}
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

                  {/* Assist row — the two things a player can reach for *without*
                      leaving the password pair, kept on one hairline-separated
                      line directly under the fields.

                      QR sits left (an alternative way in, so it leads the row and
                      carries the only tinted glyph here) and recovery sits right,
                      still a footnote to the field above it. Both are ghost/plain:
                      the bevelled CTA below is the one action that commits (§4).

                      This replaces the "or continue with" divider plus a
                      full-width QR row. With the admin tile gone and demo fenced
                      off (C1.9), a divider announced a section of one and the row
                      under it read as a second CTA competing with Unlock — while
                      costing ~70 px on a 720p station. Folded into the line that
                      already existed, QR reads as part of the card. */}
                  <div className="-mt-1 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      voice="plain"
                      onClick={() => setQrOpen(true)}
                      disabled={loading}
                      iconLeft={<icons.qr size={14} className="text-primary" />}
                      className="px-0 text-text-medium hover:bg-transparent hover:text-text-high"
                    >
                      {t('auth.qrLogin')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      voice="plain"
                      onClick={startRecovery}
                      disabled={loading}
                      className="px-0 text-text-low hover:bg-transparent hover:text-text-high"
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>

                  {/* The one bevelled CTA of the screen (§4) — `cut` is reserved
                      for the single action that commits. */}
                  <Button type="submit" size="lg" block cut loading={loading}>
                    {t('auth.unlock')}
                  </Button>

                  {/*
                    Prototype shortcuts, fenced off (C1.9).

                    Both of these skip something the product does not let anyone
                    skip — a password, or the admin who opens a walk-in's visit —
                    so they are review tools standing next to the real doors, and
                    a reviewer has to be able to tell which is which at a glance.
                    Hence the dashed hairline and the "dev only" plate. The
                    shortcuts share the ghost/plain shape of the assist row
                    above, so the *dashed* rule and the warning plate — not the
                    button style — are what separate a review tool from a real
                    door. The label stays untranslated on purpose: this block
                    never reaches a player, so it never reaches the dictionaries
                    either.

                    A hairline and not a box: a card that already runs long on a
                    720p station cannot spend 24 px of padding on scaffolding.

                    `DEV_SHORTCUTS` is a build-time constant, so production drops
                    the branch instead of hiding it.
                  */}
                  {DEV_SHORTCUTS && (
                    <div className="mt-1 flex flex-col gap-1.5 border-t border-dashed border-border pt-3">
                      <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
                        <icons.warning size={11} className="text-warning" />
                        dev only
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          voice="plain"
                          onClick={demoLogin}
                          disabled={loading}
                          iconLeft={<icons.demo size={14} />}
                          className="text-text-low hover:bg-transparent hover:text-text-high"
                        >
                          {t('auth.demo')}
                        </Button>
                        {/* Opens the guest surface of the same launcher shell,
                            not a separate app (F6.2 / F6.8). */}
                        <Button
                          variant="ghost"
                          size="sm"
                          voice="plain"
                          onClick={startGuest}
                          disabled={loading}
                          iconLeft={<icons.guest size={14} />}
                          className="text-text-low hover:bg-transparent hover:text-text-high"
                        >
                          {t('guest.continueAsGuest')}
                        </Button>
                      </div>
                    </div>
                  )}
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
 * C1.9 deliberately left the CTA dead rather than wiring the working check-in
 * into it: per MVP §8.1 the admin is the one who opens a walk-in's visit, so a
 * live "Start a guest visit" here would advertise self check-in as a product
 * feature — and `soonNote`, which sends the guest to the admin on shift, would
 * become a lie printed above a button that does the job itself.
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
          look dead. Stage 2 turns it live, when the visit arrives as a pushed
          `session.started` from the admin rather than as a tap on this card. */}
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
