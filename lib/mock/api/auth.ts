// MOCK ONLY — replaced by the real auth endpoints in Stage 4 (F3.4).
//
// `POST /api/auth/*`. Sign-in, registration, password recovery (email OTP),
// guest check-in and the QR handshake.
import { ApiError, mutate, newId, query } from '@/lib/mock/api/client'
import { buildProfile } from '@/lib/mock/api/profile'
import { CLUB_ID, db, getCurrentPlayer } from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'
import type { UserProfile, UserRole } from '@/lib/types/user'

export interface LoginPayload {
  identifier: string
  password: string
}

export interface AuthResult {
  profile: UserProfile
  /** Opaque token. The real API returns a JWT; nothing reads the contents. */
  token: string
  role: UserRole
}

const MIN_PASSWORD = 6

/**
 * `POST /api/auth/login`.
 *
 * The demo accepts any password except the literal `fail`, which is the documented
 * way to exercise the error path from the UI (see `auth.passwordPlaceholder`).
 * Field-level problems come back as `validation` with a `fields` map, so the form
 * can highlight the offending input instead of only showing a toast.
 */
export function login(payload: LoginPayload): Promise<AuthResult> {
  return mutate('auth.login', () => {
    const identifier = payload.identifier.trim()
    const fields: Record<string, 'required' | 'tooShort'> = {}
    if (!identifier) fields.identifier = 'required'
    if (!payload.password) fields.password = 'required'
    if (Object.keys(fields).length > 0) {
      throw new ApiError('validation', fields as never)
    }
    if (payload.password.toLowerCase() === 'fail') {
      throw new ApiError('invalidCredentials')
    }

    // Match a known demo account by nickname or email so signing in as
    // `ProGamer97` really lands you in that player's data.
    const match = [...db.players.values()].find(
      (p) =>
        p.user.nickname.toLowerCase() === identifier.toLowerCase() ||
        p.user.email.toLowerCase() === identifier.toLowerCase(),
    )

    if (match) {
      db.currentUserId = match.user.id
      return {
        profile: buildProfile(match.user.id),
        token: newId('tok'),
        role: match.user.role,
      }
    }

    // Unknown identifier: the demo signs the visitor in as the demo member but
    // keeps the typed name, which is what the F1 lock screen expects.
    const current = getCurrentPlayer()
    current.user.nickname = identifier.includes('@') ? identifier.split('@')[0] : identifier
    current.user.email = identifier.includes('@') ? identifier : current.user.email
    return {
      profile: buildProfile(current.user.id),
      token: newId('tok'),
      role: current.user.role,
    }
  })
}

export interface RegisterPayload {
  nickname: string
  email: string
  password: string
  confirmPassword: string
}

/** `POST /api/auth/register`. Validates like the server will, then signs in. */
export function register(payload: RegisterPayload): Promise<AuthResult> {
  return mutate('auth.register', () => {
    const fields: Record<string, string> = {}
    if (!payload.nickname.trim()) fields.nickname = 'required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) fields.email = 'invalidEmail'
    if (payload.password.length < MIN_PASSWORD) fields.password = 'tooShort'
    if (payload.password !== payload.confirmPassword) {
      fields.confirmPassword = 'passwordsMismatch'
    }
    if (Object.keys(fields).length > 0) {
      throw new ApiError('validation', fields as never)
    }

    const taken = [...db.players.values()].some(
      (p) =>
        p.user.nickname.toLowerCase() === payload.nickname.trim().toLowerCase() ||
        p.user.email.toLowerCase() === payload.email.toLowerCase(),
    )
    if (taken) throw new ApiError('conflict')

    const id: ID = newId('u')
    db.players.set(id, {
      user: {
        id,
        clubId: CLUB_ID,
        nickname: payload.nickname.trim(),
        email: payload.email.toLowerCase(),
        role: 'member',
        level: 1,
        xp: 0,
        createdAt: db.now,
      },
      wallet: { userId: id, moneyCents: 0, coins: 0 },
      stats: {
        totalHours: 0,
        gamesPlayed: 0,
        sessions: 0,
        seasonHours: 0,
        seasonCoins: 0,
        achievementsUnlocked: 0,
      },
      online: false,
      machineId: null,
      playingGameId: null,
    })
    db.currentUserId = id

    return { profile: buildProfile(id), token: newId('tok'), role: 'member' as UserRole }
  })
}

