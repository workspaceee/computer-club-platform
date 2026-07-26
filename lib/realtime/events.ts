/**
 * Realtime event contract (F4.1).
 *
 * The full matrix from MVP §7: every admin action that must show up on the
 * client in under a second. This file is *pure contract* — no transport, no
 * React, no mock. Stage 4 replaces `lib/realtime/mock-bus.ts` with an
 * `EventSource` reading `GET /api/realtime`, and the only thing that has to stay
 * identical is what lives here: event names and payload shapes
 * (docs/API-CONTRACT.md §10).
 *
 * Rules this file exists to enforce:
 *
 *  1. **One name per admin action.** `time.added` is not "maybe a grant, maybe an
 *     extend" — the payload says who did it and why, so the client can render an
 *     honest toast without guessing.
 *  2. **Payloads carry server truth, never deltas the client must accumulate.**
 *     Time events ship `secondsLeft` + `expiresAt`, wallet events ship the new
 *     balances. A dropped event can therefore never desync a screen (F4.5) — the
 *     next one repairs it.
 *  3. **No display copy.** Levels and codes only; strings come from the
 *     dictionaries (`realtime` namespace, F2.2), like everywhere else.
 */
import type { Cents, Coins, ID, ISODateTime, Minutes, Seconds } from '@/lib/types/common'
import type { NotificationLevel } from '@/lib/types/notification'
import type { OrderStatus } from '@/lib/types/order'
import type { BattlePassTrack, RewardType } from '@/lib/types/loyalty'
import type { SessionClosedBy } from '@/lib/types/session'
import type { TabStatus } from '@/lib/types/tab'
import type { TournamentStatus } from '@/lib/types/tournament'

/* ------------------------------------------------------------------ *
 * Payloads
 * ------------------------------------------------------------------ */

/** Who caused the change. Drives whether the toast says "staff" or stays neutral. */
export type EventActor = 'staff' | 'user' | 'system'

/**
 * Time granted, sold or corrected. `secondsLeft` and `expiresAt` are the new
 * server truth for the countdown — the client re-anchors instead of adding.
 */
export interface TimeAddedEvent {
  sessionId: ID
  /** Signed: negative when staff removed time. */
  secondsAdded: Seconds
  secondsLeft: Seconds
  /** `null` when the session is paused — a paused session has no deadline. */
  expiresAt: ISODateTime | null
  actor: EventActor
  /** Machine-readable reason, translated client-side. `null` for a plain grant. */
  reason: 'grant' | 'pass' | 'extend' | 'gift' | 'correction' | 'compensation' | null
}

/** Low-time push. Thresholds are club settings, so the level arrives resolved. */
export interface TimeWarningEvent {
  sessionId: ID
  secondsLeft: Seconds
  level: 'notice' | 'warning' | 'critical'
}

export interface SessionPausedEvent {
  sessionId: ID
  secondsLeft: Seconds
  actor: EventActor
}

export interface SessionResumedEvent {
  sessionId: ID
  secondsLeft: Seconds
  expiresAt: ISODateTime | null
  actor: EventActor
}

export interface SessionEndedEvent {
  sessionId: ID
  closedBy: SessionClosedBy
  /** Bill left to settle at the counter, `0` when nothing is owed. */
  tabTotalCents: Cents
  debtSeconds: Seconds
}

/** Seat change. The label is included so the modal can say "go to B-05". */
export interface SessionMovedEvent {
  sessionId: ID
  fromMachineId: ID
  toMachineId: ID
  toMachineLabel: string
}

export interface OrderStatusEvent {
  orderId: ID
  status: OrderStatus
  etaMinutes: number | null
  totalCents: Cents
}

/** Tab total changed: a product, a pass, an adjustment or settlement. */
export interface TabUpdatedEvent {
  tabId: ID
  sessionId: ID
  status: TabStatus
  totalCents: Cents
  /** What moved the total, for the toast. `null` on a bulk recalculation. */
  lastItemLabel: string | null
  lastItemCents: Cents | null
}

export interface PassGrantedEvent {
  purchaseId: ID
  passId: ID
  passName: string
  minutes: Minutes
  bonusMinutes: Minutes
  actor: EventActor
}

/** New balances, not deltas — the deltas are only for the toast copy. */
export interface WalletUpdatedEvent {
  userId: ID
  moneyCents: Cents
  coins: Coins
  deltaCents: Cents
  deltaCoins: Coins
  reason: 'topup' | 'spend' | 'refund' | 'reward' | 'settle' | 'gift'
}

export interface MessageReceivedEvent {
  threadId: ID
  messageId: ID
  author: 'staff' | 'user'
  text: string
  /** Staff display name, `null` for a system reply. */
  staffName: string | null
}

/** Club-wide announcement. `critical` is the only level that blocks the screen. */
export interface BroadcastEvent {
  id: ID
  level: NotificationLevel
  title: string
  body: string
  /** `true` renders a modal that must be acknowledged instead of a toast. */
  requiresAck: boolean
}

