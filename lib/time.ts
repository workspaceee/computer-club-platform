/**
 * Time (F3.7).
 *
 * Two rules the whole product depends on:
 *
 *  1. **Durations are whole seconds or whole minutes** — never floats. A session
 *     with `1799.6` seconds left is a bug waiting to show "29:59" forever.
 *  2. **The remaining time is always derived from the server's `expiresAt`**,
 *     never from a locally decremented variable. A local counter drifts when the
 *     tab is backgrounded, the laptop sleeps or the frame rate drops, and the
 *     player ends up believing a number the club does not agree with. The single
 *     app-wide interval (F6.3) only re-reads the clock; it never subtracts.
 *
 * `remainingSeconds()` additionally corrects for client clock skew, because a
 * kiosk PC with a wrong system time must not shorten or extend a paid session.
 */
import type { ISODateTime, Minutes, Seconds } from '@/lib/types/common'

export const SECONDS_PER_MINUTE = 60
export const SECONDS_PER_HOUR = 3600

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/** Minutes → whole seconds. Passes are sold in minutes, spent in seconds. */
export function minutesToSeconds(minutes: Minutes): Seconds {
  return Math.round(minutes) * SECONDS_PER_MINUTE
}

/** Seconds → whole minutes, rounded **up**: 61 s of play is 2 minutes billed. */
export function secondsToMinutes(seconds: Seconds): Minutes {
  return Math.ceil(Math.max(0, seconds) / SECONDS_PER_MINUTE)
}

