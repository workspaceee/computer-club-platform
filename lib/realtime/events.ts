/**
 * Realtime event contract (F4.1) — the typed catalogue of everything the server
 * can push at a station.
 *
 * This file is transport-free on purpose. `lib/realtime/mock-bus.ts` implements
 * it in Stage 0–3 and the SSE channel `GET /api/realtime` implements it in
 * Stage 4 (B1.4); both speak the *same* names and the *same* payloads, so
 * `hooks/use-realtime.ts` — and therefore every screen — never changes.
 *
 * Rules for every event added here:
 *  1. **No copy.** An event carries ids, numbers and enum values. Display text
 *     comes from the dictionaries (F2.2), so a pushed message is translated like
 *     everything else. The one exception is admin-authored prose (`broadcast`,
 *     `message.received`), which by definition cannot be pre-translated.
 *  2. **Money in whole cents, time in whole seconds/minutes** (F3.6, F3.7).
 *  3. **Session events carry a full `SessionSnapshot`**, so the client re-derives
 *     its countdown from a server `expiresAt` instead of patching a local
 *     counter. Losing an event must never desync the clock.
 *  4. **Events are addressed, not broadcast blindly.** `scope` says which user /
 *     seat / zone the event is for; the client drops anything not meant for it,
 *     exactly like the server will filter the SSE stream.
 */
import type { Cents, Coins, ID, ISODateTime, Minutes, PaymentMethod, Seconds } from '@/lib/types/common'
import type { NotificationLevel, NotificationTarget } from '@/lib/types/notification'
import type { OrderStatus } from '@/lib/types/order'
import type { SessionClosedBy, SessionSnapshot, SessionWarning } from '@/lib/types/session'
import type { TabStatus } from '@/lib/types/tab'

/* ------------------------------------------------------------------ *
 * Shared enums
 * ------------------------------------------------------------------ */

/** Who caused a session change. Drives the copy: staff actions name the reason. */
export type EventActor = 'user' | 'staff' | 'system'

/**
 * Why time appeared on a session (MVP §7). The client shows the reason in the
 * toast — "Admin added 30 min · compensation" is very different from a purchase.
 */
export type TimeGrantReason =
  | 'purchase'
  | 'pass'
  | 'gift'
  | 'promo'
  | 'compensation'
  | 'tournamentPrize'
  | 'staff'

/** Why a session was paused. `break` is the player's own "away" button. */
export type PauseReason = 'break' | 'staff' | 'paymentRequired' | 'maintenance'

/** What moved the wallet. Mirrors `TransactionType` at the level the UI needs. */
export type WalletChangeReason =
  | 'topup'
  | 'purchase'
  | 'refund'
  | 'tabSettled'
  | 'coinsEarned'
  | 'coinsSpent'
  | 'adjustment'

/** How a pushed notification must be presented (MVP §7: "тост или модалка"). */
export type EventPresentation = 'toast' | 'modal'

/* ------------------------------------------------------------------ *
 * Payloads
 * ------------------------------------------------------------------ */

/** `time.added` — admin granted or a purchase credited playable time. */
export interface TimeAddedEvent {
  sessionId: ID
  secondsAdded: Seconds
  reason: TimeGrantReason
  /** `null` for system/automatic grants. */
  staffId: ID | null
  /** Post-grant truth. The countdown is re-derived from this, never patched. */
  snapshot: SessionSnapshot
}

/** `time.warning` — low-time threshold crossed, thresholds owned by the club. */
export type TimeWarningEvent = SessionWarning

/** `session.paused` — seat locked; the launcher must fall back to the lock screen. */
export interface SessionPausedEvent {
  sessionId: ID
  by: EventActor
  reason: PauseReason
  /** `expiresAt` is `null` here: a paused session has no deadline. */
  snapshot: SessionSnapshot
}

/** `session.resumed` — clock runs again, with a fresh deadline. */
export interface SessionResumedEvent {
  sessionId: ID
  by: EventActor
  snapshot: SessionSnapshot
}

/** `session.ended` — grace window, then the summary screen and NPS (MVP §7). */
export interface SessionEndedEvent {
  sessionId: ID
  closedBy: SessionClosedBy
  secondsUsed: Seconds
  debtSeconds: Seconds
  /** Anything still to pay at the counter. `0` when nothing is open. */
  tabTotalCents: Cents
  /** Seconds the player keeps the screen before it returns to the lock view. */
  graceSeconds: Seconds
  /** Whether the club wants a rating for this visit. */
  npsRequested: boolean
}

