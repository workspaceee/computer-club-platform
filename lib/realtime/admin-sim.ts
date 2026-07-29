// MOCK ONLY — deleted in Stage 4 together with `lib/mock/*` (B1.6).
//
// The admin side of the event matrix (MVP §7), driving the `/dev/bus` panel
// (F4.4). Each function does what a staff action will do on the real server:
//
//   1. change state in `lib/mock/db` through the same shapes the API layer uses,
//   2. persist it, so a reload does not undo the demo,
//   3. publish the matching realtime frame on `mockBus`.
//
// That order matters. An event whose state was not written first would let the
// client render something the next `GET` immediately contradicts — the classic
// realtime bug this whole layer exists to prevent.
//
// Nothing in the launcher UI may import this file: it is the *other* actor.
import { approveQrChallenge } from '@/lib/mock/api/auth'
import { newId, serverNowMs } from '@/lib/mock/api/client'
import { approveTransfer } from '@/lib/mock/api/session'
import { db, getMachine, getOpenTab, getPlayer, getSession } from '@/lib/mock/db'
import { persistDb } from '@/lib/mock/persist'
import { mockBus } from '@/lib/realtime/mock-bus'
import type {
  PauseReason,
  RealtimeEnvelope,
  RealtimeScope,
  TimeGrantReason,
  WalletChangeReason,
} from '@/lib/realtime/events'
import type { Cents, Coins, ID, Minutes, Seconds } from '@/lib/types/common'
import type { NotificationLevel } from '@/lib/types/notification'
import type { OrderStatus } from '@/lib/types/order'
import type { Session, SessionClosedBy, SessionSnapshot } from '@/lib/types/session'
import type { PassPurchase } from '@/lib/types/pass'
import type { HelpMessage } from '@/lib/types/notification'
import type { Transaction } from '@/lib/types/tab'

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** The seat the launcher is running on — the audience for most of these events. */
function seatScope(): Partial<RealtimeScope> {
  const machine = getMachine(db.currentMachineId)
  return {
    userId: db.currentUserId,
    machineId: db.currentMachineId,
    zoneId: machine?.zoneId ?? null,
  }
}

function secondsLeft(session: Session): Seconds {
  return Math.max(0, session.secondsGranted - session.secondsUsed)
}

/**
 * Same snapshot the heartbeat returns (`lib/mock/api/session.ts`). Duplicated
 * rather than exported from there because the *server* builds this in Stage 4 and
 * the mock API module disappears — the shape is the contract, not the function.
 */
function snapshot(session: Session): SessionSnapshot {
  const left = secondsLeft(session)
  // One instant for both stamps, for the reason spelled out in `lib/mock/api/session.ts`:
  // the client recovers the promised span by subtracting them, so a pair taken from
  // two different clocks silently moves a paid deadline.
  const nowMs = serverNowMs()
  return {
    sessionId: session.id,
    state: session.state,
    billingMode: session.billingMode,
    machineId: session.machineId,
    expiresAt:
      session.state === 'active' ? new Date(nowMs + left * 1000).toISOString() : null,
    secondsLeft: left,
    debtSeconds: session.debtSeconds,
    tabTotalCents: getOpenTab(session.id)?.totalCents ?? 0,
    serverTime: new Date(nowMs).toISOString(),
  }
}

/** Throws loudly: a dev panel with no session to act on is a broken fixture. */
function activeSession(): Session {
  const session = getSession(db.currentSessionId)
  if (!session) throw new Error('admin-sim: current session is missing from the mock db')
  return session
}

function ledger(entry: Omit<Transaction, 'id' | 'currency' | 'createdAt'>): void {
  db.transactions.push({
    id: newId('tx'),
    currency: db.club.currency,
    createdAt: db.now,
    ...entry,
  })
}

/** Every action ends here, so nothing can publish without persisting first. */
function commit(): void {
  persistDb()
}

/* ------------------------------------------------------------------ *
 * Time and session
 * ------------------------------------------------------------------ */

/** "Add time" — the headline row of MVP §7. Minutes land on the live session. */
export function grantTime(
  minutes: Minutes,
  reason: TimeGrantReason = 'staff',
  staffId: ID | null = 'staff-1',
): RealtimeEnvelope<'time.added'> {
  const session = activeSession()
  session.secondsGranted += Math.round(minutes) * 60
  // A grant on a paused seat resumes it: staff just paid for more play.
  if (session.state === 'paused') session.state = 'active'

  ledger({
    userId: db.currentUserId,
    type: 'time_grant',
    amount: Math.round(minutes) * 60,
    refType: 'session',
    refId: session.id,
    staffId,
    note: `admin grant · ${reason}`,
  })
  commit()

  return mockBus.publish(
    'time.added',
    {
      sessionId: session.id,
      secondsAdded: Math.round(minutes) * 60,
      reason,
      staffId,
      snapshot: snapshot(session),
    },
    { scope: seatScope() },
  )
}