/** `POST /api/auth/demo` — the one-click demo entry on the lock screen. */
export function loginAsDemo(): Promise<AuthResult> {
  return mutate('auth.loginAsDemo', () => {
    db.currentUserId = 'u-demo'
    return {
      profile: buildProfile('u-demo'),
      token: newId('tok'),
      role: 'member' as UserRole,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Password recovery — email OTP (C1.3)
 * ------------------------------------------------------------------ */

/**
 * A live recovery attempt. Server-side state only: the code, the attempt
 * counter and the cooldown never travel to the client in the real API, so they
 * live here and not in `db` (they are also not worth persisting across a reload
 * — a half-finished recovery is meant to expire).
 */
interface ResetChallenge {
  userId: ID | null
  email: string
  code: string
  /** Epoch ms. Real clock on purpose — see `resetClock()`. */
  expiresAt: number
  lastSentAt: number
  attemptsLeft: number
  /** Handed out by `verifyPasswordResetCode`, spent by `completePasswordReset`. */
  resetToken: string | null
}

const resetChallenges = new Map<ID, ResetChallenge>()

/** Digits in the emailed code. The UI reads this off the response (C1.3). */
export const RESET_CODE_LENGTH = 6
/** Seconds before the code dies. */
const RESET_CODE_TTL_SEC = 600
/** Seconds between two send requests — the spec's 60 s guard. */
const RESET_RESEND_COOLDOWN_SEC = 60
/** Wrong tries before the challenge is burned and the player starts over. */
const RESET_MAX_ATTEMPTS = 5

/**
 * The one place in the mock that reads the wall clock instead of `db.now`.
 *
 * `db.now` is a *frozen* Sunday evening (see `lib/mock/db.ts`), which is
 * exactly right for seeded data and exactly wrong for a cooldown: every resend
 * would be "0 s ago" forever and the 60 s guard would never expire. Codes and
 * cooldowns are wall-clock objects, so they use the wall clock — and the
 * responses hand the UI *durations* (`resendAfterSec`, `expiresInSec`) rather
 * than timestamps, so no screen has to guess which clock a stamp came from.
 */
function resetClock(): number {
  return Date.now()
}

/** `p•••@imba.club` — enough to recognize the inbox, not enough to harvest it. */
function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@')
  const head = name.slice(0, 1)
  return `${head}${'•'.repeat(Math.max(2, Math.min(6, name.length - 1)))}@${domain}`
}

function generateResetCode(): string {
  let code = ''
  for (let i = 0; i < RESET_CODE_LENGTH; i += 1) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

export interface PasswordResetChallenge {
  challengeId: ID
  /** Masked destination for the "we sent it to …" line. Never the full address. */
  maskedEmail: string
  /** Digits expected — so the code input is not a hard-coded 6 in the UI. */
  codeLength: number
  /** Seconds until the code dies. A duration, not a stamp (see `resetClock`). */
  expiresInSec: number
  /** Seconds until `resendPasswordResetCode` stops answering `rateLimited`. */
  resendAfterSec: number
  /**
   * MOCK ONLY — the code itself, because nothing here sends mail. The real
   * endpoint obviously does not return it; the field is optional so the UI has
   * to treat it as a demo hint (a dev plate) and cannot depend on it.
   */
  devCode?: string
}

function issued(challengeId: ID, challenge: ResetChallenge): PasswordResetChallenge {
  return {
    challengeId,
    maskedEmail: maskEmail(challenge.email),
    codeLength: RESET_CODE_LENGTH,
    expiresInSec: Math.max(0, Math.round((challenge.expiresAt - resetClock()) / 1000)),
    resendAfterSec: RESET_RESEND_COOLDOWN_SEC,
    devCode: challenge.code,
  }
}

/**
 * `POST /api/auth/password/forgot`.
 *
 * Answers the same way for a known and an unknown address — an endpoint that
 * 404s on "no such member" is an account-enumeration oracle. So an unknown
 * email still gets a challenge with a code nobody will ever receive, and the
 * flow only fails at `completePasswordReset`, which has no user to write to.
 */
export function requestPasswordReset(email: string): Promise<PasswordResetChallenge> {
  return mutate('auth.requestPasswordReset', () => {
    const address = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
      throw new ApiError('validation', { email: 'invalidEmail' } as never)
    }

    const match = [...db.players.values()].find((p) => p.user.email.toLowerCase() === address)

    const challengeId = newId('pwd')
    const now = resetClock()
    const challenge: ResetChallenge = {
      userId: match?.user.id ?? null,
      email: address,
      code: generateResetCode(),
      expiresAt: now + RESET_CODE_TTL_SEC * 1000,
      lastSentAt: now,
      attemptsLeft: RESET_MAX_ATTEMPTS,
      resetToken: null,
    }
    resetChallenges.set(challengeId, challenge)
    return issued(challengeId, challenge)
  })
}

/**
 * `POST /api/auth/password/resend`.
 *
 * The cooldown is enforced *here*, not only by a disabled button: a kiosk
 * keyboard can hold Enter, and the UI timer is a courtesy, not a guard. Each
 * resend mints a new code and restores the attempt budget, because the player
 * is about to type a different number.
 */
export function resendPasswordResetCode(challengeId: ID): Promise<PasswordResetChallenge> {
  return mutate('auth.resendPasswordResetCode', () => {
    const challenge = resetChallenges.get(challengeId)
    if (!challenge) throw new ApiError('notFound')

    const now = resetClock()
    const waited = (now - challenge.lastSentAt) / 1000
    if (waited < RESET_RESEND_COOLDOWN_SEC) throw new ApiError('rateLimited')

    challenge.code = generateResetCode()
    challenge.expiresAt = now + RESET_CODE_TTL_SEC * 1000
    challenge.lastSentAt = now
    challenge.attemptsLeft = RESET_MAX_ATTEMPTS
    challenge.resetToken = null
    return issued(challengeId, challenge)
  })
}

export interface PasswordResetVerification {
  /** Single-use ticket for `completePasswordReset`. */
  resetToken: string
  /** Seconds left to set the new password before the ticket dies with the code. */
  expiresInSec: number
}

/**
 * `POST /api/auth/password/verify`.
 *
 * Splitting verification from the new password is what makes the code screen a
 * screen: the player proves the inbox first and only then sees the password
 * fields, instead of typing a password into a form that may reject the code.
 */
export function verifyPasswordResetCode(
  challengeId: ID,
  code: string,
): Promise<PasswordResetVerification> {
  return mutate('auth.verifyPasswordResetCode', () => {
    const challenge = resetChallenges.get(challengeId)
    if (!challenge) throw new ApiError('notFound')
    if (resetClock() > challenge.expiresAt) {
      // Expired ≠ wrong: `timeout` tells the UI to offer a resend, the way the
      // QR handshake does, instead of accusing the player of a typo.
      throw new ApiError('timeout')
    }

    const entered = code.replace(/\D/g, '')
    if (entered.length !== RESET_CODE_LENGTH) {
      throw new ApiError('validation', { code: 'required' } as never)
    }
    if (entered !== challenge.code) {
      challenge.attemptsLeft -= 1
      if (challenge.attemptsLeft <= 0) {
        // Burned: the challenge is gone, so a brute-force run has to go back
        // through `requestPasswordReset` and its cooldown. `rateLimited` and not
        // `forbidden` — "not allowed for your account" would read as "you are
        // banned" to someone who simply mistyped five times.
        resetChallenges.delete(challengeId)
        throw new ApiError('rateLimited')
      }
      throw new ApiError('invalidCode')
    }

    challenge.resetToken = newId('rst')
    return {
      resetToken: challenge.resetToken,
      expiresInSec: Math.max(0, Math.round((challenge.expiresAt - resetClock()) / 1000)),
    }
  })
}

export interface CompletePasswordResetPayload {
  challengeId: ID
  resetToken: string
  password: string
  confirmPassword: string
}

/**
 * `POST /api/auth/password/reset`.
 *
 * Signs the player in on success. On a station this is the point of the whole
 * flow — someone locked out is standing at the PC, and sending them back to
 * the login form to retype the password they just chose would be theatre.
 * The mock has no password store, so nothing is written: the demo accepts any
 * password at sign-in anyway, and inventing a hash here would fake a
 * guarantee the mock cannot make.
 */
export function completePasswordReset(
  payload: CompletePasswordResetPayload,
): Promise<AuthResult> {
  return mutate('auth.completePasswordReset', () => {
    const challenge = resetChallenges.get(payload.challengeId)
    if (!challenge || !challenge.resetToken) throw new ApiError('notFound')
    if (challenge.resetToken !== payload.resetToken) throw new ApiError('unauthorized')
    if (resetClock() > challenge.expiresAt) throw new ApiError('timeout')

    const fields: Record<string, string> = {}
    if (payload.password.length < MIN_PASSWORD) fields.password = 'tooShort'
    if (payload.password !== payload.confirmPassword) {
      fields.confirmPassword = 'passwordsMismatch'
    }
    if (Object.keys(fields).length > 0) {
      throw new ApiError('validation', fields as never)
    }

    // Unknown address: the challenge existed only so the endpoint above could
    // not be used to enumerate accounts. There is nobody to sign in.
    if (!challenge.userId) {
      resetChallenges.delete(payload.challengeId)
      throw new ApiError('notFound')
    }

    resetChallenges.delete(payload.challengeId)
    db.currentUserId = challenge.userId
    const player = db.players.get(challenge.userId)
    return {
      profile: buildProfile(challenge.userId),
      token: newId('tok'),
      role: (player?.user.role ?? 'member') as UserRole,
    }
  })
}

export interface GuestSessionResult {
  guestId: ID
  label: string
  machineId: ID
}

/**
 * `POST /api/auth/guest` — walk-in check-in. Guests get a session and a tab like
 * anyone else; converting them later keeps both (MVP §8.2).
 */
export function continueAsGuest(): Promise<GuestSessionResult> {
  return mutate('auth.continueAsGuest', () => {
    if (!db.clubSettings.guestCheckoutEnabled) throw new ApiError('forbidden')
    const guestId = newId('guest')
    return {
      guestId,
      label: `Guest ${guestId.slice(-4).toUpperCase()}`,
      machineId: db.currentMachineId,
    }
  })
}

export interface QrChallenge {
  challengeId: ID
  /** What the phone app encodes. Never a credential. */
  payload: string
  expiresAt: string
}

/** `POST /api/auth/qr` — opens a QR handshake for the companion app. */
export function requestQrChallenge(): Promise<QrChallenge> {
  return query('auth.requestQrChallenge', () => {
    const challengeId = newId('qr')
    return {
      challengeId,
      payload: `imba://auth/${challengeId}`,
      expiresAt: new Date(Date.parse(db.now) + 120_000).toISOString(),
    }
  })
}

/**
 * `GET /api/auth/qr/:id` — poll for confirmation. The mock confirms immediately;
 * the UI still has to handle the pending state because the real one will not.
 */
export function confirmQrChallenge(challengeId: ID): Promise<AuthResult> {
  return mutate('auth.confirmQrChallenge', () => {
    if (!challengeId) throw new ApiError('validation')
    db.currentUserId = 'u-demo'
    return {
      profile: buildProfile('u-demo'),
      token: newId('tok'),
      role: 'member' as UserRole,
    }
  })
}

/** `POST /api/auth/logout`. Ends presence but leaves the session record alone. */
export function logout(): Promise<void> {
  return mutate('auth.logout', () => {
    const player = db.players.get(db.currentUserId)
    if (player) {
      player.online = false
      player.playingGameId = null
    }
  })
}
