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
import {
  markSnapshotObserved,
  remainingSeconds,
  secondsSince,
  secondsToMinutes,
} from '@/lib/time'
import type { ISODateTime, Seconds } from '@/lib/types/common'
import type { BillingMode, SessionSnapshot, TimeSource } from '@/lib/types/session'
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
  /**
   * Which pocket the minutes on the clock came out of (C2.2).
   *
   * Server-owned like the clock itself: it arrives in the snapshot and is
   * *replaced* whenever one does, because whatever adds time also decides where
   * the new time came from. An admin grant is the case that makes this a stored
   * field rather than something derived — the seat keeps its billing mode and its
   * deadline moves, so nothing else in this slice records that the extra minutes
   * were a favour rather than a purchase.
   */
  timeSource: TimeSource
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

  /**
   * Minute marks already announced this visit (C2.6) — 15 / 10 / 5 / 1.
   *
   * State, not a ref inside the warning component, for two reasons. The clock is
   * re-*derived* rather than counted (F6.3), so a threshold can be crossed while
   * the tab is backgrounded or the machine asleep: the announcement has to be
   * decided from "has this mark been spoken", never from "did we see it tick past".
   * And the mark has to survive the component unmounting on a screen change — a
   * player who locks and unlocks the station must not be told the same thing twice.
   */
  warnedMinutes: number[]
  /**
   * When the last warning landed, or `null` while nothing is being announced.
   *
   * The HUD reads this to pulse (C2.6). It is a *timestamp* rather than a boolean
   * so two warnings in a row restart the animation instead of leaving a flag that
   * was already true — a 10-minute mark arriving during the 15-minute pulse would
   * otherwise pass unseen.
   */
  warningPulseAt: number | null

  /**
   * Closing marks already announced this visit (C2.11) — 60 / 30 / 10 minutes
   * before the club shuts.
   *
   * A **separate list** from `warnedMinutes`, not extra entries in it, because the
   * two are measured against different clocks: `warnedMinutes` is a remainder the
   * player can buy more of, this one is a wall nobody can move. Sharing one list
   * would also make "60" ambiguous — a 60-minute session mark does not exist, but
   * the next feature that adds one would silently mute the closing announcement.
   *
   * Per visit, like `warnedMinutes`, and for the same reason: the club's closing
   * time does not change when a player locks the station and comes back, so they
   * must not be told about it twice.
   */
  closingWarned: number[]

  /**
   * Fresh visit on the given billing model.
   *
   * `source` is optional because this is the *offline* opening path: when the
   * mock API answered, `applySnapshot` has already named the pocket, and only a
   * visit opened without server truth has to guess. The guess is deliberately the
   * expensive one (`wallet`) — telling a player their minutes are banked pass
   * time when they may be spending euros is the error that costs them money.
   */
  startSession: (mode: BillingMode, source?: TimeSource) => void
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

  /**
   * Record that these minute marks have been announced, and start the HUD pulse.
   *
   * Takes a *list* because a station that was asleep can come back with several
   * marks already behind it: warning about 15 minutes on a seat that now has 4
   * left would be a lie, so the crossed marks are all retired in one write and
   * only the most urgent of them is spoken.
   */
  noteTimeWarning: (minutes: number[]) => void
  /** End the pulse. The warning is over; the colour on the digits carries on. */
  clearWarningPulse: () => void

  /**
   * Record that these closing marks have been announced (C2.11).
   *
   * A list for the same reason `noteTimeWarning` takes one — a station that was
   * asleep can wake with 60, 30 and 10 all behind it, and only the smallest of
   * them is true. Unlike the session marks these are never re-armed: the club's
   * closing time is not something a purchase can push back.
   */
  noteClosingWarning: (minutes: number[]) => void
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

