import type { Cents, Coins, ID, ISODateTime } from './common'

export interface Achievement {
  id: ID
  name: string
  description: string
  condition: string
  icon: string
  unlocked: boolean
}

/** `quests.type` — dailies reset at club open, weeklies on Monday. */
export type QuestType = 'daily' | 'weekly'

export interface Quest {
  id: ID
  type: QuestType
  code: string
  description: string
  target: number
  progress: number
  rewardCoins: Coins
  rewardXp: number
  completedAt: ISODateTime | null
  claimedAt: ISODateTime | null
  active: boolean
}

/** Battle Pass season. `paidTrack` is the premium lane (MVP §5.7). */
export interface Season {
  id: ID
  name: string
  startsAt: ISODateTime
  endsAt: ISODateTime
  levels: number
  paidTrack: boolean
  paidPriceCents: Cents
  active: boolean
}

export type BattlePassTrack = 'free' | 'paid'

export type RewardType = 'time' | 'product' | 'merch' | 'coins' | 'cosmetic'

/** One level of the Battle Pass ladder, on either track. */
export interface BattlePassTier {
  seasonId: ID
  level: number
  track: BattlePassTrack
  rewardType: RewardType
  rewardRef: ID | null
  rewardAmount: number
  label: string
  /** Server-computed: level reached, so the tier can be claimed. */
  unlocked: boolean
  claimed: boolean
}

/** The member's standing in the active season. */
export interface UserSeason {
  seasonId: ID
  xp: number
  level: number
  paidUnlocked: boolean
  claimedLevels: number[]
}

/** `rewards` — the coin shop. */
export interface Reward {
  id: ID
  name: string
  costCoins: Coins
  type: RewardType
  stock: number
  perUserLimit: number
}

export interface Redemption {
  id: ID
  userId: ID
  rewardId: ID
  status: 'pending' | 'ready' | 'collected' | 'cancelled'
  createdAt: ISODateTime
}

/**
 * The three columns the week's board can be ranked by (C3.10).
 *
 * One union, because it is also the endpoint's parameter: the switcher on the
 * card cannot offer a fourth ordering the server does not know how to produce.
 */
export type LeaderboardMetric = 'hours' | 'coins' | 'wins'

export interface LeaderboardEntry {
  /** Position **in the requested ordering** — recomputed per metric, server-side. */
  rank: number
  nickname: string
  /** Loyalty level, so a row wears the same tier ring as everywhere else. */
  level: number
  hours: number
  coins: Coins
  wins: number
  isCurrentUser?: boolean
}

/** `GET /api/loyalty/leaderboard` — one page of the board plus the viewer's place in it. */
export interface LeaderboardBoard {
  /** The ordering these rows are in — echoed so a stale page cannot be mislabelled. */
  metric: LeaderboardMetric
  /** The top N, ranked by `metric`. */
  rows: LeaderboardEntry[]
  /**
   * The viewer's own row when it falls *outside* `rows` — the whole point of a
   * top-10 for someone who is twelfth. `null` when they are already on the page,
   * when they opted out of the board, or when nobody is signed in.
   */
  viewer: LeaderboardEntry | null
  /** Everyone the board ranks, so "10 of 12" can be stated rather than guessed. */
  total: number
}

/** Compact reward teaser rendered on the home screen coin ladder. */
export interface Prize {
  coins: Coins
  reward: string
  icon: string
}

export interface ActivityEvent {
  id: ID
  type: 'game' | 'purchase' | 'achievement'
  label: string
  time: string
}
