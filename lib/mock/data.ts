// MOCK ONLY — legacy view over `lib/mock/db.ts` (F3.3).
//
// The screens built in Stage F1 consume these flat arrays. Rather than keep a
// second copy of the dataset, every export here is *derived* from the single
// mock store, so there is exactly one place to edit. F3.4 replaces these imports
// with the async API layer and this file goes away.
import {
  db,
  getCurrentPlayer,
  getLeaderboard,
} from '@/lib/mock/db'
import type { Game, HouseAccount, ShopItem } from '@/lib/types/catalog'
import type {
  Achievement,
  ActivityEvent,
  LeaderboardEntry,
  Prize,
} from '@/lib/types/loyalty'
import type { Pass } from '@/lib/types/pass'
import type { UserProfile } from '@/lib/types/user'

/** Whole euros for the legacy `ShopItem.price` field. Cents stay in the db. */
function toEuros(cents: number): number {
  return cents / 100
}

export const GAMES: Game[] = db.games

export const TOP_GAMES: Game[] = db.featuredGameIds.flatMap((id) => {
  const game = db.games.find((g) => g.id === id)
  return game ? [game] : []
})

export const LEADERBOARD: LeaderboardEntry[] = getLeaderboard().slice(0, 10)

const PRIZE_ICONS: Record<string, string> = {
  'rw-sticker': 'sticker',
  'rw-drink': 'cup-soda',
  'rw-hour': 'clock',
  'rw-tshirt': 'shirt',
  'rw-mouse': 'mouse',
  'rw-vip-night': 'crown',
}

export const PRIZES: Prize[] = db.featuredRewardIds.flatMap((id) => {
  const reward = db.rewards.find((r) => r.id === id)
  if (!reward) return []
  return [{ coins: reward.costCoins, reward: reward.name, icon: PRIZE_ICONS[id] ?? 'gift' }]
})

export const HOUSE_ACCOUNTS: HouseAccount[] = db.houseAccounts

/** Human-readable summary of when and where a pass may be used. */
function describePass(pass: Pass): string {
  const parts: string[] = []
  if (pass.timeWindow) {
    parts.push(`${pass.timeWindow.from} – ${pass.timeWindow.to}${pass.unlimitedInWindow ? ' unlimited' : ''}`)
  }
  if (pass.bonusMinutes > 0) parts.push(`+${pass.bonusMinutes} min bonus`)
  if (pass.zoneScope.length > 0) parts.push(`${pass.zoneScope.join(', ').toUpperCase()} zone only`)
  if (pass.validDays.length > 0) parts.push('Weekends only')
  if (parts.length === 0) parts.push('Any zone, any time')
  return parts.join(' · ')
}

export const SHOP_TIME: ShopItem[] = db.passes
  .filter((p) => p.active && p.visibleTo === 'everyone')
  .map((p) => ({
    id: p.id,
    name: p.name,
    price: toEuros(p.priceCents),
    tag: p.id === 'pass-5h' ? 'Popular' : undefined,
    description: describePass(p),
  }))

export const SHOP_MEMBERSHIPS: ShopItem[] = db.products
  .filter((p) => p.category === 'membership')
  .map((p) => ({
    id: p.id,
    name: p.name.replace(' Membership', ''),
    price: toEuros(p.priceCents),
    tag: p.tag,
    description: p.description,
  }))

export const SHOP_ITEMS: ShopItem[] = db.products
  .filter((p) => p.category !== 'membership' && p.category !== 'time')
  .map((p) => ({
    id: p.id,
    name: p.name,
    price: toEuros(p.priceCents),
    tag: p.tag,
    description: p.description,
  }))

export const ACHIEVEMENTS: Achievement[] = db.achievements

export const ACTIVITY: ActivityEvent[] = db.activity

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `Jan 2024` style label. Formatted in UTC so SSR and the client agree. */
function formatMemberSince(iso: string): string {
  const date = new Date(iso)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** XP needed for the next level — flat curve until the server owns it. */
function xpForLevel(level: number): number {
  return level * 800
}

function buildProfile(): UserProfile {
  const { user, wallet, stats } = getCurrentPlayer()
  const prefs = db.userPreferences.find((p) => p.userId === user.id)

  return {
    nickname: user.nickname,
    email: user.email,
    // Member profiles carry their own interface language (F2.5). The demo member
    // is a Russian speaker, so signing in switches the shell to RU.
    lang: prefs?.locale,
    level: user.level,
    xp: user.xp,
    xpMax: xpForLevel(user.level + 1),
    coins: wallet.coins,
    memberSince: formatMemberSince(user.createdAt),
    totalHours: stats.totalHours,
    gamesPlayed: stats.gamesPlayed,
    sessions: stats.sessions,
    achievementsUnlocked: db.achievements.filter((a) => a.unlocked).length,
    achievementsTotal: db.achievements.length,
  }
}

export const DEMO_USER: UserProfile = buildProfile()