/** Parses a server timestamp. Returns `null` instead of `NaN` on bad input. */
export function parseTime(iso: ISODateTime | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/* ------------------------------------------------------------------ *
 * Remaining time — the countdown contract
 * ------------------------------------------------------------------ */

export interface RemainingInput {
  /** Absolute server deadline. `null` while the session is paused. */
  expiresAt: ISODateTime | null
  /** `serverTime` from the same response as `expiresAt`. Enables skew correction. */
  serverTime?: ISODateTime | null
  /** Client wall clock, in ms. Injectable so tests are deterministic. */
  nowMs?: number
  /** Fallback when there is no deadline yet (paused sessions report `secondsLeft`). */
  fallbackSeconds?: Seconds
}

/**
 * Seconds left on a session, floored at zero.
 *
 * Skew handling: the snapshot carries both `expiresAt` and the `serverTime` it
 * was produced at, so the true remaining span is `expiresAt - serverTime` plus
 * however long the client has been holding the snapshot. Both terms come from
 * clocks that agree with themselves, so a machine that is ten minutes off gets
 * the same countdown as one that is not.
 *
 * ```ts
 * remainingSeconds({ expiresAt: snap.expiresAt, serverTime: snap.serverTime })
 * ```
 */
export function remainingSeconds({
  expiresAt,
  serverTime,
  nowMs,
  fallbackSeconds = 0,
}: RemainingInput): Seconds {
  const deadline = parseTime(expiresAt)
  if (deadline === null) return Math.max(0, Math.floor(fallbackSeconds))

  // An explicit `nowMs` is treated as a point on the *server* timeline: tests and
  // server-side renders pass a known instant and want plain subtraction.
  if (nowMs !== undefined) return Math.max(0, Math.floor((deadline - nowMs) / 1000))

  const stamped = parseTime(serverTime)
  // No server stamp: trust the client clock and accept the drift.
  if (stamped === null) return Math.max(0, Math.floor((deadline - Date.now()) / 1000))

  // Skew-corrected: the span the server promised, minus how long this client has
  // been holding that snapshot. Both terms come from a clock that agrees with
  // itself, so a machine with a wrong system time still counts down correctly.
  //
  // "Promised" is server-minus-server, which is what makes a *statically* wrong
  // kiosk clock harmless. "Held" is a duration, so it is measured monotonically
  // (C2.18): subtracting two `Date.now()` readings only behaves like a duration
  // as long as nobody sets the clock between them, and an admin fixing the date
  // an hour backwards mid-session would otherwise hand the seat an extra hour on
  // screen — forwards, it would swallow one.
  const promised = deadline - stamped
  const held = heldMs(stamped)
  return Math.max(0, Math.floor((promised - held) / 1000))
}

/**
 * The snapshot currently being counted against: the server stamp it carried, and
 * the client instant it landed at.
 *
 * One slot, not a map keyed by stamp value. Keying by value made "when did this
 * arrive" a property of the *number* rather than of the arrival, so a second
 * snapshot carrying a stamp the client had seen before inherited the first one's
 * arrival time and was treated as minutes old the moment it landed — the skew
 * correction then subtracted those minutes from a freshly granted deadline. A real
 * server can legitimately answer twice within the same second, and a mock with a
 * frozen clock answers with the same stamp every time, so identical values must
 * still count as separate observations.
 *
 * `markSnapshotObserved` is therefore the honest signal, called once per snapshot
 * as it is adopted. The lazy fallback below only covers callers that never mark —
 * tests and server renders — and must keep returning a *stable* instant across
 * ticks, or the 1 Hz clock would re-anchor every second and stop counting down.
 */
let observed: { serverMs: number; at: number; mono: number } | null = null

/**
 * Monotonic milliseconds — a clock that only ever moves forward and that no one
 * can set (C2.18).
 *
 * `performance.now()` counts from the moment the page loaded and is unaffected by
 * the system clock, so an admin who fixes a kiosk's date mid-visit cannot move it.
 * Falls back to `Date.now()` where the API is missing, which is the same exposure
 * the code had before and not a worse one.
 */
export function monotonicNowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

/**
 * Records that a snapshot with this `serverTime` has just been adopted, so the
 * countdown measures from *now* rather than from whenever that stamp was last
 * seen. Call it from the one place snapshots enter the store.
 *
 * Both clocks are stamped in the same breath, because they answer two different
 * questions about the same instant: the wall clock keeps the *display* aligned
 * with the deadline the server sent, the monotonic one keeps the *reading* the
 * club is owed immune to that wall clock being wrong (C2.18). Taking them apart
 * later would compare two instants that were never the same instant.
 */
export function markSnapshotObserved(
  serverTime: ISODateTime | null | undefined,
  atMs: number = Date.now(),
  monoMs: number = monotonicNowMs(),
): void {
  const serverMs = parseTime(serverTime)
  observed = serverMs === null ? null : { serverMs, at: atMs, mono: monoMs }
}

function snapshotTakenAt(serverMs: number): number {
  if (observed !== null && observed.serverMs === serverMs) return observed.at
  const now = Date.now()
  observed = { serverMs, at: now, mono: monotonicNowMs() }
  return now
}

/**
 * How long, in ms, this client has been holding the snapshot carrying `serverMs`.
 *
 * One helper because both the display and the report ask the same question, and
 * they must not answer it from two different clocks. `snapshotTakenAt` is called
 * first so the slot is guaranteed to describe this stamp; the monotonic reading
 * beside it is then the honest duration, and the wall-clock difference is only the
 * fallback for an environment without `performance.now()`.
 */
function heldMs(serverMs: number): number {
  const at = snapshotTakenAt(serverMs)
  if (observed !== null && observed.serverMs === serverMs) {
    return monotonicNowMs() - observed.mono
  }
  return Date.now() - at
}

/**
 * Whole seconds the client has been holding the current anchor, measured on the
 * monotonic clock — or `null` when this stamp is not the anchor being held.
 *
 * This is the span the club is owed an account of, and the reason it is not
 * `Date.now() - observed.at`: that difference is only a duration while nobody
 * touches the system clock. Wind a kiosk back an hour and it goes *negative*, so
 * the reading collapses to the floor and the club loses every minute since the
 * last snapshot; wind it forward and the club is handed an hour nobody played.
 * The monotonic span cannot do either.
 *
 * `null` rather than a guess, so callers with no observed anchor (tests, server
 * renders, a visit restored before any snapshot landed) keep the wall-clock
 * behaviour they had instead of silently measuring from page load.
 */
export function monotonicSecondsSinceAnchor(
  serverTime: ISODateTime | null | undefined,
): Seconds | null {
  const serverMs = parseTime(serverTime)
  if (serverMs === null || observed === null || observed.serverMs !== serverMs) return null
  return Math.max(0, Math.floor((monotonicNowMs() - observed.mono) / 1000))
}

/**
 * "Now" on the **server's** timeline: the last stamp the server sent, plus how
 * long this client has been holding it.
 *
 * Same correction `remainingSeconds()` applies, exposed for the places that need
 * an instant rather than a remainder — the notification centre's "Today" /
 * "Yesterday" headings being the first (C2.5). Deciding which calendar day a
 * server-stamped message belongs to from `Date.now()` makes the heading a fact
 * about the kiosk's system clock: a machine an hour off files this evening's
 * messages under yesterday, and the mock's fixed anchor puts every one of them
 * under a full date because the branch can never match.
 *
 * Falls back to the client clock until a snapshot has been observed — a guest at
 * the lock screen has no session and therefore no server stamp, and the local
 * clock is then the only clock there is.
 */
export function serverNowMs(nowMs?: number): number {
  if (observed === null) return nowMs ?? Date.now()
  // An explicit instant is honoured as given (tests, server renders); left to
  // itself, the elapsed part is monotonic for the same reason the countdown's is
  // (C2.18) — the stamp is a point on the server's timeline, and how long ago it
  // arrived is a duration, not a difference of two settable clocks.
  if (nowMs !== undefined) return observed.serverMs + (nowMs - observed.at)
  return observed.serverMs + (monotonicNowMs() - observed.mono)
}

/** `true` once the deadline has passed. */
export function isExpired(expiresAt: ISODateTime | null, nowMs?: number): boolean {
  const deadline = parseTime(expiresAt)
  if (deadline === null) return false
  return deadline <= (nowMs ?? Date.now())
}

/** Whole seconds until an arbitrary future timestamp (tournament call, booking). */
export function secondsUntil(iso: ISODateTime | null, nowMs?: number): Seconds {
  const target = parseTime(iso)
  if (target === null) return 0
  return Math.max(0, Math.floor((target - (nowMs ?? Date.now())) / 1000))
}

/** Whole seconds since a past timestamp (session uptime, "ordered 4 min ago"). */
export function secondsSince(iso: ISODateTime | null, nowMs?: number): Seconds {
  const past = parseTime(iso)
  if (past === null) return 0
  return Math.max(0, Math.floor(((nowMs ?? Date.now()) - past) / 1000))
}

/* ------------------------------------------------------------------ *
 * Display
 * ------------------------------------------------------------------ */

const pad = (n: number) => Math.floor(n).toString().padStart(2, '0')

/**
 * Fixed-width clock face `HH:MM:SS` — the big session timer.
 *
 * Always three groups so the digits never reflow mid-countdown, which is why
 * this is not the same function as `formatCountdown`.
 */
export function formatDuration(totalSeconds: Seconds): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${pad(s / SECONDS_PER_HOUR)}:${pad((s % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)}:${pad(s % SECONDS_PER_MINUTE)}`
}

/**
 * Compact countdown that drops the hour group when it is zero: `04:31`,
 * `1:12:05`. For chips and list rows where horizontal space is the constraint.
 */
export function formatCountdown(totalSeconds: Seconds): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / SECONDS_PER_HOUR)
  const minutes = Math.floor((s % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = s % SECONDS_PER_MINUTE
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Human duration in whole units: `2 h 30 min`, `45 min`, `30 s`.
 *
 * Unit labels are passed in by the caller so the dictionaries (F2.2) stay the
 * only place that holds copy — this module never hardcodes a language.
 */
export function formatDurationParts(totalSeconds: Seconds): {
  hours: number
  minutes: number
  seconds: number
} {
  const s = Math.max(0, Math.floor(totalSeconds))
  return {
    hours: Math.floor(s / SECONDS_PER_HOUR),
    minutes: Math.floor((s % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: s % SECONDS_PER_MINUTE,
  }
}

/** Wall-clock time of a timestamp, e.g. `18:40`. 24-hour in all three locales. */
export function formatTimeOfDay(iso: ISODateTime | null, locale = 'en-GB'): string {
  const ms = parseTime(iso)
  if (ms === null) return '--:--'
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

/** Short date + time for receipts and history rows, e.g. `26 Jul, 18:40`. */
export function formatDateTime(iso: ISODateTime | null, locale = 'en-GB'): string {
  const ms = parseTime(iso)
  if (ms === null) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}
