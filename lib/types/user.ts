import type { Lang } from '@/lib/i18n/types'
import type { Cents, Coins, ID, ISODate, ISODateTime } from './common'

/** `users.role` — staff roles live in `admin.ts`, this is the club-side role. */
export type UserRole = 'guest' | 'member' | 'staff' | 'admin'

/**
 * Server-side account record (`users` in MVP §9.4). The launcher rarely renders
 * this directly — it works with `UserProfile`, the flattened view below.
 */
export interface User {
  id: ID
  clubId: ID
  nickname: string
  email: string
  role: UserRole
  level: number
  xp: number
  birthday?: ISODate
  createdAt: ISODateTime
}

/**
 * A walk-in who has not registered yet (`guest_profiles`). Guests own a session
 * and a tab like anyone else; converting them keeps both (MVP §8.2).
 */
export interface GuestProfile {
  id: ID
  clubId: ID
  machineId: ID
  label: string
  convertedUserId?: ID
}

/**
 * `wallets` — money and coins for one account. Lives in the user domain because
 * the balance belongs to the person; the movements that change it are
 * `Transaction` records in `tab.ts`.
 */
export interface Wallet {
  userId: ID
  moneyCents: Cents
  coins: Coins
}

/** What the member chose to expose on leaderboards and profiles. */
export interface PrivacySettings {
  showOnLeaderboard: boolean
  showRealName: boolean
  allowFriendRequests: boolean
  allowPartyInvites: boolean
}

/**
 * Flattened profile the launcher renders. Aggregates `users`, `wallets` and the
 * lifetime stats the API computes server-side, so the UI never sums anything.
 */
export interface UserProfile {
  nickname: string
  email: string
  /** Interface language stored on the member profile — applied on sign-in (F2.5). */
  lang?: Lang
  level: number
  xp: number
  xpMax: number
  coins: Coins
  memberSince: string
  /**
   * Consecutive days the member has shown up, today included (C3.1).
   *
   * Server-owned like every other stat here: "consecutive" depends on the club's
   * own day boundary — a visit that starts at 01:00 belongs to the night that
   * opened it, not to the calendar date — and a client that counted it from
   * session rows would break the streak of every player who stays past midnight.
   * `0` means the streak is not running (first visit, or a day was missed).
   */
  visitStreak: number
  /**
   * Nobody has played here yet on this account (C3.13).
   *
   * Server-owned, and a *field* rather than something a card derives from the
   * three counters below it, for the same reason `visitStreak` is one: "new to
   * this club" is the club's definition, and the moment two surfaces each write
   * their own test for it they start disagreeing about who gets welcomed. The
   * home screen has three empty cards on a first evening, and all three have to
   * agree they are looking at the same person.
   *
   * Deliberately not "registered recently": an account created a month ago whose
   * owner is sitting down for the first time is a newcomer, and one who played
   * yesterday is not — the answer is history, not a date.
   */
  isNewcomer: boolean
  totalHours: number
  gamesPlayed: number
  sessions: number
  achievementsUnlocked: number
  achievementsTotal: number
}
