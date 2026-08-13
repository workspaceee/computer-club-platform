'use client'

/**
 * The one way a screen listens to the server (F4.3).
 *
 * Three hooks, one channel:
 *
 *   `useRealtimeChannel()` — mounted **once**, near the root. Opens the channel,
 *     owns the reconnect backoff and exposes the status the offline banner reads
 *     (F4.5). Mounting it twice would open two streams, so it is the shell's job.
 *
 *   `useRealtimeEvent(names, handler)` — per-screen subscription with automatic
 *     cleanup. The handler is kept in a ref, so a component may pass an inline
 *     arrow function without resubscribing on every render.
 *
 *   `useRealtimeRevalidation()` — turns pushes into SWR invalidation
 *     (MVP §11: "SWR + SSE-инвалидация"), so a screen shows fresh server data
 *     without wiring a handler per query.
 *
 * Stage 4 replaces `mockBus` below with the `EventSource` transport for
 * `GET /api/realtime` (B1.4). Names, payloads, statuses and this API stay
 * identical, so no screen changes — that is the entire point of F4.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
// One rule for "which reads does this make stale", shared with the mutation path
// (`useInvalidate`).
import { keyMatches } from '@/hooks/use-api'
import {
  EVENT_INVALIDATES,
  OFFLINE_BANNER_DELAY_MS,
  reconnectDelay,
  type AnyRealtimeEvent,
  type RealtimeEventName,
  type RealtimeHandler,
  type RealtimeStatus,
} from '@/lib/realtime/events'
import { mockBus, type RealtimeIdentity } from '@/lib/realtime/mock-bus'
import { DEV_SHORTCUTS, LINK_BLIP_MS, readLinkOverride } from '@/lib/dev-flags'
import { db } from '@/lib/mock/db'

/** The transport in use. Stage 4 points this at the SSE channel. */
const bus = mockBus

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

/**
 * Who this client is, for scope filtering. Read from the mock db today; in
 * Stage 4 it comes from the session cookie and the agent handshake, and the
 * server does the filtering instead — the shape is what matters.
 */
function currentIdentity(): RealtimeIdentity {
  const machine = db.machines.find((m) => m.id === db.currentMachineId)
  return {
    userId: db.currentUserId,
    machineId: db.currentMachineId,
    zoneId: machine?.zoneId ?? null,
  }
}

/* ------------------------------------------------------------------ *
 * Channel + connection state (F4.5)
 * ------------------------------------------------------------------ */

export interface RealtimeChannelState {
  status: RealtimeStatus
  /** `true` while events are flowing. */
  connected: boolean
  /**
   * Whether the "No connection to the club server" banner should be up.
   *
   * Delayed by `OFFLINE_BANNER_DELAY_MS` so a blink of packet loss does not
   * flash a scary banner mid-match, and it never implies the clock stopped: club
   * time keeps running off the last `expiresAt` regardless (F4.5).
   */
  offline: boolean
  /** Failed attempts since the link was last healthy. Resets on success. */
  attempt: number
  /** Seconds until the next automatic attempt, `0` when one is in flight. */
  retryInSeconds: number
  /** Events queued server-side while we were away, delivered on reconnect. */
  pending: number
  /** Skips the backoff wait — the banner's "Retry now" button. */
  reconnectNow: () => void
}

/**
 * Opens the channel and keeps it open. Mount once, in the app shell.
 *
 * Reconnect policy: `RECONNECT_BACKOFF_MS` (1s → 30s, then forever at 30s). A
 * station left running overnight must keep trying without hammering the server.
 */
