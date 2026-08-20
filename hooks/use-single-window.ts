'use client'

/**
 * One launcher per PC (C1.12, second half).
 *
 * "One PC = one session" is enforced by the club for *machines* — the account's
 * live row is checked against the seat on every claim — but two launcher windows
 * on the same keyboard are one machine as far as the server can tell: same
 * `machineId`, same session, two clocks counting it down, two heartbeats
 * reporting elapsed time, two "end session" buttons. Nothing in the API can spot
 * that, because from its side both windows *are* the station. So the rule has to
 * be kept where the duplicate exists: in the browser.
 *
 * The lock is held for as long as the window lives, and the second window does
 * not poll for it — it **queues** for it. That is the whole reason this is built
 * on the Web Locks API rather than a timestamp in `localStorage`: a queued
 * request is granted the moment the holder goes away, which is what makes the
 * takeover automatic and instant. A player who closes the stray window sees the
 * real one come alive by itself, with no button to press and nothing to reload.
 *
 * The fallback is a `BroadcastChannel` handshake, for a browser with no lock
 * manager (Safari before 15.4). Same three facts, less precision: ask who is
 * here, believe an answer, and re-ask when the holder says it is leaving.
 *
 * `false` on the first render, always. Whether a second window exists is a
 * question only the browser can answer and only asynchronously, so the honest
 * initial state is "this is the window" — a screen that blinked the block panel
 * on every boot would be worse than one that arrives a frame late. And it stays
 * `false` where neither mechanism exists: a station left running is worth more
 * than a guard nobody can implement there.
 */

import { useEffect, useState } from 'react'

/** One name for both mechanisms, so a mixed-engine club still agrees with itself. */
const LOCK_NAME = 'imba-launcher-window'

/**
 * How long a fresh window waits to be granted the lock before it calls itself a
 * duplicate.
 *
 * An uncontested lock is granted in the same task, so this is not a timeout on
 * anything slow — it is the gap between "not granted yet" and "not granted",
 * which the API does not otherwise distinguish once the request is queued.
 */
const GRANT_GRACE_MS = 200

/** Same question for the fallback: how long an answer to a probe may take. */
const ANSWER_GRACE_MS = 300

/**
 * How often a blocked window re-asks, in the fallback only.
 *
 * A holder that crashes never says it is leaving, and a lock manager would have
 * released its lock for it. The channel has no such guarantee, so the duplicate
 * keeps asking — slowly, because the answer changes at most once.
 */
const REPROBE_GAP_MS = 2_000

type Probe = 'probe' | 'here' | 'leaving'

export function useSingleWindow(): boolean {
  const [duplicate, setDuplicate] = useState(false)

  useEffect(() => {
    let alive = true

    const locks = (navigator as Navigator & { locks?: LockManager }).locks
    if (locks) {
      /** Resolving this releases the lock — the only way out of the callback. */
      let release: (() => void) | undefined
      // Unmount has to cancel a request that is still queued, or a lock granted
      // to a dead effect would be held by a callback nobody can resolve.
      const abort = new AbortController()

      const timer = setTimeout(() => {
        // Still queued: somebody else is the launcher on this PC.
        if (alive) setDuplicate(true)
      }, GRANT_GRACE_MS)

      void locks
        .request(LOCK_NAME, { signal: abort.signal }, () => {
          clearTimeout(timer)
          // Granted, possibly seconds after the first window closed — which is
          // the takeover, and it needs no other machinery than this line.
          if (alive) setDuplicate(false)
          return new Promise<void>((resolve) => {
            release = resolve
            // A request granted after the effect was torn down has nothing to
            // hold the lock for.
            if (!alive) resolve()
          })
        })
        // An aborted request rejects. That is the expected exit, not a fault.
        .catch(() => {})

      return () => {
        alive = false
        clearTimeout(timer)
        abort.abort()
        release?.()
      }
    }

    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(LOCK_NAME)
    /** Are we the launcher of this PC? Answers other windows' probes. */
    let primary = false
    /** Did anybody answer the probe currently in flight? */
    let answered = false
    let graceTimer: ReturnType<typeof setTimeout> | undefined

    const probe = () => {
      answered = false
      channel.postMessage('probe' satisfies Probe)
      graceTimer = setTimeout(() => {
        if (!alive || answered) return
        // Silence means the PC is ours. Claimed only after the grace period, so
        // two windows opened in the same second cannot both claim it.
        primary = true
        setDuplicate(false)
      }, ANSWER_GRACE_MS)
    }

    channel.onmessage = (event: MessageEvent<Probe>) => {
      if (!alive) return
      if (event.data === 'probe') {
        // Only the holder answers. A duplicate answering would convince the
        // other duplicate that the launcher is alive in the wrong window.
        if (primary) channel.postMessage('here' satisfies Probe)
        return
      }
      if (event.data === 'here') {
        answered = true
        if (!primary) setDuplicate(true)
        return
      }
      // The holder is closing: its lock is gone, so ask again immediately rather
      // than waiting out the re-probe beat.
      if (event.data === 'leaving' && !primary) probe()
    }

    // `pagehide` and not `beforeunload`: the latter is unreliable on mobile and
    // blocks the back/forward cache where it does fire.
    const leaving = () => {
      if (primary) channel.postMessage('leaving' satisfies Probe)
    }
    window.addEventListener('pagehide', leaving)

    probe()
    const interval = setInterval(() => {
      if (!primary) probe()
    }, REPROBE_GAP_MS)

    return () => {
      alive = false
      clearTimeout(graceTimer)
      clearInterval(interval)
      window.removeEventListener('pagehide', leaving)
      leaving()
      channel.close()
    }
  }, [])

  return duplicate
}
