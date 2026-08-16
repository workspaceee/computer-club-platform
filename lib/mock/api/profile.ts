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
    // Zero until the club has counted a second day in a row (C3.1), so a brand
    // new account is greeted as a first visit rather than with a streak of one.
    visitStreak: stats.visitStreak ?? 0,
    // "Has anyone ever played here on this account" (C3.13). Three counters and
    // not one, because each of them can legitimately be zero on its own: an
    // account can have a finished visit that never launched anything (came in,
    // ordered a cola, left), and the visit currently running is not counted in
    // `sessions` until it ends — which is exactly the evening this flag is for.
    // The one thing that must never happen is a veteran being told to pick their
    // first game, so the flag only stays true while *all* of it is still zero.
    isNewcomer: stats.sessions === 0 && stats.gamesPlayed === 0 && stats.totalHours === 0,
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

/**
 * `PUT /api/me/onboarding` — the player finished or skipped the first-run tour
 * (C3.12).
 *
 * Its own endpoint rather than `updatePreferences({ onboardingCompletedAt })`
 * because the client has no business choosing the timestamp: "when did this
 * happen" is the server's clock, and a station whose system time is a day out
 * would otherwise be able to write a completion into the future. **Finishing and
 * skipping land here identically** — both mean "this player has been offered the
 * tour", and a skip that recorded nothing would re-open the overlay on the next
 * screen the player opened.
 */
export function completeOnboarding(userId: ID = db.currentUserId): Promise<UserPreferences> {
  return mutate('profile.completeOnboarding', () => {
    const prefs = required(db.userPreferences.find((p) => p.userId === userId))
    prefs.onboardingCompletedAt = new Date(db.now).toISOString()
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
