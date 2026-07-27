/**
 * `session` slice (F6.3) — the billed clock, anchored to timestamps.
 *
 * The rule this slice exists to enforce: **nothing here ever subtracts a second
 * from a counter.** The visit is stored as two absolute anchors —
 *
 *   • `expiresAt`   — when prepaid time runs out (server deadline),
 *   • `runningSince` — when the current postpaid span started,
 *
 * — and `syncClock()` re-derives the displayed number from them. That is the
 * whole point of F6.3: a decrementing variable loses seconds whenever the tab is
 * backgrounded, the frame rate drops or the machine sleeps, and the player ends
 * up believing a number the club does not agree with. Re-deriving cannot drift,
 * because the answer does not depend on how many times we asked.
 *
 * Two billing models share these anchors (MVP §3.2), and they run in opposite
 * directions:
 *
 *   • **prepaid** (member) — counts *down* to `expiresAt`. Hitting zero ends the
 *     visit.
 *   • **postpaid** (walk-in guest) — counts *up* from `runningSince`, and every
 *     billed minute lands on the open tab. A guest cannot "run out": they owe
 *     more. Before F6.3 the guest inherited the member's decrement, so the shell
 *     showed a walk-in burning down prepaid hours nobody had sold them.
 *
 * `sessionSeconds` is a *cache of the derivation*, not the source of truth: the
 * single interval in `session-manager.tsx` writes it so React can re-render each
 * second. Its meaning follows the billing mode — seconds left when prepaid,
 * seconds used when postpaid.
 */
import { remainingSeconds, secondsSince, secondsToMinutes } from '@/lib/time'
import type { ISODateTime, Seconds } from '@/lib/types/common'
import type { BillingMode, SessionSnapshot } from '@/lib/types/session'
import type { SliceCreator } from '../types'

/** Length of a prepaid session sold at the counter. */
export const SESSION_LENGTH = 2 * 60 * 60

/**
 * Walk-in rate. Mock economy until C6 prices the tab from club settings; kept
 * here because the *billing mode* owns it, and in whole cents per whole minute
 * so no float ever touches money (F3.6).
 */
export const POSTPAID_CENTS_PER_MINUTE = 5

/**
 * What the elapsed time on a postpaid seat costs so far.
 *
 * Billed minutes are rounded **up** (`secondsToMinutes`): a guest who sat down
 * 61 seconds ago owes two minutes, which is how the counter charges and
 * therefore what the shell must show.
 */
export function timeChargeCents(secondsUsed: Seconds): number {
  return secondsToMinutes(secondsUsed) * POSTPAID_CENTS_PER_MINUTE
}

export interface SessionSlice {
  billingMode: BillingMode
  /** Absolute deadline for prepaid time. `null` while paused — and always for postpaid. */
  expiresAt: ISODateTime | null
  /** Start of the current running span. Used by postpaid, `null` while paused. */
  runningSince: ISODateTime | null
  /** Server stamp paired with the anchors above; enables clock-skew correction. */
  serverTime: ISODateTime | null
  /**
   * The value carried across a pause: seconds *left* when prepaid, seconds
   * *used* when postpaid. Re-anchored into a timestamp on resume.
   */
  bankedSeconds: Seconds
  timerRunning: boolean
  sessionExpired: boolean
  /** Derived cache written by `syncClock()`. Never decremented by hand. */
  sessionSeconds: Seconds

  /** Fresh visit on the given billing model. */
  startSession: (mode: BillingMode) => void
  /** Lock PC — the visit survives, the clock does not run. */
  pauseSession: () => void
  /** Unlock — re-anchor and resume, unless prepaid time is already spent. */
  resumeTimer: () => void
  /** Full prepaid clock, stopped: the state a free station is in. */
  resetSession: () => void
  /** Re-read the clock from the anchors. The one interval calls this. */
  syncClock: () => void
  /**
   * Adopt server truth (`time.added`, `session.resumed`, the heartbeat).
   * The single write path Stage 4 needs, so a granted 15 minutes moves the
   * deadline instead of patching a counter.
   */
  applySnapshot: (snapshot: SessionSnapshot) => void
  expireSession: () => void
  /** Acknowledge the expiry screen and hand the station back to the club. */
  clearExpired: () => void
}

