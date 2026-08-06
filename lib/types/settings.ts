import type { Lang } from '@/lib/i18n/types'
import type { Cents, Currency, ID } from './common'
import type { PrivacySettings } from './user'

/**
 * `clubs` — the tenant row. Everything else in the model hangs off `clubId`, so
 * the client keeps it around even though a single launcher only ever sees one
 * club. The editable part lives in `ClubSettings` below.
 */
export interface Club {
  id: ID
  name: string
  timezone: string
  currency: Currency
  defaultLocale: Lang
}

/** FPS/ping overlay configuration (`user_preferences.overlay_json`). */
export interface OverlaySettings {
  enabled: boolean
  showFps: boolean
  showPing: boolean
  showClock: boolean
  showTimeLeft: boolean
  corner: 'tl' | 'tr' | 'bl' | 'br'
}

/**
 * `user_preferences` — follows the member between PCs, unlike `MachineSettings`
 * which is wiped on logout.
 */
export interface UserPreferences {
  userId: ID
  locale: Lang
  density: 'comfortable' | 'compact'
  reduceMotion: boolean
  sounds: boolean
  privacy: PrivacySettings
  overlay: OverlaySettings
}

/** Club-wide low-time thresholds, in minutes before the session ends. */
export interface WarningThresholds {
  notice: number
  warning: number
  critical: number
}

/** ISO weekday number, 1 = Monday … 7 = Sunday. Same numbering as `Pass.validDays`. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * One day's opening window (C2.11), `HH:mm` in **club-local** time.
 *
 * Three readings, and they are the whole contract — `lib/club-hours.ts` is the
 * only place allowed to interpret them:
 *
 *   `12:00` → `02:00`   the window crosses midnight: it closes at 02:00 on the
 *                       *following* calendar day. This is the normal shape for a
 *                       gaming club, not an edge case.
 *   `12:00` → `23:00`   an ordinary same-day window.
 *   `from === to`       **round the clock.** The day has no closing time at all.
 *                       Chosen over a `'24h'` literal or `to: '24:00'` because it
 *                       keeps the type a plain pair of clock readings — no value
 *                       that is legal in one field and meaningless in the other —
 *                       and over `to: '24:00'` because 24:00 is not a time a
 *                       `HH:mm` parser should have to accept. A 24-hour day is
 *                       still *bounded by the days around it*: if the next day
 *                       opens at 12:00, the club does close at midnight, and
 *                       `clubHoursStatus()` says so.
 */
export interface OpenWindow {
  /** `HH:mm` in club time. */
  from: string
  to: string
}

/**
 * The club's week (C2.11). `null` is a closed day — a real state, not missing
 * data, so the client must render "closed" rather than assume 24/7.
 */
export type OpenHours = Record<Weekday, OpenWindow | null>

/**
 * `clubs.settings_json` + the `settings` registry (MVP §6). Everything here is
 * admin-editable; the client must read it rather than assume a value.
 */
export interface ClubSettings {
  clubId: ID
  name: string
  timezone: string
  currency: Currency
  defaultLocale: Lang
  /** Languages offered by the switcher, in display order. */
  availableLocales: Lang[]
  /** Postpaid seats may run into debt up to this amount. */
  creditLimitCents: Cents
  guestCheckoutEnabled: boolean
  bookingEnabled: boolean
  barOrdersEnabled: boolean
  cardPaymentsEnabled: boolean
  warningThresholds: WarningThresholds
  /**
   * Opening hours by weekday (C2.11).
   *
   * Deliberately *not* folded into `warningThresholds`: that field is the
   * low-time schedule of a **session** (C2.6), and the two clocks answer
   * different questions — "your paid time is ending, extend it" versus "the
   * club's day is ending, you cannot extend past it". Sharing one set of numbers
   * would mean an admin who shortens a session warning also moves the closing
   * announcement. The closing marks live in `components/launcher/club-closing.tsx`.
   */
  openHours: OpenHours
  /** Grace period before a no-show booking releases the seat. */
  bookingGraceMinutes: number
}

/** One key/value row of the settings registry, for the generic admin editor. */
export interface ClubSettingEntry {
  clubId: ID
  key: string
  value: unknown
}