export interface QuestCompletedEvent {
  questId: ID
  code: string
  description: string
  rewardCoins: Coins
  rewardXp: number
}

export interface BattlePassTierEvent {
  seasonId: ID
  level: number
  track: BattlePassTrack
  label: string
  rewardType: RewardType
  rewardAmount: number
}

/** Check-in call or bracket update for a tournament the member is in. */
export interface TournamentCallEvent {
  tournamentId: ID
  name: string
  gameName: string
  status: TournamentStatus
  startsInMinutes: number
  /** Seat the player has to move to for the match, when assigned. */
  machineLabel: string | null
}

export interface BookingReminderEvent {
  bookingId: ID
  zoneName: string
  machineLabel: string | null
  startsInMinutes: number
  checkInOpen: boolean
}

export interface FriendRequestEvent {
  userId: ID
  nickname: string
  level: number
}

export interface PartyInviteEvent {
  partyId: ID
  ownerId: ID
  ownerNickname: string
  gameId: ID
  gameName: string
}

/* ------------------------------------------------------------------ *
 * The map
 * ------------------------------------------------------------------ */

/**
 * Name → payload. Adding an event means adding a line here; every consumer
 * (bus, hook, dev panel, dictionaries) then fails to compile until it is
 * handled, which is the whole reason this map exists.
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
}

export type RealtimeEventName = keyof RealtimeEventMap

/** Every event name, in the order MVP §7 lists them. Drives the dev panel. */
export const REALTIME_EVENTS = [
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
] as const satisfies readonly RealtimeEventName[]

/**
 * What actually travels over the wire. `seq` is the SSE `Last-Event-ID`: the
 * client sends the last one it saw after a drop and the server replays the gap
 * (F4.5), so nothing is silently lost during a reconnect.
 */
export interface RealtimeEnvelope<N extends RealtimeEventName = RealtimeEventName> {
  id: ID
  seq: number
  type: N
  /** Server time, never a client `Date.now()` (F3.7). */
  at: ISODateTime
  payload: RealtimeEventMap[N]
}

/** Discriminated union — `switch (event.type)` narrows `event.payload`. */
export type RealtimeEvent = { [N in RealtimeEventName]: RealtimeEnvelope<N> }[RealtimeEventName]

export type RealtimeListener = (event: RealtimeEvent) => void

/** Per-event handler map accepted by `useRealtime()`. */
export type RealtimeHandlers = {
  [N in RealtimeEventName]?: (event: RealtimeEnvelope<N>) => void
}

/* ------------------------------------------------------------------ *
 * Transport contract
 * ------------------------------------------------------------------ */

/**
 * Connection state as the UI sees it:
 *  - `connecting` first attempt or a retry in flight — no banner yet, the
 *    countdown keeps running from `expiresAt`;
 *  - `open` events are flowing;
 *  - `offline` the channel is down and the banner is up (F4.5).
 */
export type RealtimeConnectionState = 'connecting' | 'open' | 'offline'

/**
 * What `hooks/use-realtime.ts` talks to. `mockBus` implements it today; Stage 4
 * ships an `EventSource` implementation of the same three methods and no UI file
 * changes.
 */
export interface RealtimeTransport {
  /** Attach a listener. Returns the unsubscribe function. */
  subscribe(listener: RealtimeListener): () => void
  /** Observe connection state. Fires immediately with the current value. */
  subscribeState(listener: (state: RealtimeConnectionState) => void): () => void
  getState(): RealtimeConnectionState
  /** Open (or re-open) the channel. Safe to call when already open. */
  connect(): void
  /** Close the channel. `offline` until `connect()` is called again. */
  disconnect(): void
  /** Highest `seq` delivered so far — the `Last-Event-ID` for a replay. */
  lastSeq(): number
}

/* ------------------------------------------------------------------ *
 * Presentation hints
 * ------------------------------------------------------------------ */

/**
 * Default severity per event, so a surface that only wants "toast it" does not
 * re-invent the mapping. Copy still comes from the dictionaries.
 */
export const EVENT_LEVEL: Record<RealtimeEventName, NotificationLevel> = {
  'time.added': 'success',
  'time.warning': 'warning',
  'session.paused': 'info',
  'session.resumed': 'info',
  'session.ended': 'warning',
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
}

export function isRealtimeEventName(value: unknown): value is RealtimeEventName {
  return typeof value === 'string' && (REALTIME_EVENTS as readonly string[]).includes(value)
}

/** Structural guard for anything arriving from a channel we do not control. */
export function isRealtimeEnvelope(value: unknown): value is RealtimeEvent {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<RealtimeEvent>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.seq === 'number' &&
    typeof candidate.at === 'string' &&
    isRealtimeEventName(candidate.type) &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  )
}
