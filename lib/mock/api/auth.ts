// MOCK ONLY — replaced by the real auth endpoints in Stage 4 (F3.4).
//
// `POST /api/auth/*`. Sign-in, registration, password recovery (email OTP),
// guest check-in and the QR handshake.
import { ApiError, mutate, newId, query, required } from '@/lib/mock/api/client'
import { buildProfile } from '@/lib/mock/api/profile'
import { resumeSessionRow, secondsLeft } from '@/lib/mock/api/session'
import { CLUB_ID, db, getCurrentPlayer, getLiveSession, getSession } from '@/lib/mock/db'
import type { ID, ISODateTime, Seconds } from '@/lib/types/common'
import type { SessionSnapshot } from '@/lib/types/session'
import type { UserProfile, UserRole } from '@/lib/types/user'

export interface LoginPayload {
  identifier: string
  password: string
}

export interface AuthResult {
  profile: UserProfile
  /**
   * The account this session belongs to.
   *
   * `UserProfile` is display data — nickname, level, coins — and it carries no id
   * on purpose, so it can be handed to a HUD without handing over an identity.
   * The seat check (C1.7) asks an identity question — "is the live session on
   * this machine *this* person's?" — so the id travels with the session, next to
   * the token, which is where the real API puts it too.
   */
  userId: ID
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
        userId: match.user.id,
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
      userId: current.user.id,
      token: newId('tok'),
      role: current.user.role,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Nicknames — the live availability check (C1.4)
 * ------------------------------------------------------------------ */

/** Shortest nickname the club accepts. The UI reads this off the module. */
export const NICKNAME_MIN = 3
/** Longest — a scoreboard, a party list and a HUD chip all have to hold it. */
export const NICKNAME_MAX = 16
/** Latin letters, digits, underscore. No spaces: the name is also a login. */
const NICKNAME_ALLOWED = /^[A-Za-z0-9_]+$/

/**
 * Names the club keeps for itself. Not a moderation list — it exists so nobody
 * can sign in as something an admin would trust on a leaderboard or in a chat.
 */
const RESERVED_NICKNAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'imba',
  'imbaclub',
  'staff',
  'support',
  'owner',
  'root',
  'system',
  'guest',
])

/**
 * Why a nickname cannot be used — or `free`.
 *
 * One verdict instead of a bare boolean, because the four refusals have four
 * different repairs: shorten it, lengthen it, drop the punctuation, or pick
 * another name entirely. A `false` would make the field say "unavailable" to
 * someone whose only problem is a dot.
 */
export type NicknameVerdict = 'free' | 'taken' | 'reserved' | 'tooShort' | 'tooLong' | 'badChars'

export interface NicknameCheck {
  /** Echoed back, so a late answer to an old keystroke can be discarded. */
  nickname: string
  verdict: NicknameVerdict
  available: boolean
  /**
   * Free names close to the one asked for — only for `taken` / `reserved`,
   * where the player has to change the *name* and not fix its shape.
   */
  suggestions: string[]
}

function nicknameExists(nickname: string): boolean {
  const wanted = nickname.toLowerCase()
  return [...db.players.values()].some((p) => p.user.nickname.toLowerCase() === wanted)
}

function emailExists(email: string): boolean {
  const wanted = email.toLowerCase()
  return [...db.players.values()].some((p) => p.user.email.toLowerCase() === wanted)
}

/** The whole rule set in one place — the live check and signup share it. */
function judgeNickname(raw: string): NicknameVerdict {
  const nickname = raw.trim()
  if (nickname.length < NICKNAME_MIN) return 'tooShort'
  if (nickname.length > NICKNAME_MAX) return 'tooLong'
  if (!NICKNAME_ALLOWED.test(nickname)) return 'badChars'
  if (RESERVED_NICKNAMES.has(nickname.toLowerCase())) return 'reserved'
  if (nicknameExists(nickname)) return 'taken'
  return 'free'
}

