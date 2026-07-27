/**
 * Marketing campaigns (F7.3).
 *
 * One row describes a campaign once and both places that advertise it read the
 * same row: the promo strip on Home and the idle screen in attract-mode. That is
 * the whole point of the type existing — before it, the strip carried a
 * hardcoded "Double coins until 18:00" and the attract ticker carried five
 * unrelated hardcoded lines, so the two screens could advertise different
 * offers on the same evening.
 *
 * Copy lives in the data, not in the dictionaries, for the same reason product
 * and tournament names do: it is club content the staff edits, not interface
 * chrome the app ships. Nothing here is rendered into the image — see `image`.
 */
import type { ID, ISODateTime } from './common'
import type { LauncherView } from '@/lib/launcher-nav'

/**
 * What the campaign is selling. Drives the fallback icon and the accent, so the
 * strip still reads as a tournament ad when the art fails to load.
 */
export type PromoKind = 'sale' | 'tournament' | 'battlepass' | 'event'

/** `members` hides the campaign from the walk-in guest surface. */
export type PromoAudience = 'everyone' | 'members'

/** Where a campaign is allowed to appear. */
export type PromoSurface = 'home' | 'attract'

/**
 * Deep link for the CTA. The server ships a destination rather than a URL, and
 * the client's section ids are that vocabulary today — `resolveView` already
 * refuses a section the current surface cannot open, so an out-of-reach target
 * degrades to Home instead of a dead button.
 */
export type PromoTarget = LauncherView

export interface Promo {
  id: ID
  kind: PromoKind
  /** Short kicker above the headline, e.g. `Happy hours`. */
  badge: string
  title: string
  subtitle: string
  /**
   * 16:9 banner path, or `''` for a campaign with no art — the strip then falls
   * back to its gradient. **No text is baked into these files**: the headline is
   * DOM text so it can be translated, selected and read out, and so the same
   * art survives a copy change.
   */
  image: string
  /** CTA label, or `null` for an informational campaign (attract-only). */
  cta: string | null
  /** Paired with `cta`: both set, or both `null`. */
  target: PromoTarget | null
  /** Higher sorts first within a surface. */
  priority: number
  startsAt: ISODateTime
  /** `null` for an open-ended campaign. */
  endsAt: ISODateTime | null
  surfaces: PromoSurface[]
  audience: PromoAudience
  /** The row this campaign advertises, when it advertises one. */
  refType: 'tournament' | 'season' | 'pass' | null
  refId: ID | null
}
