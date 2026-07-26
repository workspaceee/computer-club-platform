import type { Cents, Coins, ID, ISODateTime, Minutes, PaymentMethod } from './common'
import type { ZoneClass } from './machine'

/** `passes.visible_to` — who sees the pass in the shop. */
export type PassAudience = 'everyone' | 'members' | 'staff'

/**
 * `passes.time_window_json` — the daily window a pass is usable in, e.g. a night
 * pass is `22:00`–`08:00`. `null` means the pass works any time.
 */
export interface PassTimeWindow {
  /** `HH:mm` in club time. */
  from: string
  to: string
}

/**
 * A purchasable time product. Every field is admin-configurable (MVP §4.1) —
 * the client must render whatever the club defines and never hardcode tiers.
 */
export interface Pass {
  id: ID
  clubId: ID
  name: string
  hours: number
  bonusMinutes: Minutes
  priceCents: Cents
  /** Empty array means "valid in every zone". */
  zoneScope: ZoneClass[]
  timeWindow: PassTimeWindow | null
  /** Inside `timeWindow` the pass does not burn minutes at all. */
  unlimitedInWindow: boolean
  /** ISO weekday numbers, 1 = Monday. Empty means every day. */
  validDays: number[]
  coinsReward: Coins
  visibleTo: PassAudience
  active: boolean
}

/** A pass owned by a member — the balance the session draws minutes from. */
export interface PassPurchase {
  id: ID
  userId: ID
  passId: ID
  minutesTotal: Minutes
  minutesLeft: Minutes
  expiresAt: ISODateTime | null
  paidVia: Extract<PaymentMethod, 'cash' | 'wallet' | 'card' | 'staff'>
  staffId: ID | null
  createdAt: ISODateTime
}