/** `session.moved` — "Перейди на B-05". The seat changes, the session does not. */
export interface SessionMovedEvent {
  sessionId: ID
  fromMachineId: ID
  toMachineId: ID
  /** Seat label, e.g. `B-05`. The only human-readable field, and it is an id. */
  toMachineLabel: string
  toZoneId: ID
  /** How long the player has to move before staff intervene. */
  moveWithinSeconds: Seconds
}

/** `order.status` — bar order advanced. The client never guesses the next stage. */
export interface OrderStatusEvent {
  orderId: ID
  status: OrderStatus
  /** Kitchen ETA once known, `null` while the order is still new. */
  etaMinutes: number | null
  /** Set when staff cancelled: the UI must explain, not just flip a badge. */
  cancelledReason: 'outOfStock' | 'staff' | 'payment' | null
}

/** `tab.updated` — the open bill changed, or was settled at the counter. */
export interface TabUpdatedEvent {
  tabId: ID
  sessionId: ID
  status: TabStatus
  totalCents: Cents
  itemCount: number
  /** How it was paid, once `status` is `settled`. */
  settledWith: PaymentMethod | null
}

/** `pass.granted` — a pass was sold or gifted; minutes are banked, not burned. */
export interface PassGrantedEvent {
  purchaseId: ID
  passId: ID
  /** Admin-defined product name — not a dictionary key, so it travels. */
  passName: string
  minutes: Minutes
  /** Extra minutes on top, shown separately: "5 h + 60 min bonus" (MVP §4.1). */
  bonusMinutes: Minutes
  /** Total banked minutes after the grant. */
  minutesBanked: Minutes
  expiresAt: ISODateTime | null
}

/** `wallet.updated` — money and/or coins moved. Both balances are absolute. */
export interface WalletUpdatedEvent {
  userId: ID
  moneyCents: Cents
  coins: Coins
  /** Signed deltas, for the "+€10.00" flourish. `0` when unchanged. */
  deltaCents: Cents
  deltaCoins: Coins
  reason: WalletChangeReason
}

/** `message.received` — staff replied in a help thread. */
export interface MessageReceivedEvent {
  threadId: ID
  messageId: ID
  author: 'staff' | 'system'
  /** Admin-authored prose — untranslatable by definition. */
  text: string
  /** Staff display name, when the club exposes it. */
  staffName: string | null
  /** Thread status after the reply, so the ticket badge updates too. */
  threadStatus: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed'
}

/** `broadcast` — club-wide or zone-wide announcement. */
export interface BroadcastEvent {
  notificationId: ID
  level: NotificationLevel
  /** Admin-authored copy, in whatever language the club typed it. */
  title: string
  body: string
  target: NotificationTarget
  /** `critical` gets a modal; everything else is a toast (MVP §7). */
  presentation: EventPresentation
  /** Auto-dismiss hint in ms. `0` means "until acknowledged". */
  durationMs: number
}

/** `quest.completed` — a daily/weekly objective finished server-side. */
export interface QuestCompletedEvent {
  questId: ID
  /** Admin-defined quest name. */
  title: string
  coinsReward: Coins
  xpReward: number
  /** Coin balance after the payout, so no client-side summing is needed. */
  coins: Coins
}

/** `battlepass.tier` — a tier unlocked, or the whole season was replaced. */
export interface BattlePassTierEvent {
  seasonId: ID
  seasonName: string
  tier: number
  track: 'free' | 'paid'
  /** `null` when the tier is a plain XP milestone with no item. */
  rewardName: string | null
  /** `true` when admin published a new season — the Pass screen must reload. */
  seasonChanged: boolean
}

/** `tournament.call` — check-in opened, or this player is called to a match. */
export interface TournamentCallEvent {
  tournamentId: ID
  /** Admin-defined tournament name. */
  name: string
  gameId: ID
  phase: 'checkInOpen' | 'matchReady' | 'starting'
  startsAt: ISODateTime
  /** Set for `matchReady`. */
  matchId: ID | null
  opponentNickname: string | null
}

/** `booking.reminder` — a reservation is about to start. */
export interface BookingReminderEvent {
  bookingId: ID
  zoneId: ID
  /** Assigned seat, when the club pinned one. */
  machineLabel: string | null
  startsAt: ISODateTime
  /** `true` inside the grace window, so the check-in button goes live. */
  checkInOpen: boolean
}

/** `friend.request` — an incoming request, or an answer to one we sent. */
export interface FriendRequestEvent {
  friendshipId: ID
  fromUserId: ID
  fromNickname: string
  avatarUrl: string | null
  kind: 'received' | 'accepted' | 'declined'
  /** Seat the sender is on right now, for "in the club now" (MVP §5.8). */
  machineLabel: string | null
}