/** Deducts time, e.g. a correction. Never goes below zero remaining. */
export function deductTime(minutes: Minutes): RealtimeEnvelope<'time.added'> {
  const session = activeSession()
  const take = Math.min(Math.round(minutes) * 60, secondsLeft(session))
  session.secondsGranted -= take
  ledger({
    userId: db.currentUserId,
    type: 'time_spend',
    amount: -take,
    refType: 'session',
    refId: session.id,
    staffId: 'staff-1',
    note: 'admin correction',
  })
  commit()

  return mockBus.publish(
    'time.added',
    {
      sessionId: session.id,
      secondsAdded: -take,
      reason: 'staff',
      staffId: 'staff-1',
      snapshot: snapshot(session),
    },
    { scope: seatScope() },
  )
}

/**
 * Burns the session down to `minutesLeft` and raises the matching warning, so the
 * low-time UI can be rehearsed without waiting two hours. Thresholds come from
 * club settings — the server owns them (F3.7).
 */
export function warnLowTime(minutesLeft: Minutes = 10): RealtimeEnvelope<'time.warning'> {
  const session = activeSession()
  const target = Math.max(0, Math.round(minutesLeft)) * 60
  session.secondsUsed = Math.max(session.secondsUsed, session.secondsGranted - target)
  commit()

  const left = secondsLeft(session)
  const { critical, warning } = db.clubSettings.warningThresholds
  const asMinutes = left / 60
  const level = asMinutes <= critical ? 'critical' : asMinutes <= warning ? 'warning' : 'notice'

  return mockBus.publish(
    'time.warning',
    { sessionId: session.id, secondsLeft: left, level },
    { scope: seatScope() },
  )
}

/** Staff pauses the seat: the launcher must drop to the lock screen. */
export function pauseSession(
  reason: PauseReason = 'staff',
): RealtimeEnvelope<'session.paused'> {
  const session = activeSession()
  session.state = 'paused'
  commit()

  return mockBus.publish(
    'session.paused',
    { sessionId: session.id, by: 'staff', reason, snapshot: snapshot(session) },
    { scope: seatScope() },
  )
}

/** Staff releases the seat again — back into the launcher, clock running. */
export function resumeSession(): RealtimeEnvelope<'session.resumed'> {
  const session = activeSession()
  session.state = 'active'
  commit()

  return mockBus.publish(
    'session.resumed',
    { sessionId: session.id, by: 'staff', snapshot: snapshot(session) },
    { scope: seatScope() },
  )
}

/** Ends the session: grace window, summary, then NPS (MVP §7). */
export function endSession(
  closedBy: SessionClosedBy = 'staff',
): RealtimeEnvelope<'session.ended'> {
  const session = activeSession()
  const tab = getOpenTab(session.id)
  session.state = 'ended'
  session.endedAt = db.now
  session.closedBy = closedBy

  const machine = getMachine(session.machineId)
  if (machine) machine.status = 'free'
  commit()

  return mockBus.publish(
    'session.ended',
    {
      sessionId: session.id,
      closedBy,
      secondsUsed: session.secondsUsed,
      debtSeconds: session.debtSeconds,
      tabTotalCents: tab?.totalCents ?? 0,
      graceSeconds: 60,
      npsRequested: true,
    },
    { scope: seatScope() },
  )
}

/**
 * "Move to B-05". The target seat is reserved immediately so nobody else is sent
 * to it, but the session stays on the old machine until the player arrives.
 */
export function moveSession(toMachineId?: ID): RealtimeEnvelope<'session.moved'> {
  const session = activeSession()
  const target =
    (toMachineId ? getMachine(toMachineId) : undefined) ??
    db.machines.find((m) => m.id !== session.machineId && m.status === 'free') ??
    db.machines.find((m) => m.id !== session.machineId)
  if (!target) throw new Error('admin-sim: no machine to move to')

  target.status = 'reserved'
  commit()

  return mockBus.publish(
    'session.moved',
    {
      sessionId: session.id,
      fromMachineId: session.machineId,
      toMachineId: target.id,
      toMachineLabel: target.label,
      toZoneId: target.zoneId,
      moveWithinSeconds: 300,
    },
    { scope: seatScope() },
  )
}