/**
 * Seconds this visit has burned that the **server has not been told about yet**.
 *
 * The one number a client is allowed to report about time (F3.7): the agent says
 * how much *elapsed*, the club does the accounting. Everything else in this slice
 * answers "how much is left"; this answers "how much of that has the club not
 * heard".
 *
 * It is derived from the anchors rather than counted, for the same reason the
 * clock is (F6.3) — and, more importantly, because *counting* it is exactly the
 * bug this function replaces. "Lock PC" used to report `SESSION_LENGTH - seconds`
 * for a prepaid seat: the visit's total spent time, on the assumption that the
 * clock had started at the store's own two hours and that nothing had ever been
 * reported. Both halves fail on the path C1.10 is built for. A member who walks
 * back into an adopted visit is anchored from the server's `secondsLeft`, so the
 * difference from `SESSION_LENGTH` is time the row *already* counted — and
 * locking the station charged it a second time. Measured on a real seat: 01:23:51
 * on the launcher clock, 00:47 on the paused card it locked into. Thirty-six
 * minutes destroyed by pressing lock, on the one screen whose whole promise is
 * that the remainder survives.
 *
 * So both modes report the same thing — the span since the last anchor — and it
 * is the same subtraction in each, only phrased in the direction that mode runs:
 *
 *  - **prepaid** — what the server said was left when the snapshot landed
 *    (`expiresAt - serverTime`), minus what is left now.
 *  - **postpaid** — how long the current running span has been running, which is
 *    what `runningSince` was stamped for. The accrued `debtSeconds` that came
 *    with the snapshot is *not* included: the row already has it.
 *
 * Zero while paused (a stopped clock burns nothing) and zero for a prepaid seat
 * with no deadline to measure against. Under-reporting is the safe direction: an
 * unreported second is time the club has not billed, while an over-reported one
 * is time a player paid for and lost.
 */
export function unreportedSeconds(s: {
  billingMode: BillingMode
  timerRunning: boolean
  expiresAt: ISODateTime | null
  runningSince: ISODateTime | null
  serverTime: ISODateTime | null
  bankedSeconds: Seconds
}): Seconds {
  if (!s.timerRunning) return 0
  if (s.billingMode === 'postpaid') return secondsSince(s.runningSince)
  const deadline = Date.parse(s.expiresAt ?? '')
  const stamped = Date.parse(s.serverTime ?? '')
  if (Number.isNaN(deadline) || Number.isNaN(stamped)) return 0
  const atAnchor = Math.max(0, Math.floor((deadline - stamped) / 1000))
  return Math.max(0, atAnchor - derive(s))
}

const nowIso = (): ISODateTime => new Date().toISOString()

