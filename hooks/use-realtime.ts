'use client'

/**
 * The single point where the UI subscribes to realtime (F4.3).
 *
 * No component may touch `mockBus` directly: it talks to these hooks, and Stage 4
 * swaps `realtime` in `lib/realtime/mock-bus.ts` for an SSE transport without a
 * single UI file changing.
 *
 *   useRealtime({
 *     'time.added': (e) => reanchor(e.payload.expiresAt),
 *     'order.status': (e) => setStatus(e.payload.status),
 *   })
 *
 * Two things this hook deliberately takes off the caller's hands:
 *
 *  1. **Handlers are read through a ref.** A screen can pass fresh inline arrows
 *     on every render without re-subscribing — the common cause of missed events
 *     in hand-rolled subscriptions.
 *  2. **Cleanup is automatic and total.** Unsubscribe happens on unmount, so a
 *     closed modal can never keep reacting to the club.
 *
 * `useRealtimeConnection()` owns the reconnect policy (F4.5): one module-level
 * driver runs the backoff for the whole app no matter how many components watch
 * it, and the session countdown is never touched — time in the club runs from
 * `expiresAt` regardless of the socket.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type {
  RealtimeConnectionState,
  RealtimeEnvelope,
  RealtimeEventName,
  RealtimeHandlers,
} from '@/lib/realtime/events'
import { realtime } from '@/lib/realtime/mock-bus'

/* ------------------------------------------------------------------ *
 * Subscription
 * ------------------------------------------------------------------ */

/** Subscribe to any number of events. Handlers may change freely between renders. */
export function useRealtime(handlers: RealtimeHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(
    () =>
      realtime.subscribe((event) => {
        // Indexing the map with the union member keeps `payload` narrowed for the
        // handler that actually runs.
        const handler = ref.current[event.type] as ((e: typeof event) => void) | undefined
        handler?.(event)
      }),
    [],
  )
}

/** Sugar for the common single-event case. */
export function useRealtimeEvent<N extends RealtimeEventName>(
  type: N,
  handler: (event: RealtimeEnvelope<N>) => void,
): void {
  const ref = useRef(handler)
  ref.current = handler

  useEffect(
    () =>
      realtime.subscribe((event) => {
        if (event.type === type) ref.current(event as RealtimeEnvelope<N>)
      }),
    [type],
  )
}

/* ------------------------------------------------------------------ *
 * Connection + reconnect policy (F4.5)
 * ------------------------------------------------------------------ */

/** Backoff ladder in ms, then held at the last step. Jittered per attempt. */
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000]

export interface RealtimeConnection {
  state: RealtimeConnectionState
  /** `true` while events are flowing. */
  online: boolean
  /** `true` once the channel is down — the banner condition. */
  offline: boolean
  /** Failed attempts since the last successful connect. */
  attempt: number
  /** Whole seconds until the next automatic attempt, `null` when not waiting. */
  retryInSeconds: number | null
  /** Retry now instead of waiting out the backoff. */
  reconnect: () => void
}

interface DriverSnapshot {
  state: RealtimeConnectionState
  attempt: number
  /** Epoch ms of the next scheduled attempt, `null` when none is pending. */
  nextRetryAt: number | null
}

/**
 * One reconnect loop for the whole app, reference-counted by its subscribers, so
 * mounting the banner and a debug panel does not double the retry rate.
 */
const driver = (() => {
  const listeners = new Set<() => void>()
  let snapshot: DriverSnapshot = { state: realtime.getState(), attempt: 0, nextRetryAt: null }
  let subscribers = 0
  let unsubscribeState: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function emit(next: Partial<DriverSnapshot>): void {
    snapshot = { ...snapshot, ...next }
    for (const listener of listeners) listener()
  }

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function schedule(): void {
    clearTimer()
    const step = BACKOFF_MS[Math.min(snapshot.attempt, BACKOFF_MS.length - 1)]
    // ±20 % jitter, so a room full of PCs does not retry in lockstep.
    const delay = Math.round(step * (0.8 + Math.random() * 0.4))
    emit({ nextRetryAt: Date.now() + delay })
    timer = setTimeout(() => {
      timer = null
      emit({ attempt: snapshot.attempt + 1, nextRetryAt: null })
      realtime.connect()
    }, delay)
  }

  function onState(state: RealtimeConnectionState): void {
    if (state === 'open') {
      clearTimer()
      emit({ state, attempt: 0, nextRetryAt: null })
      return
    }
    if (state === 'offline') {
      emit({ state })
      if (subscribers > 0) schedule()
      return
    }
    emit({ state, nextRetryAt: null })
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      subscribers += 1
      if (subscribers === 1) {
        unsubscribeState = realtime.subscribeState(onState)
        // A fresh mount opens the channel; already open is a no-op.
        if (realtime.getState() !== 'open') realtime.connect()
      }
      return () => {
        listeners.delete(listener)
        subscribers -= 1
        if (subscribers === 0) {
          unsubscribeState?.()
          unsubscribeState = null
          clearTimer()
          emit({ nextRetryAt: null })
        }
      }
    },
    getSnapshot(): DriverSnapshot {
      return snapshot
    },
    /** Manual retry: skips the remaining wait, keeps the attempt counter honest. */
    retryNow(): void {
      clearTimer()
      emit({ attempt: snapshot.attempt + 1, nextRetryAt: null })
      realtime.connect()
    },
  }
})()

/** Server snapshot: SSR always renders the neutral "connecting" state. */
const SERVER_SNAPSHOT: DriverSnapshot = { state: 'connecting', attempt: 0, nextRetryAt: null }

export function useRealtimeConnection(): RealtimeConnection {
  const snapshot = useSyncExternalStore(
    driver.subscribe,
    driver.getSnapshot,
    () => SERVER_SNAPSHOT,
  )

  // Local 1 s tick only while a retry is pending, so the banner can count down
  // without re-rendering the app the rest of the time.
  const [, setNow] = useState(0)
  useEffect(() => {
    if (snapshot.nextRetryAt === null) return
    const id = setInterval(() => setNow((n) => n + 1), 1_000)
    return () => clearInterval(id)
  }, [snapshot.nextRetryAt])

  const reconnect = useCallback(() => driver.retryNow(), [])

  const retryInSeconds =
    snapshot.nextRetryAt === null
      ? null
      : Math.max(0, Math.ceil((snapshot.nextRetryAt - Date.now()) / 1_000))

  return {
    state: snapshot.state,
    online: snapshot.state === 'open',
    offline: snapshot.state === 'offline',
    attempt: snapshot.attempt,
    retryInSeconds,
    reconnect,
  }
}
