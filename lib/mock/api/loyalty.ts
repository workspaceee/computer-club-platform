// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/loyalty/*`: coins, quests, the battle pass, the reward shop and the
// season leaderboard. Progress rules live server-side on purpose — the client
// asks to claim, it never decides that something *is* claimable.
import { ApiError, mutate, newId, query, required } from '@/lib/mock/api/client'
import {
  db,
  getActiveSeason,
  getBattlePassTiers,
  getLeaderboard,
  getPlayer,
} from '@/lib/mock/db'
import type { Coins, ID } from '@/lib/types/common'
import type {
  Achievement,
  ActivityEvent,
  BattlePassTier,
  BattlePassTrack,
  LeaderboardEntry,
  Prize,
  Quest,
  Redemption,
  Reward,
  Season,
  UserSeason,
} from '@/lib/types/loyalty'
import type { Transaction } from '@/lib/types/tab'
import type { Wallet } from '@/lib/types/user'

function recordTransaction(entry: Omit<Transaction, 'id' | 'currency' | 'createdAt'>): void {
  db.transactions.push({
    id: newId('tx'),
    currency: db.club.currency,
    createdAt: db.now,
    ...entry,
  })
}

/* ------------------------------------------------------------------ *
 * Achievements & activity
 * ------------------------------------------------------------------ */

/** `GET /api/loyalty/achievements` */
export function fetchAchievements(): Promise<Achievement[]> {
  return query('loyalty.fetchAchievements', () => db.achievements)
}

/** `GET /api/loyalty/activity` — the profile feed, already presentational. */
export function fetchActivity(limit = 20): Promise<ActivityEvent[]> {
  return query('loyalty.fetchActivity', () => db.activity.slice(0, limit))
}

/* ------------------------------------------------------------------ *
 * Quests
 * ------------------------------------------------------------------ */

/** `GET /api/loyalty/quests` — active dailies and weeklies. */
export function fetchQuests(type?: Quest['type']): Promise<Quest[]> {
  return query('loyalty.fetchQuests', () =>
    db.quests.filter((q) => q.active && (type ? q.type === type : true)),
  )
}

export interface ClaimQuestResult {
  quest: Quest
  wallet: Wallet
  /** Season XP after the claim, so the pass bar animates from a server value. */
  userSeason: UserSeason
}

/**
 * `POST /api/loyalty/quests/:id/claim`. Refuses an unfinished quest with
 * `conflict` and a second claim with `conflict` too — the reward is idempotent
 * by rejection rather than by silently paying twice.
 */
export function claimQuest(questId: ID, userId: ID = db.currentUserId): Promise<ClaimQuestResult> {
  return mutate('loyalty.claimQuest', () => {
    const quest = required(db.quests.find((q) => q.id === questId))
    if (quest.progress < quest.target) throw new ApiError('conflict')
    if (quest.claimedAt) throw new ApiError('conflict')

    const player = required(getPlayer(userId))
    quest.completedAt ??= db.now
    quest.claimedAt = db.now

    player.wallet.coins += quest.rewardCoins
    player.user.xp += quest.rewardXp
    db.userSeason.xp += quest.rewardXp
    db.userSeason.level = levelForXp(db.userSeason.xp)

    recordTransaction({
      userId,
      type: 'earn_coins',
      amount: quest.rewardCoins,
      refType: 'reward',
      refId: quest.id,
      staffId: null,
    })

    return { quest, wallet: player.wallet, userSeason: db.userSeason }
  })
}

/* ------------------------------------------------------------------ *
 * Battle pass
 * ------------------------------------------------------------------ */

/** Flat 500 XP per level until the season config owns the curve. */
const XP_PER_LEVEL = 500

function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

export interface BattlePassView {
  season: Season
  userSeason: UserSeason
  tiers: BattlePassTier[]
  /** XP into the current level and what the next one costs. */
  xpIntoLevel: number
  xpForNextLevel: number
  /** Levels reached but not yet collected — the "claim all" badge count. */
  claimable: number
}

/** `GET /api/loyalty/battlepass` — one call for the whole pass screen. */
export function fetchBattlePass(track?: BattlePassTrack): Promise<BattlePassView> {
  return query('loyalty.fetchBattlePass', () => {
    const season = getActiveSeason()
    const userSeason = db.userSeason
    const tiers = getBattlePassTiers(track).map((tier) => ({
      ...tier,
      // Unlock state is derived from level, so a stale seed can't disagree with
      // progress; `claimed` stays authoritative in the store.
      unlocked: tier.level <= userSeason.level && (tier.track === 'free' || userSeason.paidUnlocked),
    }))

    return {
      season,
      userSeason,
      tiers,
      xpIntoLevel: userSeason.xp % XP_PER_LEVEL,
      xpForNextLevel: XP_PER_LEVEL,
      claimable: tiers.filter((t) => t.unlocked && !t.claimed).length,
    }
  })
}

