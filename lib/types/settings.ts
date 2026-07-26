import type { Lang } from '@/lib/i18n/types'
import type { Cents, Currency, ID } from './common'
import type { PrivacySettings } from './user'

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
  /** Grace period before a no-show booking releases the seat. */
  bookingGraceMinutes: number
}

/** One key/value row of the settings registry, for the generic admin editor. */
export interface ClubSettingEntry {
  clubId: ID
  key: string
  value: unknown
}
