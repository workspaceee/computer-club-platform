/**
 * The club's own clock (C2.11).
 *
 * One pure function answers everything the client asks about opening hours — is
 * the club open, how long until it closes, when does it open again — and every
 * screen reads that answer instead of doing its own arithmetic on `HH:mm`
 * strings. The three shapes a day can have (`docs` on `OpenWindow`) are
 * interpreted **here and nowhere else**, which is what keeps the closing
 * warnings, the "Club closed" overlay and the shop's purchase notice from
 * disagreeing about the same minute.
 *
 * The idea that makes the awkward cases fall out for free: instead of asking
 * "which window am I in", the week is flattened into a short **timeline of open
 * spans** around today, and touching spans are merged. Then "is the club open"
 * is a containment test and "when does it close" is the end of the span we are
 * standing in.
 *
 * That is not cleverness for its own sake — it is what makes these four true at
 * the same time:
 *
 *  • **A window across midnight belongs to the day it opened.** `12:00 → 02:00`
 *    on Friday is one span ending Saturday at 02:00, so at 00:30 on Saturday the
 *    club is open with 90 minutes left, not "closed because Saturday opens at
 *    noon". Yesterday's window is therefore always part of the timeline.
 *  • **A round-the-clock day is not the same as "never closes".** Saturday
 *    `00:00 → 00:00` next to a Sunday that opens at noon really does close at
 *    Saturday midnight, and this function says so. A 24-hour day only answers
 *    "no closing time" when the days around it *keep* it open — which is exactly
 *    what merging touching spans detects.
 *  • **`null` closing means unbounded, never zero.** A club whose whole week is
 *    round the clock has no closing minute at all. Returning `0` there would read
 *    as "closing now" and would fire every warning plus the closed overlay on a
 *    club that never shuts.
 *  • **A closed day is a state, not missing data.** `null` in `openHours`
 *    produces no span, so the timeline simply has a gap, and the next span start
 *    is the honest "we open again at…".
 *
 * **Timezone.** `ClubSettings.timezone` is the club's zone (`Europe/Vilnius` in
 * the mock), but a station stands *in* the club, so its system clock already is
 * club time — and that is the only clock this prototype has. Everything below
 * therefore reads local time via `Date`. When Stage 4 puts a real server behind
 * this, the honest source is the server's club-local day (or a
 * `Intl.DateTimeFormat`/`timeZone` conversion here); a kiosk with a wrong
 * timezone is the one case this file cannot detect on its own. Same caveat for
 * DST: spans are minute offsets from local midnight, so the one night a year the
 * offset changes is an hour off. Neither is worth a dependency in a prototype;
 * both are worth this paragraph.
 */
import type { OpenHours, OpenWindow, Weekday } from '@/lib/types/settings'

const MINUTES_PER_DAY = 24 * 60
const MS_PER_MINUTE = 60_000

/**
 * How far the timeline reaches. One day back so a window that crossed midnight
 * is still visible, three days forward so "when do you open again" survives a
 * closed day (and a closed day followed by a late opening).
 */
const DAYS_BACK = 1
const DAYS_AHEAD = 3

export interface ClubHoursStatus {
  /** Is the club open at the instant asked about. */
  open: boolean
  /**
   * Whole minutes until the club closes, rounded **up**, or `null` when no
   * closing is in sight (a club that is open round the clock).
   *
   * Rounded up for the same reason the session marks compare `<=`: at 60 minutes
   * and 30 seconds the honest answer is still "an hour", and the 60-minute mark
   * should fire once the remainder is actually below it.
   */
  minutesUntilClose: number | null
  /** Epoch ms of that closing, for printing a clock time. `null` with the above. */
  closesAtMs: number | null
  /** Whole minutes until the club opens again, or `null` while it is open. */
  minutesUntilOpen: number | null
  /** Epoch ms of the next opening. `null` while open, or if none is in sight. */
  opensAtMs: number | null
}

/** `HH:mm` → minutes from midnight. `null` for anything unparseable. */
export function parseClockTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** ISO weekday (1 = Monday) of a date, from JS's Sunday-first `getDay()`. */
export function isoWeekday(date: Date): Weekday {
  const day = date.getDay()
  return (day === 0 ? 7 : day) as Weekday
}

/** The weekday `offset` days after `weekday`, wrapping the week in both directions. */
function shiftWeekday(weekday: Weekday, offset: number): Weekday {
  return ((((weekday - 1 + offset) % 7) + 7) % 7 + 1) as Weekday
}

interface Span {
  startMs: number
  endMs: number
}

/**
 * The window of one weekday as a span in minutes from `baseMinutes`, or `null`
 * when the day is closed or its data is unusable.
 *
 * Unparseable input is treated as closed rather than thrown on: a bad `HH:mm` in
 * club settings must not take the launcher down, and "closed" is the reading that
 * cannot silently over-promise time.
 */
function spanOf(window: OpenWindow | null, baseMinutes: number): { start: number; end: number } | null {
  if (!window) return null
  const from = parseClockTime(window.from)
  const to = parseClockTime(window.to)
  if (from === null || to === null) return null
  // Round the clock: the whole calendar day, regardless of where `from` points.
  if (from === to) return { start: baseMinutes, end: baseMinutes + MINUTES_PER_DAY }
  // `to <= from` is the midnight crossing: the window ends on the next day.
  return { start: baseMinutes + from, end: baseMinutes + (to <= from ? to + MINUTES_PER_DAY : to) }
}