export interface ClaimTierResult {
  tier: BattlePassTier
  wallet: Wallet
  userSeason: UserSeason
}

/** `POST /api/loyalty/battlepass/:level/claim` */
export function claimBattlePassTier(
  level: number,
  track: BattlePassTrack = 'free',
  userId: ID = db.currentUserId,
): Promise<ClaimTierResult> {
  return mutate('loyalty.claimBattlePassTier', () => {
    const tier = required(db.battlePassTiers.find((t) => t.level === level && t.track === track))
    const userSeason = db.userSeason

    if (level > userSeason.level) throw new ApiError('forbidden')
    if (track === 'paid' && !userSeason.paidUnlocked) throw new ApiError('forbidden')
    if (tier.claimed) throw new ApiError('conflict')

    const player = required(getPlayer(userId))
    tier.claimed = true
    tier.unlocked = true
    if (!userSeason.claimedLevels.includes(level)) userSeason.claimedLevels.push(level)

    if (tier.rewardType === 'coins') {
      player.wallet.coins += tier.rewardAmount
      recordTransaction({
        userId,
        type: 'earn_coins',
        amount: tier.rewardAmount,
        refType: 'reward',
        refId: `${tier.seasonId}-${level}`,
        staffId: null,
      })
    }

    if (tier.rewardType === 'time' && tier.rewardAmount > 0) {
      db.passPurchases.push({
        id: newId('pp'),
        userId,
        passId: tier.rewardRef ?? 'pass-bonus',
        minutesTotal: tier.rewardAmount,
        minutesLeft: tier.rewardAmount,
        expiresAt: null,
        paidVia: 'staff',
        staffId: null,
        createdAt: db.now,
      })
      recordTransaction({
        userId,
        type: 'time_grant',
        amount: tier.rewardAmount,
        refType: 'reward',
        refId: `${tier.seasonId}-${level}`,
        staffId: null,
      })
    }

    db.activity.unshift({
      id: newId('act'),
      type: 'achievement',
      label: `Claimed ${tier.label}`,
      time: 'Just now',
    })

    return { tier, wallet: player.wallet, userSeason }
  })
}

export interface UnlockPaidTrackResult {
  userSeason: UserSeason
  wallet: Wallet
}

/** `POST /api/loyalty/battlepass/unlock` — buys the paid track from the wallet. */
export function unlockPaidTrack(userId: ID = db.currentUserId): Promise<UnlockPaidTrackResult> {
  return mutate('loyalty.unlockPaidTrack', () => {
    const season = getActiveSeason()
    if (!season.paidTrack) throw new ApiError('forbidden')
    if (db.userSeason.paidUnlocked) throw new ApiError('conflict')

    const player = required(getPlayer(userId))
    if (player.wallet.moneyCents < season.paidPriceCents) throw new ApiError('insufficientFunds')

    player.wallet.moneyCents -= season.paidPriceCents
    db.userSeason.paidUnlocked = true
    recordTransaction({
      userId,
      type: 'spend_money',
      amount: -season.paidPriceCents,
      refType: 'reward',
      refId: season.id,
      staffId: null,
    })

    return { userSeason: db.userSeason, wallet: player.wallet }
  })
}

/* ------------------------------------------------------------------ *
 * Reward shop
 * ------------------------------------------------------------------ */

/** `GET /api/loyalty/rewards` */
export function fetchRewards(): Promise<Reward[]> {
  return query('loyalty.fetchRewards', () => db.rewards)
}

const PRIZE_ICONS: Record<string, string> = {
  'rw-sticker': 'sticker',
  'rw-drink': 'cup-soda',
  'rw-hour': 'clock',
  'rw-tshirt': 'shirt',
  'rw-mouse': 'mouse',
  'rw-vip-night': 'crown',
}

