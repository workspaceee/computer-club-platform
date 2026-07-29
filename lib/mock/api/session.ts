// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/session/*`. The one domain where the contract really matters: the client
// must derive its countdown from `expiresAt` returned here, never from a locally
// decremented counter (F3.7, F6.3).
import { ApiError, mutate, newId, query, required, serverTime } from '@/lib/mock/api/client'
import {
  db,
  getLiveSession,
  getMachine,
  getOpenTab,
  getSession,
  getZone,
} from '@/lib/mock/db'
import type { ID, Minutes, Seconds } from '@/lib/types/common'
import type { MachineSettings, MachineTelemetry } from '@/lib/types/machine'
import type {
  BillingMode,
  Session,
  SessionSnapshot,
  SessionWarning,
} from '@/lib/types/session'
import type { Tab } from '@/lib/types/tab'

/**
 * Seconds still available on a session, floored at zero.
 *
 * Exported because the paused-visit read of C1.10 states this number on the lock
 * screen ("42:17 left on the clock"), and a screen that computed it from
 * `secondsGranted - secondsUsed` itself would be a second opinion about the one
 * quantity the club bills.
 */
export function secondsLeft(session: Session): Seconds {
  return Math.max(0, session.secondsGranted - session.secondsUsed)
}

/**
 * Builds the snapshot the heartbeat returns. `expiresAt` is absolute server time,
 * and `null` while paused because a paused session has no deadline.
 */
function snapshot(session: Session): SessionSnapshot {
  const left = secondsLeft(session)
  const tab = getOpenTab(session.id)
  return {
    sessionId: session.id,
    state: session.state,
    billingMode: session.billingMode,
    machineId: session.machineId,
    expiresAt:
      session.state === 'active'
        ? new Date(Date.parse(db.now) + left * 1000).toISOString()
        : null,
    secondsLeft: left,
    debtSeconds: session.debtSeconds,
    tabTotalCents: tab?.totalCents ?? 0,
    serverTime: serverTime(),
  }
}

/** `GET /api/session/current` and the 10-second heartbeat. */
export function fetchCurrentSession(): Promise<SessionSnapshot> {
  return query('session.fetchCurrentSession', () =>
    snapshot(required(getSession(db.currentSessionId), 'sessionExpired')),
  )
}

/** `GET /api/session/:id` — the raw record, for receipts and history. */
export function fetchSession(sessionId: ID): Promise<Session> {
  return query('session.fetchSession', () => required(getSession(sessionId)))
}

/** `GET /api/session/history` — ended sessions, newest first. */
export function fetchSessionHistory(userId: ID = db.currentUserId): Promise<Session[]> {
  return query('session.fetchSessionHistory', () =>
    db.sessions
      .filter((s) => s.userId === userId && s.state === 'ended')
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
  )
}

/**
 * `POST /api/session/heartbeat` — advances the clock by the elapsed seconds the
 * agent reports. The server owns time accounting; the client only reports that it
 * is still alive.
 */
export function heartbeat(elapsedSeconds: Seconds = 10): Promise<SessionSnapshot> {
  return mutate('session.heartbeat', () => {
    const session = required(getSession(db.currentSessionId), 'sessionExpired')
    if (session.state !== 'active') return snapshot(session)

    const burn = Math.max(0, Math.floor(elapsedSeconds))
    const available = secondsLeft(session)
    session.secondsUsed += Math.min(burn, available)

    // Postpaid seats may overrun into debt up to the club credit limit; prepaid
    // seats simply stop.
    const overrun = burn - available
    if (overrun > 0) {
      if (session.billingMode === 'postpaid') {
        session.debtSeconds += overrun
      } else {
        session.state = 'ended'
        session.endedAt = db.now
        session.closedBy = 'timeout'
      }
    }
    return snapshot(session)
  })
}

/** `POST /api/session/pause` — the lock button. Keeps the seat, stops the clock. */
export function pauseSession(sessionId: ID = db.currentSessionId): Promise<SessionSnapshot> {
  return mutate('session.pauseSession', () => {
    const session = required(getSession(sessionId), 'sessionExpired')
    if (session.state === 'ended') throw new ApiError('conflict')
    session.state = 'paused'
    return snapshot(session)
  })
}

/**
 * Restarting a paused visit, as a **store operation** rather than an endpoint.
 *
 * Two endpoints resume a session and they must not disagree about what that
 * means: `POST /api/session/resume` below, and the PIN unlock of C1.10, which
 * authenticates *and* resumes in a single round trip — a player who just typed
 * four digits is waiting for their launcher, not for two requests. So the rule
 * (a dead visit cannot come back, a spent prepaid clock cannot come back) lives
 * here and the transport wraps it.
 */