/** Three names that are actually free, derived from what was typed. */
function suggestNicknames(raw: string): string[] {
  const base = raw.trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, NICKNAME_MAX - 3) || 'player'
  const candidates = [`${base}_imba`, `${base}${new Date().getFullYear() % 100}`, `${base}_01`, `x${base}`]
  return candidates
    .filter((c) => c.length <= NICKNAME_MAX && judgeNickname(c) === 'free')
    .slice(0, 3)
}

/**
 * `GET /api/auth/nickname?value=…` — the as-you-type check (C1.4).
 *
 * A read, not a reservation: nothing is held, so two players typing the same
 * name both hear "free" and the loser finds out at `completeRegistration`,
 * which is the only place that can actually claim it. That is the honest shape
 * of this endpoint, and it is why the signup path re-judges the name instead of
 * trusting the green tick the form is showing.
 */
export function checkNickname(nickname: string): Promise<NicknameCheck> {
  return query('auth.checkNickname', () => {
    const verdict = judgeNickname(nickname)
    return {
      nickname: nickname.trim(),
      verdict,
      available: verdict === 'free',
      suggestions: verdict === 'taken' || verdict === 'reserved' ? suggestNicknames(nickname) : [],
    }
  })
}

/**
 * Writes the member row. The only account writer in the mock, so a player
 * created by the signup flow is indistinguishable from a seeded one.
 */