/** Seconds on the clock right now, derived — down for prepaid, up for postpaid. */
function derive(s: {
  billingMode: BillingMode
  timerRunning: boolean
  expiresAt: ISODateTime | null
  runningSince: ISODateTime | null
  serverTime: ISODateTime | null
  bankedSeconds: Seconds
}): Seconds {
  if (!s.timerRunning) return s.bankedSeconds
  if (s.billingMode === 'postpaid') return s.bankedSeconds + secondsSince(s.runningSince)
  // Skew-corrected against the stamp the deadline arrived with, so a kiosk with a
  // wrong system clock still counts the time it was sold.
  return remainingSeconds({
    expiresAt: s.expiresAt,
    serverTime: s.serverTime,
    fallbackSeconds: s.bankedSeconds,
  })
}

const nowIso = (): ISODateTime => new Date().toISOString()

/** Anchors for a running span, from a banked value. */
function anchor(mode: BillingMode, banked: Seconds) {
  const now = nowIso()
  return mode === 'postpaid'
    ? { expiresAt: null, runningSince: now, serverTime: now }
    : {
        expiresAt: new Date(Date.now() + banked * 1000).toISOString(),
        runningSince: null,
        serverTime: now,
      }
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  billingMode: 'prepaid',
  expiresAt: null,
  runningSince: null,
  serverTime: null,
  bankedSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,
  sessionSeconds: SESSION_LENGTH,

  startSession: (mode) => {
    // A prepaid visit opens with the hours it bought; a postpaid one opens at
    // zero used, because nothing has been owed yet.
    const banked = mode === 'prepaid' ? SESSION_LENGTH : 0
    set({
      billingMode: mode,
      bankedSeconds: banked,
      sessionSeconds: banked,
      timerRunning: true,
      sessionExpired: false,
      ...anchor(mode, banked),
    })
  },

  // Banking the derived value is what makes a pause lossless: the anchors are
  // dropped, so a paused visit has no deadline to drift against.
  pauseSession: () => {
    const banked = derive(get())
    set({
      bankedSeconds: banked,
      sessionSeconds: banked,
      timerRunning: false,
      expiresAt: null,
      runningSince: null,
    })
  },

  resumeTimer: () => {
    const { billingMode, bankedSeconds, sessionExpired } = get()
    // Prepaid with nothing left must not resume — the seat owes the club money,
    // not the other way round. Postpaid always can: it only accrues.
    if (sessionExpired || (billingMode === 'prepaid' && bankedSeconds <= 0)) {
      set({ timerRunning: false })
      return
    }
    set({ timerRunning: true, ...anchor(billingMode, bankedSeconds) })
  },

  resetSession: () =>
    set({
      billingMode: 'prepaid',
      bankedSeconds: SESSION_LENGTH,
      sessionSeconds: SESSION_LENGTH,
      timerRunning: false,
      sessionExpired: false,
      expiresAt: null,
      runningSince: null,
      serverTime: null,
    }),

  syncClock: () => {
    const state = get()
    if (!state.timerRunning) return
    const value = derive(state)

    // Only prepaid time can run out. A guest reaching two hours owes for two
    // hours; ending their visit on a timer would be the shell inventing a limit
    // the club never sold.
    if (state.billingMode === 'prepaid' && value <= 0) {
      set({ sessionSeconds: 0, bankedSeconds: 0 })
      get().expireSession()
      return
    }
    // Guard the write so a 1 Hz interval does not wake every subscriber when the
    // visible second has not actually changed (waking from sleep, fast resyncs).
    if (value !== state.sessionSeconds) set({ sessionSeconds: value })
  },

  applySnapshot: (snapshot) => {
    const running = snapshot.state === 'active'
    const postpaid = snapshot.billingMode === 'postpaid'
    // Both modes read the number they *display* out of the snapshot, and they
    // are different numbers: prepaid shows what is left, postpaid shows what has
    // been run up. On a walk-in seat nothing is granted, so every billed second
    // is already in `debtSeconds` — the same figure the counter settles.
    const banked = postpaid ? snapshot.debtSeconds : snapshot.secondsLeft
    set({
      billingMode: snapshot.billingMode,
      expiresAt: running && !postpaid ? snapshot.expiresAt : null,
      runningSince: running && postpaid ? snapshot.serverTime : null,
      serverTime: snapshot.serverTime,
      bankedSeconds: banked,
      sessionSeconds: banked,
      timerRunning: running,
      sessionExpired: snapshot.state === 'ended',
    })
  },

  expireSession: () => set({ timerRunning: false, sessionExpired: true }),

  // Expiry ends the visit, so it reuses the one teardown path instead of a
  // second, slightly different reset that would inevitably drift from `logout`.
  clearExpired: () => {
    set({ sessionExpired: false })
    get().logout()
  },
})
