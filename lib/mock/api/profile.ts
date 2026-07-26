// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/me/*`. The flattened profile the launcher renders, plus preferences.
import { mutate, query, required } from '@/lib/mock/api/client'
import { db, getPlayer } from '@/lib/mock/db'
import type { Lang } from '@/lib/i18n/types'
import type { ID } from '@/lib/types/common'
import type { UserPreferences } from '@/lib/types/settings'
import type { PrivacySettings, UserProfile, Wallet } from '@/lib/types/user'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `Jan 2024` style label, formatted in UTC so SSR and the client agree. */
function formatMemberSince(iso: string): string {
  const date = new Date(iso)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** XP needed for the next level — flat curve until the server owns the formula. */
export function xpForLevel(level: number): number {
  return level * 800
}

/**
 * Assembles `UserProfile` the way the server will: joins the account, its wallet
 * and the precomputed stats, so the UI never sums anything itself.
 *
 * Exported (not an endpoint) because `auth.ts` returns a profile on sign-in.
 */
export function buildProfile(userId: ID = db.currentUserId): UserProfile {
  const { user, wallet, stats } = required(getPlayer(userId))
  const prefs = db.userPreferences.find((p) => p.userId === user.id)

  return {
    nickname: user.nickname,
    email: user.email,
    // Member profiles carry their own interface language (F2.5).
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

/** `GET /api/me` */
export function fetchProfile(userId: ID = db.currentUserId): Promise<UserProfile> {
  return query('profile.fetchProfile', () => buildProfile(userId))
}

/** `GET /api/me/wallet` — money in cents and coins, never a formatted string. */
export function fetchWallet(userId: ID = db.currentUserId): Promise<Wallet> {
  return query('profile.fetchWallet', () => required(getPlayer(userId)).wallet)
}

/** `GET /api/me/preferences` */
export function fetchPreferences(userId: ID = db.currentUserId): Promise<UserPreferences> {
  return query('profile.fetchPreferences', () =>
    required(db.userPreferences.find((p) => p.userId === userId)),
  )
}

/**
 * `PATCH /api/me/preferences` — partial update, returns the whole record so the
 * client always renders server truth rather than its own optimistic merge.
 */
export function updatePreferences(
  patch: Partial<Omit<UserPreferences, 'userId'>>,
  userId: ID = db.currentUserId,
): Promise<UserPreferences> {
  return mutate('profile.updatePreferences', () => {
    const prefs = required(db.userPreferences.find((p) => p.userId === userId))
    Object.assign(prefs, patch)
    return prefs
  })
}

/** `PUT /api/me/preferences/locale` — used by the language switcher (F2.5). */
export function updateLocale(
  locale: Lang,
  userId: ID = db.currentUserId,
): Promise<UserPreferences> {
  return mutate('profile.updateLocale', () => {
    const prefs = required(db.userPreferences.find((p) => p.userId === userId))
    prefs.locale = locale
    return prefs
  })
}

/** `PUT /api/me/privacy` */
export function updatePrivacy(
  patch: Partial<PrivacySettings>,
  userId: ID = db.currentUserId,
): Promise<PrivacySettings> {
  return mutate('profile.updatePrivacy', () => {
    const prefs = required(db.userPreferences.find((p) => p.userId === userId))
    Object.assign(prefs.privacy, patch)
    return prefs.privacy
  })
}
