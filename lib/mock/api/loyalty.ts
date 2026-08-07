// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/loyalty/*`: coins, quests, the battle pass, the reward shop and the
// season leaderboard. Progress rules live server-side on purpose — the client
// asks to claim, it never decides that something *is* claimable.
import { lastOpeningMs, nextOpeningMs } from '@/lib/club-hours'
import { ApiError, mutate, newId, query, required, serverNowMs } from '@/lib/mock/api/client'
import {
  db,
  getActiveSeason,
  getBattlePassTiers,
  getLeaderboard,
  getPlayer,
  getPrivacy,
} from '@/lib/mock/db'
import { persistDb } from '@/lib/mock/persist'
import { parseTime } from '@/lib/time'
import type { Coins, ID, ISODateTime } from '@/lib/types/common'
import type {
  Achievement,
  ActivityEvent,
  BattlePassTier,
  BattlePassTrack,
  LeaderboardBoard,
  LeaderboardMetric,
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

/**
 * Three, from the task — and the server's number, not the card's.
 *
 * The seed carries four dailies on purpose, so "which three" is a real decision
 * and a client that sliced the list would be making it. It is made here, once.
 */
export const DAILY_QUEST_SLOTS = 3

export interface DailyQuestBoard {
  /** The set on screen, at most `DAILY_QUEST_SLOTS`, ordered by what to do next. */
  quests: Quest[]
  /**
   * When this set rolls over, on the server's clock. `null` when the club never
   * closes — there is no opening to roll over at, so the card says nothing rather
   * than inventing a midnight.
   */
  resetsAt: ISODateTime | null
  /** Coins and XP still unclaimed across the set — the card's one summary line. */
  pendingCoins: Coins
  pendingXp: number
}

/**
 * Which quest a player should look at first.
 *
 * Three groups, and the order is the order of what can be *done*: a finished
 * quest waiting to be collected, then one still in progress, then a settled one.
 * Within a group the club's own order is kept, so the set does not reshuffle
 * itself under the cursor as progress lands.
 */
function questRank(quest: Quest): number {
  if (quest.progress >= quest.target && !quest.claimedAt) return 0
  if (!quest.claimedAt) return 1
  return 2
}

/**
 * Rolls back dailies that belong to a club day which has already ended.
 *
 * The reset is the club's, not the calendar's (`quests.type`): a member who leaves
 * at 03:00 is still inside Friday's set, and a set that rolled at midnight would
 * empty in front of them mid-visit. So the boundary is the opening that issued the
 * set — `lastOpeningMs()` — and anything settled before it is stale.
 *
 * Only *settled* dailies carry a stamp, so only those can be dated. Partial
 * progress is deliberately left alone: without a "progressed at" column there is
 * no honest way to tell yesterday's half-finished quest from this evening's, and
 * wiping it would take away work the player did an hour ago. The seed's stamps are
 * what the demo shows, and they survive a reload for the same reason.
 *
 * Returns `true` when something actually changed, so a read only writes to storage
 * on the one call per club day that has anything to save.
 */
function rolloverDailies(nowMs: number): boolean {
  const since = lastOpeningMs(db.clubSettings.openHours, nowMs)
  if (since === null) return false

  let changed = false
  for (const quest of db.quests) {
    if (quest.type !== 'daily') continue
    const settledAt = parseTime(quest.claimedAt ?? quest.completedAt)
    if (settledAt === null || settledAt >= since) continue
    quest.progress = 0
    quest.completedAt = null
    quest.claimedAt = null
    changed = true
  }
  return changed
}

/**
 * `GET /api/loyalty/quests/daily` — the home card's whole payload (C3.4).
 *
 * One call rather than the card composing `fetchQuests('daily')` with the club's
 * schedule, because every decision on that card is the server's: which three of
 * the four dailies are shown, in what order, what is still owed, and when the set
 * expires. A client that derived the reset from `/api/club/settings` would be the
 * second place in the product that interprets opening hours, and the first one to
 * disagree with the "Club closed" overlay about which day it is.
 *
 * The read has a write in it, and that is the point: a set is not "yesterday's"
 * because a component noticed, it is yesterday's because the club opened again.
 */
export function fetchDailyQuests(): Promise<DailyQuestBoard> {
  return query('loyalty.fetchDailyQuests', () => {
    const nowMs = serverNowMs()
    // Persist only when the rollover really moved something — `query()` does not
    // save by itself, and a read that wrote nothing has nothing to save.
    if (rolloverDailies(nowMs)) persistDb()

    const dailies = db.quests.filter((q) => q.active && q.type === 'daily')
    const quests = [...dailies]
      .sort((a, b) => questRank(a) - questRank(b))
      .slice(0, DAILY_QUEST_SLOTS)

    // Summed over the *whole* active set, not the three on screen: the number is
    // "what the day is still worth", and a fourth daily is worth it too.
    const unclaimed = dailies.filter((q) => !q.claimedAt)
    const resetsAtMs = nextOpeningMs(db.clubSettings.openHours, nowMs)

    return {
      quests,
      resetsAt: resetsAtMs === null ? null : new Date(resetsAtMs).toISOString(),
      pendingCoins: unclaimed.reduce((sum, q) => sum + q.rewardCoins, 0),
      pendingXp: unclaimed.reduce((sum, q) => sum + q.rewardXp, 0),
    }
  })
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
  /**
   * The rung the member is standing on, and the one above it — both on the free
   * track, which is the lane every member has.
   *
   * Picked here rather than in the caller for the reason `fetchDailyQuests()`
   * picks its three: "which tier is next" is a product decision, and a home-screen
   * teaser that scanned `tiers` itself would be a second place deciding it — one
   * that could disagree with the pass screen about what the next reward is. The
   * premium lane stays out of this pair on purpose: the teaser promises what
   * levelling up pays, not what buying the season pays (C8.5 owns both tracks).
   *
   * `nextTier` is `null` at the top of the ladder — there is no level above the
   * last one, and inventing one would promise a reward the season cannot give.
   */
  currentTier: BattlePassTier | null
  nextTier: BattlePassTier | null
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

    // Off the full ladder, not off the filtered `tiers`: a caller asking for the
    // paid lane alone must still be told where the free lane stands, or the pair
    // would change meaning with the query.
    const onFreeTrack = (level: number) =>
      db.battlePassTiers.find((t) => t.level === level && t.track === 'free') ?? null

    return {
      season,
      userSeason,
      tiers,
      xpIntoLevel: userSeason.xp % XP_PER_LEVEL,
      xpForNextLevel: XP_PER_LEVEL,
      claimable: tiers.filter((t) => t.unlocked && !t.claimed).length,
      currentTier: onFreeTrack(userSeason.level),
      nextTier: userSeason.level >= season.levels ? null : onFreeTrack(userSeason.level + 1),
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
  /** Which column the board is ranked by. Defaults to the season's hours. */
  metric?: LeaderboardMetric
  /** Hide members who opted out of the board (F2.5 privacy). */
  respectPrivacy?: boolean
  /** Whose row to chase down the list. `null` for an unattended kiosk. */
  viewerId?: ID | null
}

/**
 * `GET /api/loyalty/leaderboard` — the top N in one ordering, plus the viewer's
 * place in it.
 *
 * Three decisions live here rather than on the card (C3.10):
 *
 *  1. **Ranking is server-side, per metric.** Re-sorting ten rows in the browser
 *     when the switcher moves would rank the *page*, not the club: the tenth by
 *     hours is not the tenth by wins, and the player sitting 11th on coins would
 *     never appear however the reader sorted. So the metric is a parameter, the
 *     whole field is ordered by it, and `rank` is stamped on the way out.
 *  2. **A hidden member is hidden before the numbers are handed out.** Filtering
 *     after ranking would leave a board that goes 1, 2, 4 — printing the exact
 *     fact the opt-out was meant to withhold. The viewer's own row survives their
 *     own opt-out: it is their number, and it is only ever sent to them.
 *  3. **The viewer's row is chased down the entire list.** That is what makes a
 *     top-10 usable for someone lying twelfth — and it is `null` when they are
 *     already on the page, so the card never prints one player twice.
 */
export function fetchLeaderboard(params: LeaderboardQuery = {}): Promise<LeaderboardBoard> {
  return query('loyalty.fetchLeaderboard', () => {
    const {
      limit = 10,
      metric = 'hours',
      respectPrivacy = true,
      viewerId = db.currentUserId,
    } = params

    // `null` means *nobody*, and it has to survive the whole way down. Passing
    // `viewerId ?? undefined` here would hand `getLeaderboard` an `undefined`,
    // whose default parameter is `db.currentUserId` — so an unattended kiosk
    // would flag the previous member's row as "you" and pin their standing under
    // the board, which is the one thing this endpoint's `null` exists to prevent.
    const ranked = getLeaderboard(viewerId)
      .filter(
        (row) =>
          !respectPrivacy ||
          getPrivacy(row.userId).showOnLeaderboard ||
          // Their own standing is never withheld from them.
          row.userId === viewerId,
      )
      // Ties broken by season hours, then by nickname: two players on 41 wins
      // must not swap places between two polls of the same unchanged data.
      .sort(
        (a, b) =>
          b[metric] - a[metric] ||
          b.hours - a.hours ||
          a.nickname.localeCompare(b.nickname),
      )
      .map(({ userId, ...row }, index) => ({ entry: { ...row, rank: index + 1 }, userId }))

    const rows = ranked.slice(0, limit)
    const viewerAt = ranked.findIndex((r) => r.userId === viewerId)

    return {
      metric,
      rows: rows.map((r) => r.entry),
      // Only when they fall off the page — otherwise the card would print the
      // same member in the list and again in the pinned row below it.
      viewer: viewerAt >= limit ? ranked[viewerAt].entry : null,
      total: ranked.length,
    }
  })
}

/** `GET /api/loyalty/coins` — balance only, for the header chip. */
export function fetchCoins(userId: ID = db.currentUserId): Promise<Coins> {
  return query('loyalty.fetchCoins', () => required(getPlayer(userId)).wallet.coins)
}