/** `party.invite` — someone wants to squad up. */
export interface PartyInviteEvent {
  partyId: ID
  fromUserId: ID
  fromNickname: string
  /** Title the party is forming around, when it has one. */
  gameId: ID | null
  memberCount: number
  /** Invites expire, so the modal must not linger forever. */
  expiresAt: ISODateTime
}

/**
 * `login.qr.confirmed` — a phone approved the QR handshake shown on a station
 * (C1.5).
 *
 * The only event in this catalogue addressed to a station that has **nobody
 * signed in yet**, and that is precisely why it exists: the lock screen cannot
 * poll for an answer it has no session to poll with, so the confirmation is
 * pushed to the *seat*. `scope.machineId` is therefore always set and
 * `scope.userId` never is — filtering by a user id the station does not know yet
 * would drop the frame that is supposed to give it one.
 *
 * It carries a `grantToken`, not a session: the payload of a pushed frame is not
 * a credential, and the station still has to spend the ticket at
 * `GET /api/auth/qr/:id` to get a real `AuthResult`. So a frame that arrives
 * late, twice, or for a code the screen has already replaced logs nobody in.
 */
export interface LoginQrConfirmedEvent {
  challengeId: ID
  /** The seat the phone approved. Also the address of the frame. */
  machineId: ID
  userId: ID
  /** Who is coming in — shown while the station exchanges the ticket. */
  nickname: string
  /** Single-use ticket for `confirmQrChallenge`. Not a session, not a token. */
  grantToken: string
  /** Which phone confirmed, when the companion app reports it. */
  device: string | null
}

/* ------------------------------------------------------------------ *
 * The map
 * ------------------------------------------------------------------ */

/**
 * Event name → payload. The single source of truth: `publish`, `subscribe` and
 * every handler are generic over this, so an unknown name or a mismatched
 * payload is a compile error on both sides of the channel.
 */
export interface RealtimeEventMap {
  'time.added': TimeAddedEvent
  'time.warning': TimeWarningEvent
  'session.paused': SessionPausedEvent
  'session.resumed': SessionResumedEvent
  'session.ended': SessionEndedEvent
  'session.moved': SessionMovedEvent
  'order.status': OrderStatusEvent
  'tab.updated': TabUpdatedEvent
  'pass.granted': PassGrantedEvent
  'wallet.updated': WalletUpdatedEvent
  'message.received': MessageReceivedEvent
  broadcast: BroadcastEvent
  'quest.completed': QuestCompletedEvent
  'battlepass.tier': BattlePassTierEvent
  'tournament.call': TournamentCallEvent
  'booking.reminder': BookingReminderEvent
  'friend.request': FriendRequestEvent
  'party.invite': PartyInviteEvent
  'login.qr.confirmed': LoginQrConfirmedEvent
}

export type RealtimeEventName = keyof RealtimeEventMap

/** Iteration order for dev panels and docs — never rely on object key order. */
export const REALTIME_EVENT_NAMES = [
  'time.added',
  'time.warning',
  'session.paused',
  'session.resumed',
  'session.ended',
  'session.moved',
  'order.status',
  'tab.updated',
  'pass.granted',
  'wallet.updated',
  'message.received',
  'broadcast',
  'quest.completed',
  'battlepass.tier',
  'tournament.call',
  'booking.reminder',
  'friend.request',
  'party.invite',
  'login.qr.confirmed',
] as const satisfies readonly RealtimeEventName[]

export const isRealtimeEventName = (value: unknown): value is RealtimeEventName =>
  typeof value === 'string' && (REALTIME_EVENT_NAMES as readonly string[]).includes(value)

/* ------------------------------------------------------------------ *
 * Envelope
 * ------------------------------------------------------------------ */

/**
 * Who an event is for. `null` means "not narrowed by this dimension", so a
 * club-wide broadcast is all-`null` and a seat notice pins `machineId`.
 */
export interface RealtimeScope {
  userId: ID | null
  machineId: ID | null
  zoneId: ID | null
}

/** Everything not narrowed — a club-wide event. */
export const GLOBAL_SCOPE: RealtimeScope = { userId: null, machineId: null, zoneId: null }

/**
 * What actually crosses the wire. Matches an SSE frame one-to-one: `type` is the
 * `event:` field, `seq` is `id:` (so `Last-Event-ID` can resume a dropped
 * stream), and `payload` is the JSON body.
 */
export interface RealtimeEnvelope<K extends RealtimeEventName = RealtimeEventName> {
  id: ID
  type: K
  /** Server time the event was raised at — never a client `Date.now()`. */
  at: ISODateTime
  /** Monotonic per-channel counter. Used for replay and gap detection. */
  seq: number
  scope: RealtimeScope
  payload: RealtimeEventMap[K]
}