/** Open spans around `nowMs`, merged so that touching windows become one. */
function timeline(openHours: OpenHours, nowMs: number): { spans: Span[]; horizonEndMs: number } {
  const now = new Date(nowMs)
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekday = isoWeekday(now)

  const raw: Span[] = []
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const span = spanOf(openHours[shiftWeekday(weekday, offset)], offset * MINUTES_PER_DAY)
    if (!span) continue
    raw.push({
      startMs: midnight + span.start * MS_PER_MINUTE,
      endMs: midnight + span.end * MS_PER_MINUTE,
    })
  }

  raw.sort((a, b) => a.startMs - b.startMs)

  // Merging on `>=` — touching, not just overlapping — is what turns a week of
  // round-the-clock days into one unbounded span instead of seven that each
  // "close" at midnight.
  const spans: Span[] = []
  for (const span of raw) {
    const last = spans[spans.length - 1]
    if (last && span.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, span.endMs)
    } else {
      spans.push({ ...span })
    }
  }

  return { spans, horizonEndMs: midnight + (DAYS_AHEAD + 1) * MINUTES_PER_DAY * MS_PER_MINUTE }
}

/** Whole minutes from `fromMs` to `toMs`, rounded up and floored at zero. */
function minutesBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.ceil((toMs - fromMs) / MS_PER_MINUTE))
}

/**
 * Where the club's day stands at `nowMs` (defaults to the station clock).
 *
 * ```ts
 * const status = clubHoursStatus(settings.openHours)
 * status.open              // false → the "Club closed" overlay
 * status.minutesUntilClose // 30    → the 30-minute closing warning
 * status.minutesUntilClose // null  → open round the clock, warn about nothing
 * ```
 */
export function clubHoursStatus(openHours: OpenHours, nowMs: number = Date.now()): ClubHoursStatus {
  const { spans, horizonEndMs } = timeline(openHours, nowMs)

  const current = spans.find((span) => span.startMs <= nowMs && nowMs < span.endMs)

  if (current) {
    // A span that runs to the edge of the horizon is not "closing then" — it is a
    // schedule with no closing in it, and the caller must be told `null` so it
    // announces nothing.
    const unbounded = current.endMs >= horizonEndMs
    return {
      open: true,
      minutesUntilClose: unbounded ? null : minutesBetween(nowMs, current.endMs),
      closesAtMs: unbounded ? null : current.endMs,
      minutesUntilOpen: null,
      opensAtMs: null,
    }
  }

  const next = spans.find((span) => span.startMs > nowMs)
  return {
    open: false,
    minutesUntilClose: null,
    closesAtMs: null,
    minutesUntilOpen: next ? minutesBetween(nowMs, next.startMs) : null,
    opensAtMs: next ? next.startMs : null,
  }
}

/**
 * When the club opens **next**, whether it is trading right now or not (C3.4).
 *
 * `clubHoursStatus()` answers "when do you open again" only while the doors are
 * shut, because that is the question a closed club raises. The daily quest set
 * asks a different one: it rolls over at the club's next opening, and a player
 * looking at the card at nine in the evening — mid-window — still needs to be
 * told when that is.
 *
 * One expression covers both cases, and that is the reason this lives here rather
 * than as arithmetic in the quest endpoint: the spans are merged, so the one
 * containing `nowMs` cannot also start after it. The first span that begins in
 * the future is therefore the *next* opening while the club is open, and the
 * imminent one while it is shut — where it agrees with `opensAtMs` exactly.
 *
 * `null` means no opening is in sight: either a schedule that never closes (one
 * unbounded span, so nothing "opens" again) or a club with no windows left inside
 * the horizon. Both are cases where a countdown would be invented rather than
 * read, so the caller is told to say nothing.
 */
export function nextOpeningMs(openHours: OpenHours, nowMs: number = Date.now()): number | null {
  const { spans } = timeline(openHours, nowMs)
  return spans.find((span) => span.startMs > nowMs)?.startMs ?? null
}

/**
 * The opening that started the club day `nowMs` falls in (C3.4).
 *
 * The mirror of `nextOpeningMs()`, and the other half of what a daily set needs:
 * "when does the current day roll over" is answered by the next opening, and
 * "which day am I looking at" by this one. A daily quest settled *before* this
 * instant belongs to a club day that has already ended, which is the only test
 * the reset needs — no calendar arithmetic, no midnight, no timezone of its own.
 *
 * Merged spans are what make it a one-liner: at most one span can contain `nowMs`,
 * and the ones before it are ordered, so the last start at or before now is the
 * door the current day opened through — the current span's start while the club is
 * trading, and the previous day's while it is shut. Both are the right answer for
 * "the set on screen was issued then".
 *
 * `null` only when nothing has opened inside the horizon — a schedule with no
 * windows at all. A club that never closes still has a door it opened through, so
 * it gets an instant here even though `nextOpeningMs()` has nothing to promise.
 */
export function lastOpeningMs(openHours: OpenHours, nowMs: number = Date.now()): number | null {
  const { spans } = timeline(openHours, nowMs)
  const past = spans.filter((span) => span.startMs <= nowMs)
  return past.length === 0 ? null : past[past.length - 1].startMs
}

/**
 * Does buying `durationMinutes` of time run past closing (C2.11)?
 *
 * The purchase is still allowed — the player may legitimately want minutes that
 * will tick tomorrow — so this only decides whether the checkout says so. `false`
 * when nothing closes, because there is then nothing to run past.
 */
export function runsPastClosing(
  durationMinutes: number,
  minutesUntilClose: number | null,
): boolean {
  if (minutesUntilClose === null) return false
  return durationMinutes > minutesUntilClose
}