/**
 * The shift admin answers "bring my session here" (C1.12).
 *
 * Different from `moveSession` above in the one way that matters: that one is
 * staff *sending* the player somewhere ("go to B-05" — the seat is reserved and
 * the row stays put until they arrive), while this one is the player already
 * standing at the new keyboard and the admin releasing the old chair, so the row
 * moves now and the target seat becomes occupied rather than reserved.
 *
 * The frame is addressed to the **target machine** and not to the account. The
 * station that raised the request has nobody signed in yet — that is the whole
 * point of the refusal it is recovering from — so a `userId` scope would be
 * matched against whatever identity the client happened to open the channel
 * with. The seat is the thing that is certain here.
 *
 * `null` when there was nothing live to approve, so a dev-panel button on a stale
 * request says so instead of silently doing nothing.
 */
export function approveSessionTransfer(
  requestId: ID,
): RealtimeEnvelope<'session.moved'> | null {
  const approved = approveTransfer(requestId)
  if (!approved) return null
  commit()

  return mockBus.publish(
    'session.moved',
    {
      sessionId: approved.session.id,
      fromMachineId: approved.request.fromMachineId,
      toMachineId: approved.request.toMachineId,
      toMachineLabel: approved.toMachineLabel,
      toZoneId: approved.toZoneId,
      moveWithinSeconds: 300,
    },
    { scope: { machineId: approved.request.toMachineId, zoneId: approved.toZoneId } },
  )
}

/**
 * MOCK ONLY — puts the fixture's own visit on **another** seat, so the refusal
 * of C1.12 can be reached by hand.
 *
 * Not an admin action and never will be: no member of staff "seeds" anything.
 * It exists because the one state the transfer flow starts from — *your account
 * is live on a PC you are not sitting at* — cannot be produced from a single
 * client. The mock db lives in this tab, so there is no second station to walk
 * away from; this button is that walk.
 *
 * It moves the row rather than opening a second one, which is the difference
 * between seeding the story and breaking it: two live rows for one account is
 * the exact thing `openSession` refuses, and a fixture that contains it would
 * make every later check meaningless. The old chair is freed for the same
 * reason — the arrival must be refused because the *account* is busy, not
 * because the seat in front of them is (C1.7 already covers that one).
 *
 * Publishes nothing. A `session.moved` frame here would tell this client its
 * visit had been relocated by staff, which is a different story with a
 * different screen; the seed is meant to be *found* by the next sign-in.
 */
export function seatSessionElsewhere(toMachineId: ID = 'pc-05'): { machineLabel: string } | null {
  const session = getSession(db.currentSessionId)
  // Members only: `activeElsewhere` is keyed by account, and a walk-in has none.
  if (!session || session.state === 'ended' || !session.userId) return null

  const target = getMachine(toMachineId)
  if (!target || target.id === session.machineId) return null

  const from = getMachine(session.machineId)
  if (from) from.status = 'free'
  session.machineId = target.id
  target.status = 'occupied'

  const player = getPlayer(session.userId)
  if (player) player.machineId = target.id

  commit()
  return { machineLabel: target.label }
}

/* ------------------------------------------------------------------ *
 * Bar orders and the tab
 * ------------------------------------------------------------------ */

/** Kitchen flow, in the only order the client is allowed to render. */
const ORDER_FLOW: readonly OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering', 'delivered']

/** The order the panel acts on by default: the newest one still in progress. */
function liveOrder() {
  return (
    [...db.orders]
      .reverse()
      .find(
        (order) =>
          order.sessionId === db.currentSessionId &&
          order.status !== 'delivered' &&
          order.status !== 'cancelled',
      ) ?? null
  )
}

/** Advances the newest open order one stage. */
export function advanceOrder(orderId?: ID): RealtimeEnvelope<'order.status'> | null {
  const order = orderId ? (db.orders.find((o) => o.id === orderId) ?? null) : liveOrder()
  if (!order) return null

  const index = ORDER_FLOW.indexOf(order.status)
  const next = ORDER_FLOW[Math.min(index + 1, ORDER_FLOW.length - 1)]
  order.status = next
  order.etaMinutes = next === 'delivered' ? null : Math.max(1, (order.etaMinutes ?? 6) - 2)
  commit()

  return mockBus.publish(
    'order.status',
    {
      orderId: order.id,
      status: order.status,
      etaMinutes: order.etaMinutes,
      cancelledReason: null,
    },
    { scope: seatScope() },
  )
}

