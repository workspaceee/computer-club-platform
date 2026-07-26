// MOCK ONLY — replaced in Stage 4 by an `EventSource` on `GET /api/realtime` (F4.2).
//
// The mock realtime channel. It exists so the whole client can be built and
// proven against "admin did something → the player saw it instantly" long before
// an admin panel or an SSE endpoint exists (F4.4).
//
// It behaves like a real channel on purpose, because those behaviours are what
// break UIs:
//
//  1. **Delivery is asynchronous.** Nothing is handed to a listener inside the
//     `publish()` call stack, so a component can never accidentally depend on
//     synchronous ordering that SSE will not give it.
//  2. **It can be offline.** `disconnect()` puts the channel in `offline`, which
//     is what drives the F4.5 banner. Events published while offline are queued
//     and **replayed in order** on reconnect, exactly like an SSE resume with
//     `Last-Event-ID`, so a drop loses nothing.
//  3. **It crosses tabs.** A `BroadcastChannel` mirrors every event to other
//     tabs of the same origin, so `/dev/bus` in one window drives the launcher in
//     another — the closest thing to two machines that a browser can offer.
//  4. **It keeps an audit log.** The last `HISTORY_LIMIT` envelopes are kept for
//     the dev panel; production code must never read it.
import { serverTime } from '@/lib/mock/api/client'
import {
  isRealtimeEnvelope,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
  type RealtimeEventMap,
  type RealtimeEventName,
  type RealtimeListener,
  type RealtimeTransport,
} from '@/lib/realtime/events'

/** Artificial hop so listeners are always reached from a later task. */
const DELIVERY_MS = 120

/** Envelopes kept for the dev panel log. */
const HISTORY_LIMIT = 60

/** Cross-tab mirror channel. Same name in every tab of the club launcher. */
const CHANNEL_NAME = 'imba.realtime'

type StateListener = (state: RealtimeConnectionState) => void

const listeners = new Set<RealtimeListener>()
const stateListeners = new Set<StateListener>()
/** Fires on any history change, so the dev log can re-render. */
const logListeners = new Set<() => void>()

let state: RealtimeConnectionState = 'connecting'
let seq = 0
let history: RealtimeEnvelope[] = []
/** Published while `offline`, delivered in order on the next `connect()`. */
let queue: RealtimeEnvelope[] = []
let lastDelivered = 0

let channel: BroadcastChannel | null = null
/**
 * MOCK ONLY — "the cable is unplugged". While it is `true`, `connect()` *fails*
 * after a realistic pause instead of succeeding, so the F4.5 backoff loop and the
 * offline banner can be observed for as long as the dev panel keeps the link down.
 */
let linkDown = false

function openChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (channel) return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (message: MessageEvent<unknown>) => {
    // Anything from another tab is treated as untrusted input.
    if (!isRealtimeEnvelope(message.data)) return
    receive(message.data, { mirror: false })
  }
  return channel
}

function setState(next: RealtimeConnectionState): void {
  if (state === next) return
  state = next
  for (const listener of stateListeners) listener(state)
}

function remember(event: RealtimeEnvelope): void {
  history = [...history, event].slice(-HISTORY_LIMIT)
  for (const listener of logListeners) listener()
}

function deliver(event: RealtimeEnvelope): void {
  lastDelivered = Math.max(lastDelivered, event.seq)
  // Snapshot the set: a handler is allowed to unsubscribe during delivery.
  for (const listener of [...listeners]) {
    try {
      listener(event)
    } catch (error) {
      // One broken screen must not stop the channel for every other screen.
      console.log('[v0] realtime listener threw for', event.type, error)
    }
  }
}

/**
 * Ingest an envelope, wherever it came from. Queued instead of dropped while
 * offline; mirrored to other tabs only when this tab is the origin.
 */
function receive(event: RealtimeEnvelope, { mirror }: { mirror: boolean }): void {
  seq = Math.max(seq, event.seq)
  remember(event)
  if (mirror) openChannel()?.postMessage(event)

  if (state !== 'open') {
    queue = [...queue, event]
    return
  }
  setTimeout(() => deliver(event), DELIVERY_MS)
}

function flush(): void {
  if (queue.length === 0) return
  const pending = queue
  queue = []
  console.log('[v0] realtime: replaying', pending.length, 'queued event(s)')
  // Replayed in order, spaced out so a screen sees them as separate updates.
  pending.forEach((event, index) => {
    setTimeout(() => deliver(event), DELIVERY_MS + index * 60)
  })
}

/**
 * The mock channel. `publish` is the half that disappears in Stage 4 (only the
 * server publishes); everything else is the `RealtimeTransport` the UI keeps.
 */
export const mockBus: RealtimeTransport & {
  publish<N extends RealtimeEventName>(
    type: N,
    payload: RealtimeEventMap[N],
  ): RealtimeEnvelope<N>
  /** Audit log for `/dev/bus`, newest last. MOCK ONLY. */
  history(): readonly RealtimeEnvelope[]
  /** Subscribe to log changes (published *and* queued events). MOCK ONLY. */
  subscribeLog(listener: () => void): () => void
  clearHistory(): void
  /** Events waiting for a reconnect. */
  queued(): number
  /**
   * MOCK ONLY — pull or restore the cable. `true` also drops an open channel, so
   * the banner appears immediately; `false` lets the next retry succeed.
   */
  setLinkDown(down: boolean): void
  isLinkDown(): boolean
  /** Full reset — used by the dev panel's "reset" button. */
  reset(): void
} = {
  subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  subscribeState(listener) {
    stateListeners.add(listener)
    // Fire immediately so a component never renders an unknown state.
    listener(state)
    return () => {
      stateListeners.delete(listener)
    }
  },

  getState() {
    return state
  },

  connect() {
    if (state === 'open') return
    setState('connecting')
    openChannel()
    // A real handshake is not instant; keep the connecting state visible.
    setTimeout(() => {
      if (linkDown) {
        // A failed attempt, not a silent success — this is what the retry loop
        // in `hooks/use-realtime.ts` is written against.
        setState('offline')
        return
      }
      setState('open')
      flush()
    }, DELIVERY_MS * 2)
  },

  disconnect() {
    setState('offline')
  },

  lastSeq() {
    return lastDelivered
  },

  publish(type, payload) {
    seq += 1
    const event: RealtimeEnvelope<typeof type> = {
      id: `evt-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      seq,
      type,
      at: serverTime(),
      payload,
    }
    receive(event as RealtimeEnvelope, { mirror: true })
    return event
  },

  history() {
    return history
  },

  subscribeLog(listener) {
    logListeners.add(listener)
    return () => {
      logListeners.delete(listener)
    }
  },

  clearHistory() {
    history = []
    for (const listener of logListeners) listener()
  },

  queued() {
    return queue.length
  },

  setLinkDown(down) {
    linkDown = down
    if (down) setState('offline')
  },

  isLinkDown() {
    return linkDown
  },

  reset() {
    queue = []
    history = []
    lastDelivered = 0
    seq = 0
    linkDown = false
    for (const listener of logListeners) listener()
  },
}

/**
 * The transport the app uses. Stage 4 points this at the SSE implementation and
 * every hook, component and screen stays untouched.
 */
export const realtime: RealtimeTransport = mockBus