export function resumeSessionRow(sessionId: ID): SessionSnapshot {
  const session = required(getSession(sessionId), 'sessionExpired')
  if (session.state === 'ended') throw new ApiError('sessionExpired')
  if (secondsLeft(session) === 0 && session.billingMode === 'prepaid') {
    throw new ApiError('insufficientFunds')
  }
  session.state = 'active'
  db.currentSessionId = session.id
  return snapshot(session)
}

/** `POST /api/session/resume` */
export function resumeSession(sessionId: ID = db.currentSessionId): Promise<SessionSnapshot> {
  return mutate('session.resumeSession', () => resumeSessionRow(sessionId))
}

/**
 * Length of a prepaid visit opened at the station, in minutes.
 *
 * The counter sells the hours in stage 2 and `C6` prices them from club
 * settings; until then the seat opens with the same two hours the store's
 * `SESSION_LENGTH` shows, so the clock in the HUD and the row behind it cannot
 * disagree about what was sold.
 */
const DEFAULT_PREPAID_MINUTES: Minutes = 120

export interface OpenSessionInput {
  /** Member visit. Exactly one of `userId` / `guestId`, like `Session`. */
  userId?: ID | null
  guestId?: ID | null
  billingMode: BillingMode
  /** Prepaid only — postpaid is granted nothing and runs into the tab. */
  minutes?: Minutes
  machineId?: ID
}

/**
 * `POST /api/session/open` — claims the seat for the arrival that just passed
 * the lock screen (C1.7).
 *
 * This is the write that makes the seat check mean something. Before it, a visit
 * existed only in the client store: the lock screen asked
 * `fetchStationHolder()`, and the answer could only ever be a fixture or an
 * admin action, so "the chair was freed, let the next player in" was
 * unreachable from the product itself.
 *
 * The seat guard lives **here**, not only on the screen, because a check the
 * client performs is a courtesy and a check the server performs is a rule: two
 * arrivals racing the same chair both read `null` from the holder endpoint
 * before either of them wrote anything.
 *
 * A live row on the seat is not always a refusal, and the two cases that adopt
 * it are the two the product promises:
 *  - **Same member.** "Lock PC" leaves a paused visit behind, so its owner walks
 *    back into *that* row instead of opening a second one on top of it.
 *  - **Guest after guest.** A walk-in has no account to match, and the open tab
 *    belongs to the seat (MVP §8.2) — a second row would silently abandon what
 *    the first one owes.
 * Anything else is a `conflict`: somebody else is sitting here.
 */
export function openSession(input: OpenSessionInput): Promise<SessionSnapshot> {
  return mutate('session.openSession', () => {
    const machineId = input.machineId ?? db.currentMachineId
    const userId = input.userId ?? null
    const guestId = input.guestId ?? null
    // Exactly one identity, enforced rather than assumed: a row with both set
    // would be counted twice by every report that groups by one of them.
    if ((userId === null) === (guestId === null)) throw new ApiError('validation')

    const live = getLiveSession(machineId)

    if (live) {
      const mine = userId !== null && live.userId === userId
      const guestAfterGuest = guestId !== null && live.guestId !== null
      if (!mine && !guestAfterGuest) throw new ApiError('conflict')

      // Adoption, not a new visit: the clock the player left behind keeps its
      // used seconds and its debt, and unlocking is what starts it again.
      live.state = 'active'
      db.currentSessionId = live.id
      return snapshot(live)
    }

    const granted =
      input.billingMode === 'prepaid' ? (input.minutes ?? DEFAULT_PREPAID_MINUTES) * 60 : 0

    const session: Session = {
      id: newId('sess'),
      userId,
      guestId,
      machineId,
      billingMode: input.billingMode,
      state: 'active',
      startedAt: db.now,
      endedAt: null,
      secondsGranted: granted,
      secondsUsed: 0,
      pausedSeconds: 0,
      debtSeconds: 0,
      closedBy: null,
    }
    db.sessions.push(session)
    db.currentSessionId = session.id

    // The floor map has to agree with the seat: `endSession` frees the machine,
    // so opening one has to take it, or an occupied chair keeps reading `free`
    // on the admin screen and in the station strip (C1.6).
    const machine = getMachine(machineId)
    if (machine) machine.status = 'occupied'

    if (userId) {
      const player = db.players.get(userId)
      if (player) {
        player.online = true
        player.machineId = machineId
      }
    }

    return snapshot(session)
  })
}

export interface EndSessionResult {
  session: Session
  /** Open tab that still has to be settled at the counter, when there is one. */
  tab: Tab | null
}

/**
 * `POST /api/session/end`. Frees the seat and hands back the tab, because an open
 * bill is exactly what the player has to be told about on the way out.
 */
