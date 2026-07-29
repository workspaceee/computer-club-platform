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

/**
 * Where a "move my session here" ask stands (C1.12).
 *
 * `denied` exists even though nothing in the client can produce it: the decision
 * belongs to the shift admin, and a state machine that only models the happy
 * answer would have to be widened the moment the admin app can say no.
 */
export type TransferState = 'pending' | 'approved' | 'denied'

/**
 * One PC, one session — so a member who is already playing elsewhere asks to
 * bring the visit with them instead of opening a second one (C1.12).
 *
 * It is a **request**, not a move, and that is the whole shape of the record: the
 * player at the keyboard cannot free a seat somewhere else in the room (their
 * bag, their drink and possibly their friend are still at it), so the client
 * writes the ask and the admin's approval is what actually moves the row.
 */
export interface TransferRequest {
  requestId: ID
  /** The member whose visit is being moved. Guests have no account to match. */
  userId: ID
  /** The visit itself, so an approval cannot move a *different* session. */
  sessionId: ID
  fromMachineId: ID
  toMachineId: ID
  requestedAt: ISODateTime
  state: TransferState
}

/** Low-time thresholds the server owns, so admin can retune without a release. */
export interface SessionWarning {
  sessionId: ID
  secondsLeft: Seconds
  level: 'notice' | 'warning' | 'critical'
}