/** Anchors for a running span, from a banked value. */
function anchor(mode: BillingMode, banked: Seconds) {
  const nowMs = Date.now()
  const now = new Date(nowMs).toISOString()
  // A locally minted stamp is observed at the instant it is minted. Saying so
  // explicitly keeps `remainingSeconds` from having to guess, and keeps a resume
  // that re-anchors to the same second from inheriting an older arrival time.
  markSnapshotObserved(now, nowMs)
  return mode === 'postpaid'
    ? { expiresAt: null, runningSince: now, serverTime: now }
    : {
        expiresAt: new Date(nowMs + banked * 1000).toISOString(),
        runningSince: null,
        serverTime: now,
      }
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  billingMode: 'prepaid',
  timeSource: 'wallet',
  expiresAt: null,
  runningSince: null,
  serverTime: null,
  bankedSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,
  sessionSeconds: SESSION_LENGTH,
  warnedMinutes: [],
  warningPulseAt: null,
  closingWarned: [],

  startSession: (mode, source) => {
    // A prepaid visit opens with the hours it bought; a postpaid one opens at
    // zero used, because nothing has been owed yet.
    const banked = mode === 'prepaid' ? SESSION_LENGTH : 0
    set({
      billingMode: mode,
      // Postpaid has no granted time to have a source, so the mode *is* the
      // answer and a caller cannot override it into a lie.
      timeSource: mode === 'postpaid' ? 'postpaid' : (source ?? 'wallet'),
      bankedSeconds: banked,
      sessionSeconds: banked,
      timerRunning: true,
      sessionExpired: false,
      // A fresh visit has heard nothing yet, and the marks of the previous one
      // are none of its business (C2.6, C2.11).
      warnedMinutes: [],
      warningPulseAt: null,
      closingWarned: [],
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
      // The teardown path: a free station must not keep naming the pocket the
      // player who just left was spending from, least of all an admin grant that
      // belonged to their visit alone.
      timeSource: 'wallet',
      bankedSeconds: SESSION_LENGTH,
      sessionSeconds: SESSION_LENGTH,
      timerRunning: false,
      sessionExpired: false,
      expiresAt: null,
      runningSince: null,
      serverTime: null,
      warnedMinutes: [],
      warningPulseAt: null,
      closingWarned: [],
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
    // This snapshot is being adopted *now*, so the skew correction must measure
    // from now. Without saying so, a stamp the client had seen before (a server
    // answering twice in one second, or a mock clock that does not move) is dated
    // to its previous arrival, and `remainingSeconds` deducts the whole gap from a
    // deadline that was just re-granted — the "minutes vanished after unlocking"
    // report this line exists to prevent.
    markSnapshotObserved(snapshot.serverTime)
    set({
      billingMode: snapshot.billingMode,
      // Written in the same `set` as the deadline it describes. A grant arrives as
      // one snapshot — more minutes *and* a new pocket — so splitting the two
      // writes would let the HUD render a frame naming the old source above the
      // new remainder, which is the one combination that misinforms the player.
      timeSource: snapshot.timeSource,
      expiresAt: running && !postpaid ? snapshot.expiresAt : null,
      // The postpaid anchor is stamped on the **client** clock, not copied from
      // `serverTime`. `derive` counts a running tab up with `secondsSince()`,
      // which measures against `Date.now()`, so a server stamp here would be two
      // timelines subtracted from each other: every second of skew between the
      // club and this kiosk would land on the tab as billed time. Prepaid can
      // safely carry the server's `expiresAt` because `remainingSeconds()` keeps
      // the pair together and corrects for exactly that difference; the "up"
      // direction has no such pair, so the snapshot's accrued seconds are banked
      // and the count starts again from now.
      runningSince: running && postpaid ? nowIso() : null,
      serverTime: snapshot.serverTime,
      bankedSeconds: banked,
      sessionSeconds: banked,
      timerRunning: running,
      sessionExpired: snapshot.state === 'ended',
      // Time moved, so the warnings have to move with it (C2.6). A mark is kept
      // *spoken* only while the seat is still below it; anything the new
      // remainder has climbed back above is re-armed, so a player who extends at
      // 4 minutes is warned again at 15 and at 5 rather than sliding into the
      // next deadline in silence. Filtering rather than clearing is what keeps
      // the opposite bug out: an admin correction that *removes* time must not
      // replay the 15-minute toast the player already saw.
      warnedMinutes: get().warnedMinutes.filter((minute) => banked <= minute * 60),
    })
  },

  expireSession: () => set({ timerRunning: false, sessionExpired: true }),

  // Expiry ends the visit, so it reuses the one teardown path instead of a
  // second, slightly different reset that would inevitably drift from `logout`.
  clearExpired: () => {
    set({ sessionExpired: false })
    get().logout()
  },

  noteTimeWarning: (minutes) =>
    set((s) => ({
      warnedMinutes: [...new Set([...s.warnedMinutes, ...minutes])],
      warningPulseAt: Date.now(),
    })),

  clearWarningPulse: () => set({ warningPulseAt: null }),

  // No pulse on the time plate: the digits there are the *session's* remainder,
  // and pulsing them for the club's closing would point the player at a number
  // that is not the one changing (§4.2 — one runner per fact).
  noteClosingWarning: (minutes) =>
    set((s) => ({ closingWarned: [...new Set([...s.closingWarned, ...minutes])] })),
})
