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
  const promised = deadline - stamped
  const held = Date.now() - snapshotTakenAt(stamped)
  return Math.max(0, Math.floor((promised - held) / 1000))
}

/**
 * When a `serverTime` value was first observed on this client, in client ms.
 *
 * The map is tiny and keyed by the server timestamp itself, so the heartbeat
 * (one new stamp every 10 s) cannot grow it without bound — old entries for a
 * replaced stamp are dropped on write.
 */
const observed = new Map<number, number>()

function snapshotTakenAt(serverMs: number): number {
  const existing = observed.get(serverMs)
  if (existing !== undefined) return existing
  const now = Date.now()
  observed.clear()
  observed.set(serverMs, now)
  return now
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
