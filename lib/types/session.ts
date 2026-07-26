import type { Cents, ID, ISODateTime, Seconds } from './common'

/**
 * `sessions.billing_mode` — prepaid burns a bought balance, postpaid runs a tab
 * that is settled at the counter (MVP §3.2).
 */
export type BillingMode = 'prepaid' | 'postpaid'

export type SessionState = 'active' | 'paused' | 'ended'

/** Who closed the session — used by the receipt and the audit log. */
export type SessionClosedBy = 'user' | 'staff' | 'system' | 'timeout'

export interface Session {
  id: ID
  /** Exactly one of the two is set, matching `user_id | guest_id`. */
  userId: ID | null
  guestId: ID | null
  machineId: ID
  billingMode: BillingMode
  state: SessionState
  startedAt: ISODateTime
  endedAt: ISODateTime | null
  secondsGranted: Seconds
  secondsUsed: Seconds
  pausedSeconds: Seconds
  /** Postpaid overrun that still has to be paid for. */
  debtSeconds: Seconds
  closedBy: SessionClosedBy | null
}

/**
 * What `GET /api/session/current` and the 10-second heartbeat return.
 *
 * `expiresAt` is the contract that matters: the countdown is derived from this
 * server timestamp, never from a locally decremented counter, so minimising the
 * window or waking from sleep cannot desync the clock (F3.7, F6.3).
 */
export interface SessionSnapshot {
  sessionId: ID
  state: SessionState
  billingMode: BillingMode
  machineId: ID
  /** `null` while paused — there is no deadline until the session resumes. */
  expiresAt: ISODateTime | null
  secondsLeft: Seconds
  debtSeconds: Seconds
  tabTotalCents: Cents
  /** Server time at the moment of the reply, used to correct for clock skew. */
  serverTime: ISODateTime
}

/** Low-time thresholds the server owns, so admin can retune without a release. */
export interface SessionWarning {
  sessionId: ID
  secondsLeft: Seconds
  level: 'notice' | 'warning' | 'critical'
}
