// MOCK ONLY — replaced by the SSE channel in Stage 4 (B1.4).
//
// The mock realtime channel (F4.2). It is deliberately written as a *transport*,
// not as an event emitter, because the whole point of F4 is that Stage 4 can drop
// in `EventSource` without touching a single screen:
//
//   * one channel per client, opened with `connect()` and closed with
//     `disconnect()` — subscribing is not the same thing as being connected;
//   * every frame gets a monotonic `seq`, and frames raised while the link is
//     down are **kept server-side** and replayed on reconnect, exactly like
//     `Last-Event-ID` resumption. "Admin gave time while the cable was out" must
//     not silently vanish;
//   * scope filtering happens here (`matchesScope`), so a screen never sees an
//     event addressed to another seat;
//   * delivery is asynchronous with a small latency, so no UI can accidentally
//     depend on a synchronous `publish → render` order that a network never gives.
//
// The bus never mutates `lib/mock/db`. Admin actions live in
// `lib/realtime/admin-sim.ts` (F4.4): they change state through the same shapes
// the real backend will, then publish here.
import { serverTime } from '@/lib/mock/api/client'
import {
  GLOBAL_SCOPE,
  type AnyRealtimeEvent,
  type RealtimeEnvelope,
  type RealtimeEventMap,
  type RealtimeEventName,
  type RealtimeHandler,
  type RealtimeScope,
  type RealtimeStatus,
  matchesScope,
} from '@/lib/realtime/events'
import type { ID, ISODateTime } from '@/lib/types/common'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Who is listening. The bus only delivers frames addressed to this client. */
export interface RealtimeIdentity {
  userId: ID | null
  machineId: ID | null
  zoneId: ID | null
}

export interface PublishOptions {
  /** Narrow the audience. Anything omitted stays club-wide. */
  scope?: Partial<RealtimeScope>
  /** Override the server timestamp. Defaults to the mock server clock. */
  at?: ISODateTime
}

/** Unsubscribe function returned by every `subscribe*` call. */
export type Unsubscribe = () => void

/** One row in the dev-panel log: the frame plus what the channel did with it. */
export interface BusLogEntry {
  event: AnyRealtimeEvent
  /** `delivered` — handlers ran. `queued` — link was down, waiting for replay.
   *  `dropped` — addressed to a different seat or user. */
  outcome: 'delivered' | 'queued' | 'dropped'
  /** Client wall clock, for ordering rows in the panel. */
  loggedAtMs: number
}

/* ------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------ */

/** Frames kept for replay and for the dev log. Oldest are dropped first. */
const BACKLOG_LIMIT = 200

/** Simulated handshake time, so `connecting` is a state the UI really sees. */
const CONNECT_MS = 220

/** Simulated wire latency. Small: MVP §7 demands the client reacts in < 1 s. */
const DELIVER_MS = 60

/* ------------------------------------------------------------------ *
 * Channel
 * ------------------------------------------------------------------ */

interface Subscription {
  /** `null` subscribes to every event name. */
  types: Set<RealtimeEventName> | null
  handler: (event: AnyRealtimeEvent) => void
}

class MockRealtimeChannel {
  private subs = new Set<Subscription>()
  private statusHandlers = new Set<(status: RealtimeStatus) => void>()
  private logHandlers = new Set<(entry: BusLogEntry) => void>()

  private state: RealtimeStatus = 'idle'
  private identity: RealtimeIdentity = { userId: null, machineId: null, zoneId: null }

  /** Everything ever published, newest last. Doubles as the replay buffer. */
  private backlog: AnyRealtimeEvent[] = []
  private entries: BusLogEntry[] = []
  private seq = 0
  /** Highest `seq` this client has already been handed. */
  private cursor = 0

  /** Physical link. `false` simulates a pulled cable / dead server (F4.5). */
  private linkUp = true

  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private deliverTimers = new Set<ReturnType<typeof setTimeout>>()

  /* -- connection --------------------------------------------------- */

  get status(): RealtimeStatus {
    return this.state
  }

  get connected(): boolean {
    return this.state === 'open'
  }

  /** `false` while the simulated link is cut. */
  get online(): boolean {
    return this.linkUp
  }

  /**
   * Opens the channel for one client. Resolves when the handshake succeeds and
   * rejects when the link is down — the caller (`useRealtime`) owns the backoff,
   * so retry policy is client-side, exactly as it will be with `EventSource`.
   */
  connect(identity: RealtimeIdentity): Promise<void> {
    this.identity = identity
    this.clearConnectTimer()
    this.setStatus('connecting')

    return new Promise((resolve, reject) => {
      this.connectTimer = setTimeout(() => {
        this.connectTimer = null
        if (!this.linkUp) {
          this.setStatus('offline')
          reject(new Error('realtime: link is down'))
          return
        }
        this.setStatus('open')
        // Hand over anything raised while we were away, in order.
        this.flushBacklog()
        resolve()
      }, CONNECT_MS)
    })
  }

  /** Closes the channel. Queued frames survive for the next `connect()`. */
  disconnect(): void {
    this.clearConnectTimer()
    for (const timer of this.deliverTimers) clearTimeout(timer)
    this.deliverTimers.clear()
    this.setStatus('idle')
  }

