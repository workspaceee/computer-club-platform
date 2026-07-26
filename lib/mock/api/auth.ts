// MOCK ONLY — replaced by the real auth endpoints in Stage 4 (F3.4).
//
// `POST /api/auth/*`. Sign-in, registration, guest check-in and the QR handshake.
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