/** `GET /api/loyalty/rewards/featured` — the coin-shop row on the dashboard. */
export function fetchFeaturedRewards(): Promise<Prize[]> {
  return query('loyalty.fetchFeaturedRewards', () =>
    db.featuredRewardIds.flatMap((id) => {
      const reward = db.rewards.find((r) => r.id === id)
      if (!reward) return []
      return [{ coins: reward.costCoins, reward: reward.name, icon: PRIZE_ICONS[id] ?? 'gift' }]
    }),
  )
}

export interface RedeemResult {
  redemption: Redemption
  wallet: Wallet
  reward: Reward
}

/**
 * `POST /api/loyalty/rewards/:id/redeem`. Checks coins, stock and the per-user
 * limit before writing — the three ways this can legitimately fail.
 */
export function redeemReward(rewardId: ID, userId: ID = db.currentUserId): Promise<RedeemResult> {
  return mutate('loyalty.redeemReward', () => {
    const reward = required(db.rewards.find((r) => r.id === rewardId))
    const player = required(getPlayer(userId))

    if (reward.stock <= 0) throw new ApiError('outOfStock')
    if (player.wallet.coins < reward.costCoins) throw new ApiError('insufficientCoins')

    const alreadyTaken = db.redemptions.filter(
      (r) => r.userId === userId && r.rewardId === rewardId && r.status !== 'cancelled',
    ).length
    if (reward.perUserLimit > 0 && alreadyTaken >= reward.perUserLimit) throw new ApiError('forbidden')

    player.wallet.coins -= reward.costCoins
    reward.stock -= 1

    const redemption: Redemption = {
      id: newId('rd'),
      userId,
      rewardId,
      status: 'pending',
      createdAt: db.now,
    }
    db.redemptions.unshift(redemption)

    recordTransaction({
      userId,
      type: 'spend_coins',
      amount: -reward.costCoins,
      refType: 'reward',
      refId: reward.id,
      staffId: null,
    })

    db.activity.unshift({
      id: newId('act'),
      type: 'purchase',
      label: `Redeemed ${reward.name}`,
      time: 'Just now',
    })

    return { redemption, wallet: player.wallet, reward }
  })
}

/** `GET /api/loyalty/redemptions` — collect-at-the-counter list, newest first. */
export function fetchRedemptions(userId: ID = db.currentUserId): Promise<Redemption[]> {
  return query('loyalty.fetchRedemptions', () =>
    db.redemptions
      .filter((r) => r.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  )
}

/** `POST /api/loyalty/redemptions/:id/cancel` — refunds coins and restocks. */
export function cancelRedemption(redemptionId: ID): Promise<Redemption> {
  return mutate('loyalty.cancelRedemption', () => {
    const redemption = required(db.redemptions.find((r) => r.id === redemptionId))
    if (redemption.status !== 'pending' && redemption.status !== 'ready') {
      throw new ApiError('conflict')
    }

    const reward = db.rewards.find((r) => r.id === redemption.rewardId)
    const player = getPlayer(redemption.userId)
    if (reward && player) {
      player.wallet.coins += reward.costCoins
      reward.stock += 1
      recordTransaction({
        userId: redemption.userId,
        type: 'earn_coins',
        amount: reward.costCoins,
        refType: 'reward',
        refId: reward.id,
        staffId: null,
        note: 'refund',
      })
    }

    redemption.status = 'cancelled'
    return redemption
  })
}

/* ------------------------------------------------------------------ *
 * Leaderboard
 * ------------------------------------------------------------------ */

export interface LeaderboardQuery {
  limit?: number
  /** Hide members who opted out of the board (F2.5 privacy). */
  respectPrivacy?: boolean
}

/** `GET /api/loyalty/leaderboard` — ranked server-side, viewer flagged. */
export function fetchLeaderboard(params: LeaderboardQuery = {}): Promise<LeaderboardEntry[]> {
  return query('loyalty.fetchLeaderboard', () => {
    const { limit = 10, respectPrivacy = true } = params
    const hidden = new Set(
      respectPrivacy
        ? db.userPreferences.filter((p) => !p.privacy.showOnLeaderboard).map((p) => p.userId)
        : [],
    )

    return getLeaderboard()
      .filter((entry) => {
        if (!respectPrivacy) return true
        const player = [...db.players.values()].find((p) => p.user.nickname === entry.nickname)
        return !player || !hidden.has(player.user.id) || entry.isCurrentUser
      })
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  })
}

/** `GET /api/loyalty/coins` — balance only, for the header chip. */
export function fetchCoins(userId: ID = db.currentUserId): Promise<Coins> {
  return query('loyalty.fetchCoins', () => required(getPlayer(userId)).wallet.coins)
}
