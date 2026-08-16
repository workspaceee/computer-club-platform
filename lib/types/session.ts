import type { Cents, ID, ISODateTime, Seconds } from './common'

/**
 * `sessions.billing_mode` — prepaid burns a bought balance, postpaid runs a tab
 * that is settled at the counter (MVP §3.2).
 */
export type BillingMode = 'prepaid' | 'postpaid'

export type SessionState = 'active' | 'paused' | 'ended'

/**
 * `sessions.time_source` — **where the minutes currently on the clock came
 * from** (C2.2, MVP §3.2 / S2).
 *
 * The HUD has to name it, and the reason is money rather than decoration: the
 * same `01:23` means four different things to the player at the keyboard, and
 * three of them change what they should do when it runs low. Minutes from a
 * banked pass are already paid for; minutes bought off the wallet will keep
 * spending euros; minutes an admin put on the seat are a favour that will not
 * renew itself; and a postpaid seat is not counting *down* at all.
 *
 * It is deliberately **not** the same axis as `billingMode`. `postpaid` appears
 * here because on that model there is no granted time to have a source — the
 * clock runs up into the open tab — but the other three are all prepaid, and a
 * client that inferred "pass" from `billingMode === 'prepaid'` would be
 * guessing at the one fact the counter and the admin actually decide.
 *
 * Server-owned, like every other number about time (F3.7): the client displays
 * whatever arrives in the snapshot and never derives it from balances it
 * happens to be holding.
 */
export type TimeSource = 'pass' | 'wallet' | 'staff' | 'postpaid'

/** Who closed the session — used by the receipt and the audit log. */
export type SessionClosedBy = 'user' | 'staff' | 'system' | 'timeout'

export interface Session {
  id: ID
  /** Exactly one of the two is set, matching `user_id | guest_id`. */
  userId: ID | null
  guestId: ID | null
  machineId: ID
  billingMode: BillingMode
  /** Where the minutes on this row came from. Rewritten by whatever adds time. */
  timeSource: TimeSource
  state: SessionState
  startedAt: ISODateTime
  endedAt: ISODateTime | null
  secondsGranted: Seconds
  secondsUsed: Seconds
  pausedSeconds: Seconds
  /** Postpaid overrun that still has to be paid for. */
  debtSeconds: Seconds
  closedBy: SessionClosedBy | null
  /**
   * Current accounting epoch of the row — what a reading has to name to count.
   * Rewritten by every write that moves time (`reanchorSession`).
   */
  anchorId: ID
  /**
   * The club's own count at the moment that epoch opened: `secondsUsed +
   * debtSeconds`, as **one** number, because a reading is compared with the two
   * halves together and the boundary between them is crossed exactly once.
   */
  baseAtAnchor: Seconds
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
  /**
   * Which pocket the running minutes come out of (C2.2). Travels with the
   * snapshot rather than being fetched separately, so a grant that changes the
   * source (`time.added` from the admin) changes the label in the same frame it
   * changes the deadline — the HUD cannot end up naming the previous source
   * above the new remainder.
   */
  timeSource: TimeSource
  machineId: ID
  /** `null` while paused — there is no deadline until the session resumes. */
  expiresAt: ISODateTime | null
  secondsLeft: Seconds
  /**
   * Billed seconds this visit has already run through, as the club counts them
   * (C3.1).
   *
   * The opposite direction from `secondsLeft`, and not derivable from it: the
   * remainder moves whenever time is *added*, so "granted minus left" is the size
   * of the last purchase rather than the length of the visit. It is also not
   * derivable from `startedAt`, because wall-clock since the start counts the
   * hour a player spent locked out at the bar as time played.
   *
   * Server-owned like every other number about time (F3.7). A postpaid seat has
   * nothing granted to burn, so its billed time accrues in `debtSeconds` instead
   * and a reader after the visit's length has to add the two.
   */
  secondsUsed: Seconds
  debtSeconds: Seconds
  tabTotalCents: Cents
  /** Server time at the moment of the reply, used to correct for clock skew. */
  serverTime: ISODateTime
  /**
   * The accounting **epoch** the client's next reading is measured against.
   *
   * Every write that moves time on the row mints a new one (an extension, an
   * admin grant or correction, a pause, a resume, and the accepted heartbeat
   * itself), so a reading taken against the previous epoch is recognisably
   * unusable rather than silently added to a deadline that no longer exists.
   */
  anchorId: ID
}

/**
 * What the client reports about time: a **reading**, never a delta.
 *
 * The difference is the whole point of the contract. A delta has to arrive
 * exactly once — and after any drop the client can only retry, so a lost *reply*
 * bills the player twice by construction. A reading is idempotent (the server
 * takes the maximum), survives reordering (a late `480` cannot undo a `520`) and
 * needs no queue of pending operations: the synchronised state is one number.
 */
export interface SessionReport {
  /** Epoch it was measured from. Not the current one → the server moves nothing. */
  anchorId: ID
  /** Seconds elapsed since that anchor. A reading, not a delta: a repeat is safe. */
  elapsedSinceAnchor: Seconds
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