export function endSession(sessionId: ID = db.currentSessionId): Promise<EndSessionResult> {
  return mutate('session.endSession', () => {
    const session = required(getSession(sessionId), 'sessionExpired')
    if (session.state === 'ended') throw new ApiError('conflict')

    session.state = 'ended'
    session.endedAt = db.now
    session.closedBy = 'user'

    const machine = getMachine(session.machineId)
    if (machine) machine.status = 'free'

    if (session.userId) {
      const player = db.players.get(session.userId)
      if (player) {
        player.online = false
        player.machineId = null
        player.playingGameId = null
      }
    }

    return { session, tab: getOpenTab(session.id) ?? null }
  })
}

/**
 * `POST /api/session/extend` — burns banked pass minutes into the running
 * session. Draws from the oldest purchase first, like the server will.
 */
export function extendSession(
  minutes: Minutes,
  sessionId: ID = db.currentSessionId,
): Promise<SessionSnapshot> {
  return mutate('session.extendSession', () => {
    if (!Number.isInteger(minutes) || minutes <= 0) throw new ApiError('validation')
    const session = required(getSession(sessionId), 'sessionExpired')
    const userId = required(session.userId, 'unauthorized')

    const purchases = db.passPurchases
      .filter((p) => p.userId === userId && p.minutesLeft > 0)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

    const banked = purchases.reduce((sum, p) => sum + p.minutesLeft, 0)
    if (banked < minutes) throw new ApiError('insufficientFunds')

    let remaining = minutes
    for (const purchase of purchases) {
      if (remaining === 0) break
      const take = Math.min(purchase.minutesLeft, remaining)
      purchase.minutesLeft -= take
      remaining -= take
    }

    session.secondsGranted += minutes * 60
    if (session.state === 'paused') session.state = 'active'

    db.transactions.push({
      id: newId('tx'),
      userId,
      type: 'time_grant',
      amount: minutes * 60,
      currency: 'EUR',
      refType: 'session',
      refId: session.id,
      staffId: null,
      note: `Extended by ${minutes} min`,
      createdAt: db.now,
    })

    return snapshot(session)
  })
}

/**
 * `GET /api/session/warning` — low-time state. The thresholds live in club
 * settings so admin can retune them without a client release.
 */
export function fetchSessionWarning(
  sessionId: ID = db.currentSessionId,
): Promise<SessionWarning | null> {
  return query('session.fetchSessionWarning', () => {
    const session = required(getSession(sessionId), 'sessionExpired')
    const left = secondsLeft(session)
    const { critical, warning, notice } = db.clubSettings.warningThresholds
    const minutes = left / 60

    const level: SessionWarning['level'] | null =
      minutes <= critical ? 'critical' : minutes <= warning ? 'warning' : minutes <= notice ? 'notice' : null

    return level ? { sessionId: session.id, secondsLeft: left, level } : null
  })
}

/** `GET /api/machine/settings` — per-seat hardware state for this session. */
export function fetchMachineSettings(
  machineId: ID = db.currentMachineId,
): Promise<MachineSettings> {
  return query('session.fetchMachineSettings', () =>
    required(db.machineSettings.find((m) => m.machineId === machineId)),
  )
}

/** `PATCH /api/machine/settings` — brightness, resolution, audio devices. */
export function updateMachineSettings(
  patch: Partial<Omit<MachineSettings, 'machineId' | 'sessionId'>>,
  machineId: ID = db.currentMachineId,
): Promise<MachineSettings> {
  return mutate('session.updateMachineSettings', () => {
    const settings = required(db.machineSettings.find((m) => m.machineId === machineId))
    Object.assign(settings, patch, { appliedAt: db.now })
    return settings
  })
}

/**
 * `GET /api/machine/telemetry` — live agent readings. Derived from the seat's
 * specs so a 240 Hz VIP rig reports better numbers than a standard one.
 */
export function fetchTelemetry(machineId: ID = db.currentMachineId): Promise<MachineTelemetry> {
  return query('session.fetchTelemetry', () => {
    const machine = required(getMachine(machineId))
    const zone = getZone(machine.zoneId)
    const ceiling = machine.specs.refreshHz
    const vip = zone?.class === 'vip'
    const jitter = (spread: number) => Math.round((Math.random() - 0.5) * spread)

    return {
      fps: Math.max(60, ceiling - 20 + jitter(30)),
      pingMs: Math.max(3, (vip ? 8 : 14) + jitter(6)),
      cpuTempC: (vip ? 58 : 63) + jitter(8),
      gpuTempC: (vip ? 64 : 71) + jitter(8),
      cpuLoadPct: Math.min(99, 42 + jitter(30)),
      gpuLoadPct: Math.min(99, 78 + jitter(24)),
      diskUsedPct: 61,
    }
  })
}