  /** Status changes, including the current value on subscribe. */
  onStatus(handler: (status: RealtimeStatus) => void): Unsubscribe {
    this.statusHandlers.add(handler)
    handler(this.state)
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  private setStatus(next: RealtimeStatus): void {
    if (this.state === next) return
    this.state = next
    for (const handler of this.statusHandlers) handler(next)
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
  }

  /* -- subscription ------------------------------------------------- */

  /**
   * Listens to one or more event names.
   *
   * ```ts
   * const off = mockBus.subscribe(['time.added', 'session.paused'], (event) => {
   *   // event.payload is narrowed by event.type
   * })
   * ```
   */
  subscribe<K extends RealtimeEventName>(
    types: readonly K[] | K,
    handler: RealtimeHandler<K>,
  ): Unsubscribe {
    const list = Array.isArray(types) ? types : [types as K]
    const sub: Subscription = {
      types: new Set<RealtimeEventName>(list),
      handler: handler as (event: AnyRealtimeEvent) => void,
    }
    this.subs.add(sub)
    return () => {
      this.subs.delete(sub)
    }
  }

  /** Listens to every event. Used by the dev console and the toast bridge. */
  subscribeAll(handler: (event: AnyRealtimeEvent) => void): Unsubscribe {
    const sub: Subscription = { types: null, handler }
    this.subs.add(sub)
    return () => {
      this.subs.delete(sub)
    }
  }

  /* -- publishing --------------------------------------------------- */

  /**
   * Raises an event. Called by `admin-sim.ts` and, in Stage 4, by the server.
   * Returns the envelope so a caller can log or assert on `seq`.
   */
  publish<K extends RealtimeEventName>(
    type: K,
    payload: RealtimeEventMap[K],
    options: PublishOptions = {},
  ): RealtimeEnvelope<K> {
    this.seq += 1
    const envelope: RealtimeEnvelope<K> = {
      id: `evt-${this.seq.toString(36)}`,
      type,
      at: options.at ?? serverTime(),
      seq: this.seq,
      scope: { ...GLOBAL_SCOPE, ...options.scope },
      payload,
    }

    const frame = envelope as AnyRealtimeEvent
    this.backlog.push(frame)
    if (this.backlog.length > BACKLOG_LIMIT) this.backlog.shift()

    if (!matchesScope(frame.scope, this.identity)) {
      // Addressed elsewhere: the real SSE stream would never send it to us.
      this.cursor = Math.max(this.cursor, frame.seq)
      this.record(frame, 'dropped')
      return envelope
    }

    if (this.state !== 'open') {
      // Held for replay — the club kept happening while we were disconnected.
      this.record(frame, 'queued')
      return envelope
    }

    this.cursor = frame.seq
    this.record(frame, 'delivered')
    this.deliver(frame)
    return envelope
  }

  /** Delivers everything this client missed, then advances the cursor. */
  private flushBacklog(): void {
    const missed = this.backlog.filter(
      (frame) => frame.seq > this.cursor && matchesScope(frame.scope, this.identity),
    )
    if (missed.length === 0) return
    this.cursor = this.seq
    for (const frame of missed) {
      this.record(frame, 'delivered')
      this.deliver(frame)
    }
  }

  private deliver(frame: AnyRealtimeEvent): void {
    const timer = setTimeout(() => {
      this.deliverTimers.delete(timer)
      if (this.state !== 'open') return
      for (const sub of this.subs) {
        if (sub.types !== null && !sub.types.has(frame.type)) continue
        try {
          sub.handler(frame)
        } catch (error) {
          // One bad handler must not stop the channel.
          console.log('[v0] realtime handler failed for', frame.type, error)
        }
      }
    }, DELIVER_MS)
    this.deliverTimers.add(timer)
  }

  /* -- link control (F4.5 rehearsal) -------------------------------- */

  /**
   * Cuts or restores the simulated link. Cutting it does **not** clear anything:
   * the countdown keeps running off the last `expiresAt` and events keep queueing,
   * which is precisely the behaviour F4.5 asks for.
   */
  setLinkUp(up: boolean): void {
    if (this.linkUp === up) return
    this.linkUp = up
    if (!up) {
      this.clearConnectTimer()
      this.setStatus('offline')
    }
    // Coming back up is not automatic: `useRealtime` reconnects with backoff.
  }

  /* -- log ---------------------------------------------------------- */

  private record(event: AnyRealtimeEvent, outcome: BusLogEntry['outcome']): void {
    const entry: BusLogEntry = { event, outcome, loggedAtMs: Date.now() }
    this.entries.push(entry)
    if (this.entries.length > BACKLOG_LIMIT) this.entries.shift()
    for (const handler of this.logHandlers) handler(entry)
  }

  /** Newest first, for the dev console. */
  log(limit = 50): BusLogEntry[] {
    return this.entries.slice(-limit).reverse()
  }

  /** Live log tail. Returns an unsubscribe. */
  onLog(handler: (entry: BusLogEntry) => void): Unsubscribe {
    this.logHandlers.add(handler)
    return () => {
      this.logHandlers.delete(handler)
    }
  }

  clearLog(): void {
    this.entries = []
  }

  /** Frames raised while disconnected that this client has not seen yet. */
  get pendingCount(): number {
    return this.backlog.filter(
      (frame) => frame.seq > this.cursor && matchesScope(frame.scope, this.identity),
    ).length
  }

  /** Full teardown — for tests and for the panel's "Reset" button. */
  reset(): void {
    this.disconnect()
    this.subs.clear()
    this.backlog = []
    this.entries = []
    this.seq = 0
    this.cursor = 0
    this.linkUp = true
  }
}

/**
 * The one channel of the app. A singleton because a station has exactly one
 * connection to the club server — mounting two subscribers must not open two
 * streams.
 */
export const mockBus = new MockRealtimeChannel()