export function useRealtimeChannel(): RealtimeChannelState {
  const [status, setStatus] = useState<RealtimeStatus>(bus.status)
  const [attempt, setAttempt] = useState(0)
  const [offline, setOffline] = useState(false)
  const [retryInSeconds, setRetryInSeconds] = useState(0)
  const [pending, setPending] = useState(0)

  const alive = useRef(true)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  const clearRetry = useCallback(() => {
    if (retryTimer.current !== null) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }, [])

  const open = useCallback(async () => {
    clearRetry()
    setRetryInSeconds(0)
    try {
      await bus.connect(currentIdentity())
      if (!alive.current) return
      attemptRef.current = 0
      setAttempt(0)
    } catch {
      if (!alive.current) return
      const next = attemptRef.current + 1
      attemptRef.current = next
      setAttempt(next)
      const delay = reconnectDelay(next - 1)
      setRetryInSeconds(Math.round(delay / 1000))
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null
        void open()
      }, delay)
    }
  }, [clearRetry])

  // Mirror the channel status, and keep the queued-event count fresh.
  useEffect(() => {
    const offStatus = bus.onStatus((next) => {
      setStatus(next)
      setPending(bus.pendingCount)
    })
    // The status flips to `open` *before* the backlog drains, so counting only on
    // status changes would leave "1 queued" on screen forever. Recount on every
    // delivered frame instead — that is exactly when the queue shrinks.
    const offEvents = bus.subscribeAll(() => setPending(bus.pendingCount))
    // …and when it grows: frames published during an outage are logged, never
    // delivered, so the log is the only signal that the backlog got longer.
    const offLog = bus.onLog(() => setPending(bus.pendingCount))
    return () => {
      offStatus()
      offEvents()
      offLog()
    }
  }, [])

  /**
   * `?link=cut` / `?link=blip` — boot into an outage (`lib/dev-flags.ts`).
   *
   * Declared **above** the connect effect so it runs first: the link is already
   * down when `open()` is called, so the very first handshake fails and the page
   * comes up the way it would with the cable out, rather than connecting and
   * losing it a frame later. `blip` puts it back after `LINK_BLIP_MS` and lets the
   * existing backoff notice — no second reconnect path, so what a reviewer watches
   * is the product's own recovery.
   *
   * Dropped from a production build with `DEV_SHORTCUTS`; the whole hook body below
   * is untouched by it.
   */
  useEffect(() => {
    if (!DEV_SHORTCUTS) return
    const override = readLinkOverride()
    if (!override) return
    bus.setLinkUp(false)
    if (override !== 'blip') return
    const timer = setTimeout(() => bus.setLinkUp(true), LINK_BLIP_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    alive.current = true
    void open()
    return () => {
      alive.current = false
      clearRetry()
      bus.disconnect()
    }
  }, [open, clearRetry])

  // Banner grace period: only a *sustained* outage is worth telling about.
  useEffect(() => {
    if (status === 'open' || status === 'idle') {
      setOffline(false)
      return
    }
    // `connecting` after a failure still counts as an outage, so the banner does
    // not flicker off between attempts.
    if (status === 'connecting' && attempt === 0) return
    const timer = setTimeout(() => setOffline(true), OFFLINE_BANNER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [status, attempt])

  // Countdown to the next attempt, for "retrying in 5 s".
  useEffect(() => {
    if (retryInSeconds <= 0) return
    const timer = setInterval(() => {
      setRetryInSeconds((left) => Math.max(0, left - 1))
    }, 1_000)
    return () => clearInterval(timer)
  }, [retryInSeconds])

  const reconnectNow = useCallback(() => {
    void open()
  }, [open])

  return {
    status,
    connected: status === 'open',
    offline,
    attempt,
    retryInSeconds,
    pending,
    reconnectNow,
  }
}

/* ------------------------------------------------------------------ *
 * Per-screen subscriptions
 * ------------------------------------------------------------------ */

/**
 * Subscribes to one or more events for as long as the component is mounted.
 *
 * ```tsx
 * useRealtimeEvent('order.status', (event) => {
 *   toast('info', t(`shop.orderStatus.${event.payload.status}`))
 * })
 *
 * useRealtimeEvent(['session.paused', 'session.resumed'], (event) => {
 *   applySnapshot(event.payload.snapshot)   // payload is narrowed by type
 * })
 * ```
 *
 * The handler may be an inline closure: it is stored in a ref, so re-renders do
 * not tear the subscription down and back up.
 */
export function useRealtimeEvent<K extends RealtimeEventName>(
  names: readonly K[] | K,
  handler: RealtimeHandler<K>,
  /** Set `false` to suspend without unmounting, e.g. while a modal is closed. */
  enabled = true,
): void {
  const latest = useRef(handler)
  latest.current = handler

  // Array literals are new on every render; the key keeps the effect stable.
  const key = (Array.isArray(names) ? [...names].sort().join(',') : names) as string

  useEffect(() => {
    if (!enabled) return
    const list = key.split(',') as K[]
    return bus.subscribe(list, (event) => latest.current(event))
  }, [key, enabled])
}

/** Every event, in arrival order. For the dev console and the toast bridge. */
export function useRealtimeAny(
  handler: (event: AnyRealtimeEvent) => void,
  enabled = true,
): void {
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    if (!enabled) return
    return bus.subscribeAll((event) => latest.current(event))
  }, [enabled])
}

/* ------------------------------------------------------------------ *
 * Cache invalidation
 * ------------------------------------------------------------------ */

/**
 * Revalidates the SWR keys an event made stale (`EVENT_INVALIDATES`).
 *
 * Mount once alongside `useRealtimeChannel()`. This is what makes "admin changed
 * the catalogue — the player sees the new prices without a restart" true for
 * every screen at the same time, instead of one handler per query.
 */
export function useRealtimeRevalidation(): void {
  const { mutate } = useSWRConfig()

  useRealtimeAny(
    useCallback(
      (event) => {
        const prefixes = EVENT_INVALIDATES[event.type]
        if (prefixes.length === 0) return
        void mutate((key: unknown) => keyMatches(key, prefixes))
      },
      [mutate],
    ),
  )
}