/** Staff cancels an order — the client must show *why*, not just a red badge. */
export function cancelOrder(
  reason: 'outOfStock' | 'staff' | 'payment' = 'outOfStock',
  orderId?: ID,
): RealtimeEnvelope<'order.status'> | null {
  const order = orderId ? (db.orders.find((o) => o.id === orderId) ?? null) : liveOrder()
  if (!order) return null

  order.status = 'cancelled'
  order.etaMinutes = null
  commit()

  return mockBus.publish(
    'order.status',
    { orderId: order.id, status: 'cancelled', etaMinutes: null, cancelledReason: reason },
    { scope: seatScope() },
  )
}

/** Adds a line to the open tab — "admin put a Red Bull on your bill". */
export function addTabItem(
  label = 'Red Bull 250ml',
  priceCents: Cents = 250,
): RealtimeEnvelope<'tab.updated'> | null {
  const tab = getOpenTab(db.currentSessionId)
  if (!tab) return null

  tab.items.push({
    id: newId('ti'),
    tabId: tab.id,
    kind: 'product',
    refId: null,
    label,
    qty: 1,
    priceCents,
  })
  tab.totalCents = tab.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0)
  commit()

  return mockBus.publish(
    'tab.updated',
    {
      tabId: tab.id,
      sessionId: tab.sessionId,
      status: tab.status,
      totalCents: tab.totalCents,
      itemCount: tab.items.length,
      settledWith: null,
    },
    { scope: seatScope() },
  )
}

/** "Счёт оплачен · € 9.50 · спасибо" — the counter closed the bill. */
export function settleTab(): RealtimeEnvelope<'tab.updated'> | null {
  const tab = getOpenTab(db.currentSessionId)
  if (!tab) return null

  tab.status = 'settled'
  tab.settledAt = db.now
  tab.settledBy = 'staff-1'
  ledger({
    userId: db.currentUserId,
    type: 'tab_settle',
    amount: -tab.totalCents,
    refType: 'tab',
    refId: tab.id,
    staffId: 'staff-1',
    note: 'settled at the counter',
  })
  commit()

  return mockBus.publish(
    'tab.updated',
    {
      tabId: tab.id,
      sessionId: tab.sessionId,
      status: 'settled',
      totalCents: tab.totalCents,
      itemCount: tab.items.length,
      settledWith: 'cash',
    },
    { scope: seatScope() },
  )
}

/* ------------------------------------------------------------------ *
 * Wallet and passes
 * ------------------------------------------------------------------ */

/** Top-up at the counter. Money is cents, always (F3.6). */
export function topUpWallet(
  cents: Cents = 1000,
  reason: WalletChangeReason = 'topup',
): RealtimeEnvelope<'wallet.updated'> {
  const player = getPlayer(db.currentUserId)
  if (!player) throw new Error('admin-sim: current player is missing')

  player.wallet.moneyCents += cents
  ledger({
    userId: player.user.id,
    type: 'topup',
    amount: cents,
    refType: 'topup',
    refId: null,
    staffId: 'staff-1',
    note: 'counter top-up',
  })
  commit()

  return mockBus.publish(
    'wallet.updated',
    {
      userId: player.user.id,
      moneyCents: player.wallet.moneyCents,
      coins: player.wallet.coins,
      deltaCents: cents,
      deltaCoins: 0,
      reason,
    },
    { scope: { userId: player.user.id } },
  )
}

/** Coin gift — the "Админ подарил" row of the matrix. */
export function grantCoins(coins: Coins = 250): RealtimeEnvelope<'wallet.updated'> {
  const player = getPlayer(db.currentUserId)
  if (!player) throw new Error('admin-sim: current player is missing')

  player.wallet.coins += coins
  ledger({
    userId: player.user.id,
    type: 'earn_coins',
    amount: coins,
    refType: null,
    refId: null,
    staffId: 'staff-1',
    note: 'admin gift',
  })
  commit()

  return mockBus.publish(
    'wallet.updated',
    {
      userId: player.user.id,
      moneyCents: player.wallet.moneyCents,
      coins: player.wallet.coins,
      deltaCents: 0,
      deltaCoins: coins,
      reason: 'coinsEarned',
    },
    { scope: { userId: player.user.id } },
  )
}

