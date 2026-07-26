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

export interface LeaderboardEntry {
  rank: number
  nickname: string
  hours: number
  coins: Coins
  isCurrentUser?: boolean
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