function createMember(nickname: string, email: string): ID {
  const id: ID = newId('u')
  db.players.set(id, {
    user: {
      id,
      clubId: CLUB_ID,
      nickname: nickname.trim(),
      email: email.toLowerCase(),
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
  return id
}

/** `POST /api/auth/demo` — the one-click demo entry on the lock screen. */
export function loginAsDemo(): Promise<AuthResult> {
  return mutate('auth.loginAsDemo', () => {
    db.currentUserId = 'u-demo'
    return {
      profile: buildProfile('u-demo'),
      userId: 'u-demo',
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
  /** Epoch ms. Real clock on purpose — see `otpClock()`. */
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
 * Shared by both one-time-code flows — recovery (C1.3) and signup (C1.4).
 *
 * `db.now` is a *frozen* Sunday evening (see `lib/mock/db.ts`), which is
 * exactly right for seeded data and exactly wrong for a cooldown: every resend
 * would be "0 s ago" forever and the 60 s guard would never expire. Codes and
 * cooldowns are wall-clock objects, so they use the wall clock — and the
 * responses hand the UI *durations* (`resendAfterSec`, `expiresInSec`) rather
 * than timestamps, so no screen has to guess which clock a stamp came from.
 */
function otpClock(): number {
  return Date.now()
}

/** `p•••@imba.club` — enough to recognize the inbox, not enough to harvest it. */
function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@')
  const head = name.slice(0, 1)
  return `${head}${'•'.repeat(Math.max(2, Math.min(6, name.length - 1)))}@${domain}`
}

function generateOtpCode(): string {
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
  /** Seconds until the code dies. A duration, not a stamp (see `otpClock`). */
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
    expiresInSec: Math.max(0, Math.round((challenge.expiresAt - otpClock()) / 1000)),
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
    const now = otpClock()
    const challenge: ResetChallenge = {
      userId: match?.user.id ?? null,
      email: address,
      code: generateOtpCode(),
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

    const now = otpClock()
    const waited = (now - challenge.lastSentAt) / 1000
    if (waited < RESET_RESEND_COOLDOWN_SEC) throw new ApiError('rateLimited')

    challenge.code = generateOtpCode()
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
    if (otpClock() > challenge.expiresAt) {
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
      expiresInSec: Math.max(0, Math.round((challenge.expiresAt - otpClock()) / 1000)),
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
    if (otpClock() > challenge.expiresAt) throw new ApiError('timeout')

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
      userId: challenge.userId,
      token: newId('tok'),
      role: (player?.user.role ?? 'member') as UserRole,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Registration — email confirmed by code (C1.4)
 * ------------------------------------------------------------------ */

/**
 * A signup waiting for its code.
 *
 * The typed name, address and password live *here* and not in `db.players`,
 * because an account whose email was never confirmed is not a member: it is a
 * pending intent. Nothing is written until `completeRegistration`, so a player
 * who walks away at the code step leaves no half-account behind, and the
 * nickname they were about to take stays free for the next person.
 */
interface SignupChallenge {
  nickname: string
  email: string
  password: string
  code: string
  /** Epoch ms — the same wall clock as recovery (see `otpClock()`). */
  expiresAt: number
  lastSentAt: number
  attemptsLeft: number
}

const signupChallenges = new Map<ID, SignupChallenge>()

/** Same shape of code as recovery: one OTP language across the product. */
const SIGNUP_CODE_LENGTH = RESET_CODE_LENGTH
const SIGNUP_CODE_TTL_SEC = RESET_CODE_TTL_SEC
const SIGNUP_RESEND_COOLDOWN_SEC = RESET_RESEND_COOLDOWN_SEC
const SIGNUP_MAX_ATTEMPTS = RESET_MAX_ATTEMPTS

export interface RegistrationChallenge {
  challengeId: ID
  /** Masked destination for the "we sent it to …" line. Never the full address. */
  maskedEmail: string
  codeLength: number
  /** Seconds until the code dies. A duration, not a stamp (see `otpClock`). */
  expiresInSec: number
  /** Seconds until `resendRegistrationCode` stops answering `rateLimited`. */
  resendAfterSec: number
  /** MOCK ONLY — nothing here sends mail, so the code is printed (dev plate). */
  devCode?: string
}

function issuedSignup(challengeId: ID, challenge: SignupChallenge): RegistrationChallenge {
  return {
    challengeId,
    maskedEmail: maskEmail(challenge.email),
    codeLength: SIGNUP_CODE_LENGTH,
    expiresInSec: Math.max(0, Math.round((challenge.expiresAt - otpClock()) / 1000)),
    resendAfterSec: SIGNUP_RESEND_COOLDOWN_SEC,
    devCode: challenge.code,
  }
}

export interface StartRegistrationPayload {
  nickname: string
  email: string
  password: string
  confirmPassword: string
  /** The club-rules checkbox. Server-checked, not just a disabled button. */
  acceptedRules: boolean
}

/**
 * `POST /api/auth/register/start` (C1.4).
 *
 * Validates everything the form validates — including the rules checkbox, which
 * is a *consent record* and therefore cannot be enforced only by a disabled CTA:
 * the club has to be able to say the box was ticked, and a client-side guard
 * proves nothing. Nickname and email conflicts are answered here rather than
 * after the code, so nobody reads their inbox to be told the name was taken.
 *
 * Unlike `requestPasswordReset`, a conflicting email *is* reported: this
 * endpoint cannot be an enumeration oracle it is not already — a sign-up form
 * that accepted a duplicate address would create an account nobody can use.
 */
export function startRegistration(
  payload: StartRegistrationPayload,
): Promise<RegistrationChallenge> {
  return mutate('auth.startRegistration', () => {
    const nickname = payload.nickname.trim()
    const email = payload.email.trim().toLowerCase()

    const fields: Record<string, string> = {}
    const verdict = judgeNickname(nickname)
    if (verdict !== 'free') fields.nickname = verdict
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = 'invalidEmail'
    else if (emailExists(email)) fields.email = 'conflict'
    if (payload.password.length < MIN_PASSWORD) fields.password = 'tooShort'
    if (payload.password !== payload.confirmPassword) {
      fields.confirmPassword = 'passwordsMismatch'
    }
    if (!payload.acceptedRules) fields.acceptedRules = 'required'
    if (Object.keys(fields).length > 0) {
      throw new ApiError('validation', fields as never)
    }

    // One live signup per address: a second attempt replaces the first, so a
    // player who mistyped the name and started over does not end up with two
    // valid codes in one inbox.
    for (const [id, existing] of signupChallenges) {
      if (existing.email === email) signupChallenges.delete(id)
    }

    const challengeId = newId('sgn')
    const now = otpClock()
    const challenge: SignupChallenge = {
      nickname,
      email,
      password: payload.password,
      code: generateOtpCode(),
      expiresAt: now + SIGNUP_CODE_TTL_SEC * 1000,
      lastSentAt: now,
      attemptsLeft: SIGNUP_MAX_ATTEMPTS,
    }
    signupChallenges.set(challengeId, challenge)
    return issuedSignup(challengeId, challenge)
  })
}

/**
 * `POST /api/auth/register/resend`. Same 60 s guard as recovery, enforced on the
 * server: a kiosk keyboard can hold Enter and a UI timer is a courtesy.
 */
export function resendRegistrationCode(challengeId: ID): Promise<RegistrationChallenge> {
  return mutate('auth.resendRegistrationCode', () => {
    const challenge = signupChallenges.get(challengeId)
    if (!challenge) throw new ApiError('notFound')

    const now = otpClock()
    if ((now - challenge.lastSentAt) / 1000 < SIGNUP_RESEND_COOLDOWN_SEC) {
      throw new ApiError('rateLimited')
    }

    challenge.code = generateOtpCode()
    challenge.expiresAt = now + SIGNUP_CODE_TTL_SEC * 1000
    challenge.lastSentAt = now
    challenge.attemptsLeft = SIGNUP_MAX_ATTEMPTS
    return issuedSignup(challengeId, challenge)
  })
}

/**
 * `POST /api/auth/register/confirm` — the one call that creates the account.
 *
 * The nickname and the address are judged **again** here, because the live check
 * reserves nothing (see `checkNickname`) and minutes may have passed while the
 * player looked for the mail. Losing that race is a `conflict` on the field, not
 * a generic failure, so the UI can send them back to the name and keep the rest
 * of what they typed.
 *
 * Success signs the player in: they are standing at the station, and a form that
 * says "account created, now log in" would be theatre.
 */
export function completeRegistration(challengeId: ID, code: string): Promise<AuthResult> {
  return mutate('auth.completeRegistration', () => {
    const challenge = signupChallenges.get(challengeId)
    if (!challenge) throw new ApiError('notFound')
    // Expired ≠ wrong: `timeout` tells the UI to offer a resend instead of
    // accusing the player of a typo.
    if (otpClock() > challenge.expiresAt) throw new ApiError('timeout')

    const entered = code.replace(/\D/g, '')
    if (entered.length !== SIGNUP_CODE_LENGTH) {
      throw new ApiError('validation', { code: 'required' } as never)
    }
    if (entered !== challenge.code) {
      challenge.attemptsLeft -= 1
      if (challenge.attemptsLeft <= 0) {
        // Burned: the pending signup is gone, so a brute-force run has to go
        // back through the form and its cooldown.
        signupChallenges.delete(challengeId)
        throw new ApiError('rateLimited')
      }
      throw new ApiError('invalidCode')
    }

    if (judgeNickname(challenge.nickname) !== 'free') {
      throw new ApiError('validation', { nickname: 'taken' } as never)
    }
    if (emailExists(challenge.email)) {
      throw new ApiError('validation', { email: 'conflict' } as never)
    }

    signupChallenges.delete(challengeId)
    const id = createMember(challenge.nickname, challenge.email)
    db.currentUserId = id
    return {
      profile: buildProfile(id),
      userId: id,
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

/* ------------------------------------------------------------------ *
 * QR sign-in — the station shows, the phone confirms (C1.5)
 * ------------------------------------------------------------------ */

/**
 * A live QR handshake. Server-side state, like both OTP flows above: the station
 * never learns anything about it beyond the id, the code it prints and the
 * deadline.
 *
 * The important field is `approval`. Until a phone fills it in, the challenge is
 * an *offer* and `confirmQrChallenge` refuses — which is what makes the flow real
 * instead of the old "ask and you are in": the answer arrives out of band, on the
 * bus, and only then does the station have a ticket worth spending.
 */
interface QrHandshake {
  /** The seat the code belongs to. A code printed on PC-17 opens PC-17. */
  machineId: ID
  /** The typeable form, for a camera that will not focus. */
  stationCode: string
  /** Epoch ms — the same wall clock as the codes above (see `otpClock()`). */
  expiresAt: number
  approval: { userId: ID; grantToken: string; device: string } | null
}

const qrHandshakes = new Map<ID, QrHandshake>()

/** Seconds a station code is worth showing. Short: it is on a public screen. */
const QR_TTL_SEC = 120

/**
 * Alphabet of the station code. No `O/0`, `I/1` or `S/5` — the code exists to be
 * read off a monitor and typed into a phone by somebody who is standing up.
 */
const QR_CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY2346789'
/** Characters per group. Two groups of three read back faster than one six. */
const QR_GROUP = 3

function generateStationCode(): string {
  let code = ''
  for (let i = 0; i < QR_GROUP * 2; i += 1) {
    code += QR_CODE_ALPHABET[Math.floor(Math.random() * QR_CODE_ALPHABET.length)]
  }
  return `${code.slice(0, QR_GROUP)}-${code.slice(QR_GROUP)}`
}

export interface QrChallenge {
  challengeId: ID
  /** What the camera reads. An id and a seat — never a credential. */
  payload: string
  /**
   * The same handshake as six typeable characters, shown *on the station*. The
   * QR is the fast path, not the only one: a phone with a dead camera, a cracked
   * screen or no camera permission still has to be able to open the seat.
   */
  stationCode: string
  /** Which seat this code opens. The client shows it, the server enforces it. */
  machineId: ID
  /** Seconds until the code dies. A duration, not a stamp (see `otpClock`). */
  expiresInSec: number
}

/**
 * `POST /api/auth/qr` — opens a QR handshake for the companion app.
 *
 * Returns the code and the deadline and nothing else. Confirmation does **not**
 * come back through this endpoint or a poll of it: it arrives as
 * `login.qr.confirmed` on the realtime channel, addressed to the seat (C1.5).
 */
export function requestQrChallenge(): Promise<QrChallenge> {
  return query('auth.requestQrChallenge', () => {
    const challengeId = newId('qr')
    const machineId = db.currentMachineId
    const stationCode = generateStationCode()
    qrHandshakes.set(challengeId, {
      machineId,
      stationCode,
      expiresAt: otpClock() + QR_TTL_SEC * 1000,
      approval: null,
    })
    // Housekeeping: a station left overnight would otherwise grow one dead
    // handshake per refresh, and a dead one must never be findable by code.
    for (const [id, handshake] of qrHandshakes) {
      if (handshake.expiresAt < otpClock()) qrHandshakes.delete(id)
    }
    return {
      challengeId,
      payload: `imba://auth/${challengeId}?station=${machineId}`,
      stationCode,
      machineId,
      expiresInSec: QR_TTL_SEC,
    }
  })
}

export interface QrApproval {
  challengeId: ID
  machineId: ID
  userId: ID
  nickname: string
  grantToken: string
  device: string
}

/**
 * MOCK ONLY — `POST /api/auth/qr/:id/approve`, the **phone's** endpoint.
 *
 * Synchronous and outside `mutate()` on purpose: this is not the station calling
 * the club, it is the other actor. `lib/realtime/admin-sim.ts` plays that actor
 * and publishes the frame afterwards, in the same "write, then announce" order
 * every other simulated action follows.
 *
 * Accepts either the challenge id (scanned) or the station code (typed), because
 * those are the two things a phone can possibly know. Returns `null` when there
 * is nothing live to approve — an expired code must not be approvable, or the
 * countdown on the screen would be a decoration.
 */
export function approveQrChallenge(
  userId: ID = 'u-demo',
  ref?: ID,
  device = 'iPhone · IMBA app',
): QrApproval | null {
  const now = otpClock()
  const wanted = ref?.trim().toUpperCase() ?? null

  let challengeId: ID | null = null
  let handshake: QrHandshake | null = null

  for (const [id, live] of qrHandshakes) {
    if (live.expiresAt < now) continue
    const matches = wanted
      ? id === ref || live.stationCode.toUpperCase() === wanted
      : live.machineId === db.currentMachineId
    if (!matches) continue
    // Newest wins: refreshing the code on the station must not leave an older
    // one approvable behind the player's back.
    if (!handshake || live.expiresAt > handshake.expiresAt) {
      challengeId = id
      handshake = live
    }
  }

  if (!challengeId || !handshake) return null

  const player = db.players.get(userId)
  if (!player) return null

  const grantToken = newId('qrg')
  handshake.approval = { userId, grantToken, device }

  return {
    challengeId,
    machineId: handshake.machineId,
    userId,
    nickname: player.user.nickname,
    grantToken,
    device,
  }
}

/**
 * `GET /api/auth/qr/:id` — spend the ticket the phone handed out.
 *
 * The station calls this *after* `login.qr.confirmed` arrives, and the token is
 * checked rather than trusted: a frame is not a credential, and on a shared bus
 * a replayed or stale one has to be worth nothing. The handshake is deleted on
 * success, so the same ticket cannot open a second session.
 */
export function confirmQrChallenge(challengeId: ID, grantToken: string): Promise<AuthResult> {
  return mutate('auth.confirmQrChallenge', () => {
    if (!challengeId || !grantToken) throw new ApiError('validation')

    const handshake = qrHandshakes.get(challengeId)
    if (!handshake) throw new ApiError('notFound')
    if (otpClock() > handshake.expiresAt) {
      qrHandshakes.delete(challengeId)
      // Expired ≠ refused: `timeout` tells the dialog to offer a new code, the
      // way the OTP flows offer a resend.
      throw new ApiError('timeout')
    }
    // Nobody confirmed, or somebody replayed an old frame. Either way this
    // station has not been let in.
    if (!handshake.approval) throw new ApiError('unauthorized')
    if (handshake.approval.grantToken !== grantToken) throw new ApiError('unauthorized')

    const { userId } = handshake.approval
    const player = db.players.get(userId)
    if (!player) throw new ApiError('notFound')

    qrHandshakes.delete(challengeId)
    db.currentUserId = userId
    return {
      profile: buildProfile(userId),
      userId,
      token: newId('tok'),
      role: player.user.role,
    }
  })
}

/* ------------------------------------------------------------------ *
 * PIN — the fast way back into a paused visit (C1.10)
 * ------------------------------------------------------------------ */

/**
 * Digits in a member PIN. Four, and the UI reads it off the response rather than
 * hardcoding it, exactly like the six of the OTP flows.
 */
export const PIN_LENGTH = 4

/**
 * Wrong tries before the PIN door closes and the player has to use their
 * password.
 *
 * The same budget the OTP flows spend, and for the same reason: four digits on a
 * screen that names the account is guessable in ten thousand tries, so the
 * counter — not the keypad — is what makes it a credential. Falling back to the
 * *password* rather than locking the account is the point: the person who left
 * this visit has another way to prove who they are, and an account frozen
 * because a stranger poked at a kiosk would punish the victim.
 */
export const PIN_MAX_ATTEMPTS = 5

/**
 * MOCK ONLY — PINs on file, keyed by account.
 *
 * Seeded from the demo accounts and **not persisted** (`lib/mock/persist.ts`
 * stores the dataset, not credentials): the seed is re-derived from code on every
 * load, so a reload cannot leave a station with a PIN nobody knows. `C1.11` adds
 * the real thing — a PIN the player chooses after confirming their email — and
 * this map becomes the store it writes into. Nothing in the client may depend on
 * the seeded value, which is why the only place it is ever printed is the dev
 * plate behind `DEV_SHORTCUTS`.
 */
const memberPins = new Map<ID, string>()

/**
 * The seeded PIN. One value for every seeded member on purpose: a per-account
 * PIN nobody can look up would make the paused screen undemonstrable, and a
 * *derived* one would invite the client to derive it too.
 */
const SEEDED_PIN = '4242'

/**
 * The accounts that came with the dataset, captured while it is still pristine.
 *
 * Read at module load and never again, which is what keeps "seeded" meaning
 * seeded: `restoreDb()` runs later (from an effect, F3.5) and can put a member
 * created by a previous demo run back into `db.players`, and handing that account
 * a PIN it never chose would be the mock inventing a credential.
 */
const SEEDED_USER_IDS = new Set(db.players.keys())

function pinOf(userId: ID): string | null {
  const existing = memberPins.get(userId)
  if (existing) return existing
  // Seeded members get theirs lazily, on the first read; an account created by
  // the signup flow of C1.4 is not in the seed and therefore has none, which is
  // the honest state until C1.11 asks the player for one.
  if (!SEEDED_USER_IDS.has(userId)) return null
  memberPins.set(userId, SEEDED_PIN)
  return SEEDED_PIN
}

/**
 * Wrong-PIN budget per paused visit. Server-side, like the OTP counters: a
 * client-side count is a suggestion, and the whole value of five attempts is
 * that the *club* is keeping score.
 */
const pinAttempts = new Map<ID, number>()

function attemptsFor(sessionId: ID): number {
  return pinAttempts.get(sessionId) ?? PIN_MAX_ATTEMPTS
}

/**
 * A visit that is holding this seat with its clock stopped, waiting for its own
 * player to come back (C1.10).
 *
 * Everything here is either the seat's or the visit's — never the account's: no
 * email, no balance, no level. The lock screen is a public surface, and the one
 * thing it has to say is "somebody's paid time is still on this machine".
 */
export interface PausedVisit {
  sessionId: ID
  machineId: ID
  /** Nickname to greet. Display data, never translated (F2.2). */
  holder: string
  userId: ID
  /** Prepaid seconds still on the stopped clock — the "HH:MM left" of the spec. */
  secondsLeft: Seconds
  startedAt: ISODateTime
  /** Cells to draw. Server-driven, so the row is not a hardcoded 4 in the UI. */
  pinLength: number
  /** What is left of the budget, so the screen can count down out loud. */
  attemptsLeft: number
  /** MOCK ONLY — nothing here has a phone or a memory, so the dev plate prints it. */
  devPin?: string
}

/**
 * `GET /api/club/station/paused` — the paused visit on this seat, or `null`.
 *
 * Why this is not another field on `fetchStationHolder`: the holder read answers
 * "may this arrival sit down", and its answer is deliberately blunt — a name and
 * a state, for a card that refuses people. This one answers "is there a visit
 * here that its owner can pick up", which is a *door*, and a door needs the
 * clock, the PIN shape and the attempt budget.
 *
 * `null` for the two holds nobody can unlock here, and both are `null` rather
 * than a visit with a flag, because a screen that receives a visit will offer a
 * keypad for it:
 *  - **A walk-in.** A guest has no account and no PIN (MVP §8.2); a paused guest
 *    visit stays the seat-taken case of C1.7, which sends the next person to the
 *    counter — the admin is the one who opens and closes walk-in time.
 *  - **A member without a PIN on file.** Until `C1.11` makes the PIN part of
 *    signup, an account created in this prototype has none, and the way back in
 *    is the password form that is already on the screen.
 */
export function fetchPausedVisit(
  machineId: ID = db.currentMachineId,
): Promise<PausedVisit | null> {
  return query('auth.fetchPausedVisit', () => {
    const live = getLiveSession(machineId)
    if (!live || live.state !== 'paused') return null
    if (!live.userId) return null

    const player = db.players.get(live.userId)
    const pin = pinOf(live.userId)
    if (!player || !pin) return null

    return {
      sessionId: live.id,
      machineId,
      holder: player.user.nickname,
      userId: live.userId,
      secondsLeft: secondsLeft(live),
      startedAt: live.startedAt,
      pinLength: PIN_LENGTH,
      attemptsLeft: attemptsFor(live.id),
      devPin: pin,
    }
  })
}

/**
 * What a PIN attempt can end as.
 *
 * A wrong PIN comes back as a **verdict, not an error**, the way `checkNickname`
 * returns one instead of throwing: how many tries are left is the single most
 * important thing to print on that screen, and an `ApiError` carries a code, not
 * a number. Structural failures (the visit ended, the seat was taken over) stay
 * exceptions, because they end the flow instead of continuing it.
 */
export type PinUnlockResult =
  | { ok: true; session: AuthResult; snapshot: SessionSnapshot }
  | { ok: false; reason: 'wrong'; attemptsLeft: number }
  /** Budget spent: this door is closed for this visit, the password one is not. */
  | { ok: false; reason: 'locked' }

export interface PinUnlockPayload {
  sessionId: ID
  pin: string
}

/**
 * `POST /api/auth/pin` — prove you are the player whose visit is paused here, and
 * pick it up.
 *
 * One round trip does both, and it has to: the alternative is a client that
 * authenticates, then resumes, and can therefore leave a seat authenticated but
 * still paused if the second call drops. `resumeSessionRow` is the same rule
 * `POST /api/session/resume` runs, so a PIN cannot restart a visit that a
 * plain resume would refuse — a dead row stays dead and a spent prepaid clock
 * stays spent.
 *
 * The PIN is checked against the account **the paused visit belongs to**, never
 * against the whole club: a PIN is not an identifier, and searching for the
 * member whose four digits match would let anybody walk into whichever account
 * happened to share them.
 */
export function unlockWithPin(payload: PinUnlockPayload): Promise<PinUnlockResult> {
  return mutate('auth.unlockWithPin', () => {
    const session = required(getSession(payload.sessionId), 'sessionExpired')
    if (session.state === 'ended') throw new ApiError('sessionExpired')
    // Somebody resumed it in the meantime — an admin's key, or the owner on a
    // second client. Not a refusal of the PIN, so not a spent attempt.
    if (session.state !== 'paused') throw new ApiError('conflict')

    const userId = required(session.userId, 'forbidden')
    const expected = required(pinOf(userId), 'notFound')

    const attemptsLeft = attemptsFor(session.id)
    if (attemptsLeft <= 0) return { ok: false, reason: 'locked' }

    const entered = payload.pin.replace(/\D/g, '')
    if (entered.length !== PIN_LENGTH) {
      // Not a guess: an incomplete PIN is a form problem, and spending an attempt
      // on it would let a stray keystroke burn the budget.
      throw new ApiError('validation', { pin: 'required' } as never)
    }

    if (entered !== expected) {
      const left = attemptsLeft - 1
      pinAttempts.set(session.id, left)
      return left <= 0
        ? { ok: false, reason: 'locked' }
        : { ok: false, reason: 'wrong', attemptsLeft: left }
    }

    // Right: the budget is restored for the next pause, and the visit starts
    // running again inside the same call.
    pinAttempts.delete(session.id)
    db.currentUserId = userId
    const player = db.players.get(userId)
    const snapshot = resumeSessionRow(session.id)
    return {
      ok: true,
      session: {
        profile: buildProfile(userId),
        userId,
        token: newId('tok'),
        role: (player?.user.role ?? 'member') as UserRole,
      },
      snapshot,
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