/** Sells or gifts a pass: minutes are **banked**, not poured into the session. */
export function grantPass(passId?: ID): RealtimeEnvelope<'pass.granted'> | null {
  const pass = passId
    ? db.passes.find((p) => p.id === passId)
    : db.passes.find((p) => p.active)
  if (!pass) return null

  const minutes = pass.hours * 60 + pass.bonusMinutes
  const purchase: PassPurchase = {
    id: newId('pp'),
    userId: db.currentUserId,
    passId: pass.id,
    minutesTotal: minutes,
    minutesLeft: minutes,
    expiresAt: null,
    paidVia: 'staff',
    staffId: 'staff-1',
    createdAt: db.now,
  }
  db.passPurchases.push(purchase)
  commit()

  const banked = db.passPurchases
    .filter((p) => p.userId === db.currentUserId)
    .reduce((sum, p) => sum + p.minutesLeft, 0)

  return mockBus.publish(
    'pass.granted',
    {
      purchaseId: purchase.id,
      passId: pass.id,
      passName: pass.name,
      minutes: pass.hours * 60,
      bonusMinutes: pass.bonusMinutes,
      minutesBanked: banked,
      expiresAt: purchase.expiresAt,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/* ------------------------------------------------------------------ *
 * Messages and broadcasts
 * ------------------------------------------------------------------ */

/** Staff replies in a help thread. */
export function staffMessage(
  text = 'On my way to your station.',
  threadId?: ID,
): RealtimeEnvelope<'message.received'> | null {
  const thread = threadId
    ? db.helpThreads.find((t) => t.id === threadId)
    : db.helpThreads.find((t) => t.status === 'open' || t.status === 'in-progress')
  if (!thread) return null

  const message: HelpMessage = {
    id: newId('hm'),
    threadId: thread.id,
    author: 'staff',
    text,
    createdAt: db.now,
  }
  thread.messages.push(message)
  thread.status = 'in-progress'
  commit()

  const staffName = db.staff.find((s) => s.id === thread.staffId)?.nickname ?? null

  return mockBus.publish(
    'message.received',
    {
      threadId: thread.id,
      messageId: message.id,
      author: 'staff',
      text,
      staffName,
      threadStatus: thread.status,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/**
 * Club announcement. `critical` is a modal, everything else a toast — the client
 * must not decide that on its own (MVP §7).
 */
export function broadcast(
  level: NotificationLevel = 'info',
  title = 'Tournament in 15 minutes',
  body = 'Valorant 5v5 — check in at the counter.',
): RealtimeEnvelope<'broadcast'> {
  const notification = {
    id: newId('n'),
    target: 'broadcast' as const,
    targetId: null,
    level,
    title,
    body,
    createdAt: db.now,
    readAt: null,
  }
  db.notifications.push(notification)
  commit()

  return mockBus.publish('broadcast', {
    notificationId: notification.id,
    level,
    title,
    body,
    target: 'broadcast',
    presentation: level === 'critical' ? 'modal' : 'toast',
    durationMs: level === 'critical' ? 0 : 6_000,
  })
}

/* ------------------------------------------------------------------ *
 * Loyalty, events, social
 * ------------------------------------------------------------------ */

/** Completes the first open quest and pays it out. */
export function completeQuest(questId?: ID): RealtimeEnvelope<'quest.completed'> | null {
  const quest = questId
    ? db.quests.find((q) => q.id === questId)
    : db.quests.find((q) => q.active && q.completedAt === null)
  if (!quest) return null

  quest.progress = quest.target
  quest.completedAt = db.now

  const player = getPlayer(db.currentUserId)
  if (player) player.wallet.coins += quest.rewardCoins
  commit()

  return mockBus.publish(
    'quest.completed',
    {
      questId: quest.id,
      title: quest.description,
      coinsReward: quest.rewardCoins,
      xpReward: quest.rewardXp,
      coins: player?.wallet.coins ?? 0,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/** Unlocks the next Battle Pass tier. */
export function unlockBattlePassTier(): RealtimeEnvelope<'battlepass.tier'> | null {
  const season = db.seasons.find((s) => s.active)
  if (!season) return null

  const nextLevel = Math.min(season.levels, db.userSeason.level + 1)
  db.userSeason.level = nextLevel
  const tier = db.battlePassTiers.find((t) => t.seasonId === season.id && t.level === nextLevel)
  if (tier) tier.unlocked = true
  commit()

  return mockBus.publish(
    'battlepass.tier',
    {
      seasonId: season.id,
      seasonName: season.name,
      tier: nextLevel,
      track: tier?.track ?? 'free',
      rewardName: tier?.label ?? null,
      seasonChanged: false,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/** Calls the player to a match / opens check-in. */
export function callToTournament(
  phase: 'checkInOpen' | 'matchReady' | 'starting' = 'matchReady',
): RealtimeEnvelope<'tournament.call'> | null {
  const tournament = db.tournaments.find(
    (t) => t.status === 'announced' || t.status === 'check-in' || t.status === 'running',
  )
  if (!tournament) return null

  return mockBus.publish(
    'tournament.call',
    {
      tournamentId: tournament.id,
      name: tournament.name,
      gameId: tournament.gameId,
      phase,
      startsAt: tournament.startsAt,
      matchId: phase === 'matchReady' ? newId('match') : null,
      opponentNickname: phase === 'matchReady' ? 'ClutchQueen' : null,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/** Reminds the player about their reservation. */
export function remindBooking(): RealtimeEnvelope<'booking.reminder'> | null {
  const booking = db.bookings.find(
    (b) => b.userId === db.currentUserId && (b.status === 'confirmed' || b.status === 'pending'),
  )
  if (!booking) return null

  return mockBus.publish(
    'booking.reminder',
    {
      bookingId: booking.id,
      zoneId: booking.zoneId,
      machineLabel: booking.machineId ? (getMachine(booking.machineId)?.label ?? null) : null,
      startsAt: booking.startsAt,
      checkInOpen: true,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/** Someone sends a friend request. */
export function friendRequest(fromUserId = 'u-smoke'): RealtimeEnvelope<'friend.request'> | null {
  const sender = getPlayer(fromUserId)
  if (!sender) return null

  if (
    !db.friendships.some(
      (f) => f.userId === fromUserId && f.friendId === db.currentUserId,
    )
  ) {
    db.friendships.push({
      userId: fromUserId,
      friendId: db.currentUserId,
      status: 'pending',
      createdAt: db.now,
    })
    commit()
  }

  return mockBus.publish(
    'friend.request',
    {
      friendshipId: `${fromUserId}:${db.currentUserId}`,
      fromUserId,
      fromNickname: sender.user.nickname,
      // The mock user record has no avatar; Stage 4 fills this from storage.
      avatarUrl: null,
      kind: 'received',
      machineLabel: sender.machineId ? (getMachine(sender.machineId)?.label ?? null) : null,
    },
    { scope: { userId: db.currentUserId } },
  )
}

/* ------------------------------------------------------------------ *
 * The companion app (C1.5)
 * ------------------------------------------------------------------ */

/**
 * The **phone** confirms the QR code shown on this station.
 *
 * Not a staff action, but it belongs here for the same reason everything else
 * does: it is the *other* actor. The prototype has no companion app, so this is
 * the only way the lock screen's handshake can be answered — and the order is the
 * usual one: approve the challenge server-side first (`approveQrChallenge`), then
 * publish the frame.
 *
 * Addressed to the **seat**, not to a user: the station showing the code has
 * nobody signed in, so a `userId` in the scope would filter the frame out of the
 * one client that needs it.
 */
export function confirmQrLogin(
  userId: ID = 'u-demo',
  /** Challenge id or the typed station code. Defaults to this seat's live one. */
  ref?: ID,
): RealtimeEnvelope<'login.qr.confirmed'> | null {
  const approval = approveQrChallenge(userId, ref)
  if (!approval) return null

  return mockBus.publish(
    'login.qr.confirmed',
    {
      challengeId: approval.challengeId,
      machineId: approval.machineId,
      userId: approval.userId,
      nickname: approval.nickname,
      grantToken: approval.grantToken,
      device: approval.device,
    },
    { scope: { machineId: approval.machineId } },
  )
}

/** A friend invites the player into a party. */
export function partyInvite(): RealtimeEnvelope<'party.invite'> | null {
  const party = db.parties[0]
  if (!party) return null

  const owner = getPlayer(party.ownerId)
  return mockBus.publish(
    'party.invite',
    {
      partyId: party.id,
      fromUserId: party.ownerId,
      fromNickname: owner?.user.nickname ?? party.ownerId,
      gameId: party.gameId,
      memberCount: party.members.filter((m) => m.state === 'joined').length,
      expiresAt: new Date(Date.parse(db.now) + 5 * 60_000).toISOString(),
    },
    { scope: { userId: db.currentUserId } },
  )
}