/** Discriminated union of every possible frame — safe to `switch (event.type)`. */
export type AnyRealtimeEvent = {
  [K in RealtimeEventName]: RealtimeEnvelope<K>
}[RealtimeEventName]

/** Handler signature. Narrowed by name when subscribing to specific events. */
export type RealtimeHandler<K extends RealtimeEventName = RealtimeEventName> = (
  event: RealtimeEnvelope<K>,
) => void

/**
 * Does this frame belong to this client? Mirrors the filter the SSE endpoint will
 * apply server-side; kept here so the mock bus and the real channel cannot drift.
 */
export function matchesScope(
  scope: RealtimeScope,
  client: { userId?: ID | null; machineId?: ID | null; zoneId?: ID | null },
): boolean {
  if (scope.userId && scope.userId !== client.userId) return false
  if (scope.machineId && scope.machineId !== client.machineId) return false
  if (scope.zoneId && scope.zoneId !== client.zoneId) return false
  return true
}

/* ------------------------------------------------------------------ *
 * Presentation and cache hints
 * ------------------------------------------------------------------ */

/**
 * Default severity per event, so a surface that just wants to toast an incoming
 * frame does not invent its own mapping. `broadcast` carries its own `level`.
 */
export const EVENT_LEVEL: Record<RealtimeEventName, NotificationLevel> = {
  'time.added': 'success',
  'time.warning': 'warning',
  'session.paused': 'info',
  'session.resumed': 'success',
  'session.ended': 'critical',
  'session.moved': 'warning',
  'order.status': 'info',
  'tab.updated': 'info',
  'pass.granted': 'success',
  'wallet.updated': 'success',
  'message.received': 'info',
  broadcast: 'info',
  'quest.completed': 'success',
  'battlepass.tier': 'success',
  'tournament.call': 'warning',
  'booking.reminder': 'info',
  'friend.request': 'info',
  'party.invite': 'info',
  'login.qr.confirmed': 'success',
}

/**
 * SWR key prefixes an event makes stale (MVP §11: "SWR + SSE-инвалидация").
 *
 * `useRealtimeRevalidation()` reads this, so a screen gets fresh data from one
 * push without every component subscribing by hand. Prefixes are matched against
 * the first segment of the SWR key, which is either the string key itself
 * (`'games/featured'`) or the head of an array key (`['shop', tab]`).
 */
export const EVENT_INVALIDATES: Record<RealtimeEventName, readonly string[]> = {
  'time.added': ['session', 'wallet', 'shop'],
  'time.warning': ['session'],
  'session.paused': ['session'],
  'session.resumed': ['session'],
  'session.ended': ['session', 'shop', 'wallet'],
  'session.moved': ['session', 'catalog'],
  'order.status': ['shop', 'orders'],
  'tab.updated': ['shop', 'orders', 'wallet'],
  'pass.granted': ['session', 'shop', 'wallet'],
  'wallet.updated': ['wallet', 'shop', 'profile'],
  'message.received': ['support', 'help'],
  broadcast: ['support'],
  'quest.completed': ['loyalty', 'wallet'],
  'battlepass.tier': ['loyalty'],
  'tournament.call': ['tournaments'],
  'booking.reminder': ['booking'],
  'friend.request': ['social'],
  'party.invite': ['social'],
  // Nothing to refresh: the station has no data for this player yet, and the
  // sign-in that follows the ticket exchange loads the first screen anyway.
  'login.qr.confirmed': [],
}

/* ------------------------------------------------------------------ *
 * Connection contract (F4.5)
 * ------------------------------------------------------------------ */

/**
 * Channel state, as the UI understands it.
 *
 * `offline` is the state the "No connection to the club server" banner renders.
 * It never stops the countdown: club time runs whether the socket is up or not,
 * so the timer keeps ticking from the last `expiresAt` (F4.5).
 */
export type RealtimeStatus =
  /** Nothing has tried to connect yet — no banner, no error. */
  | 'idle'
  /** First connect or a reconnect attempt is in flight. */
  | 'connecting'
  /** Live. Events are being delivered. */
  | 'open'
  /** The link is down and a retry is scheduled. Banner is up. */
  | 'offline'

/**
 * Reconnect backoff, in ms, indexed by attempt. The last value repeats forever —
 * a station left overnight must keep trying without hammering the server.
 */
export const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const

export function reconnectDelay(attempt: number): number {
  const index = Math.min(Math.max(0, attempt), RECONNECT_BACKOFF_MS.length - 1)
  return RECONNECT_BACKOFF_MS[index]
}

/**
 * Grace period before the banner appears, in ms. A blink of packet loss must not
 * flash a scary banner at a player mid-match; a real outage still shows within a
 * second.
 */
export const OFFLINE_BANNER_DELAY_MS = 1_200
