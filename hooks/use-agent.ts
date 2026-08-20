'use client'

/**
 * `agentAvailable` — the one flag every hardware-facing surface reads (F5.4).
 *
 * The rule this hook exists to enforce: a seat without a station agent must
 * render an honest "Unavailable on this PC" state, never a fake success. So the
 * handshake result is a first-class, fully-typed UI state with three values —
 * `checking`, `ready`, `unavailable` — and capabilities always come back as a
 * real object (`NO_AGENT_CAPABILITIES` when there is no agent), so a tile can be
 * rendered before the handshake finishes without any `undefined` guards.
 *
 * Consumers never call `mockAgent` directly for the handshake:
 *
 *   const { status, capabilities, supports, recheck } = useAgent()
 *   supports('nvidia-control-panel')  // false on a PS5 seat AND on a dead agent
 *
 * Stage 5 swaps the bridge implementation below for the real transport; this
 * hook, and therefore every screen, stays as-is.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  NO_AGENT_CAPABILITIES,
  type AgentCapabilities,
  type AgentInfo,
  type NativePanelTarget,
  toAgentError,
} from '@/lib/agent/bridge'
import { mockAgent } from '@/lib/agent/mock-agent'
import type { ID } from '@/lib/types/common'
import type { MachineTelemetry } from '@/lib/types/machine'

/** The bridge in use. Stage 5 points this at the real agent transport. */
const agent = mockAgent

export type AgentStatus =
  /** Handshake in flight — show a skeleton, never an error and never a success. */
  | 'checking'
  /** A real agent answered; `capabilities` describes what it can do. */
  | 'ready'
  /** No agent on this seat — the F5.4 state. */
  | 'unavailable'

export interface AgentState {
  status: AgentStatus
  /** Convenience mirror of `status === 'ready'`. */
  available: boolean
  /** `null` until the handshake succeeds. */
  info: AgentInfo | null
  /** Never `null`: `NO_AGENT_CAPABILITIES` while checking or unavailable. */
  capabilities: AgentCapabilities
  /** `true` when this seat can actually open that panel right now. */
  supports: (target: NativePanelTarget) => boolean
  /** Re-runs the handshake — wired to the "Check again" button. */
  recheck: () => void
  /** A user-triggered recheck is running, for the button spinner. */
  rechecking: boolean
}

export function useAgent(): AgentState {
  const [status, setStatus] = useState<AgentStatus>('checking')
  const [info, setInfo] = useState<AgentInfo | null>(null)
  const [rechecking, setRechecking] = useState(false)
  // Guards against a late handshake writing state into an unmounted screen.
  const alive = useRef(true)

  const handshake = useCallback(async () => {
    try {
      const next = await agent.getInfo()
      if (!alive.current) return
      setInfo(next)
      setStatus('ready')
    } catch (error) {
      if (!alive.current) return
      // Any failure is treated as "no agent": from the player's point of view a
      // crashed agent and a missing one are the same seat.
      console.log('[v0] agent handshake failed:', toAgentError(error).code)
      setInfo(null)
      setStatus('unavailable')
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void handshake()
    return () => {
      alive.current = false
    }
  }, [handshake])

  const recheck = useCallback(() => {
    setRechecking(true)
    setStatus('checking')
    void handshake().finally(() => {
      if (alive.current) setRechecking(false)
    })
  }, [handshake])

  const capabilities = info?.capabilities ?? NO_AGENT_CAPABILITIES

  const supports = useCallback(
    (target: NativePanelTarget) =>
      status === 'ready' && capabilities.nativePanels.includes(target),
    [status, capabilities],
  )

  return {
    status,
    available: status === 'ready',
    info,
    capabilities,
    supports,
    recheck,
    rechecking,
  }
}

/* ------------------------------------------------------------------ *
 * Installed titles
 * ------------------------------------------------------------------ */

export interface InstalledGamesState {
  /** Ids the disk can start right now. Empty while checking or without an agent. */
  ids: Set<ID>
  /**
   * `true` only when a real agent answered with a list. The one gate the
   * "Installed on this PC" filter is allowed to read: without it the library
   * must not offer the filter at all rather than offer it and match nothing
   * (F5.4).
   */
  known: boolean
}

/**
 * What this seat can start, as a set of catalogue ids (C4.2).
 *
 * The only filter in the library that is *not* a query param, and deliberately
 * so: the club server knows what it sells, the agent knows what is on this disk,
 * and `GET /api/games` cannot answer for a machine it has never seen. So the set
 * comes from the seat and the grid narrows the page it already has.
 *
 * `needsUpdate` counts as not installed. A title mid-patch is one the player
 * cannot start, and "Installed on this PC" that lists it would be a filter whose
 * results fail at the launch dialog — the same rule `launchGame` enforces when it
 * throws `gameNotInstalled`.
 */
export function useInstalledGames(): InstalledGamesState {
  const { status } = useAgent()
  const [state, setState] = useState<InstalledGamesState>({ ids: new Set(), known: false })

  useEffect(() => {
    if (status !== 'ready') {
      setState({ ids: new Set(), known: false })
      return
    }

    let alive = true
    void (async () => {
      try {
        const games = await agent.getInstalledGames()
        if (!alive) return
        setState({
          ids: new Set(games.filter((g) => g.installed && !g.needsUpdate).map((g) => g.gameId)),
          known: true,
        })
      } catch (error) {
        if (!alive) return
        console.log('[v0] installed games read failed:', toAgentError(error).code)
        setState({ ids: new Set(), known: false })
      }
    })()

    return () => {
      alive = false
    }
  }, [status])

  return state
}

/* ------------------------------------------------------------------ *
 * Telemetry
 * ------------------------------------------------------------------ */

/** Default cadence. Fast enough to look alive, slow enough not to heat the CPU. */
const TELEMETRY_INTERVAL_MS = 2500

export interface TelemetryState {
  /** `null` until the first reading lands, and after the agent goes away. */
  telemetry: MachineTelemetry | null
  /** `true` while the seat is reporting — the honest gate for every reading. */
  live: boolean
}

export interface TelemetryOptions {
  /** Poll only while the surface that reads it is on screen. Default `true`. */
  enabled?: boolean
  intervalMs?: number
}

/**
 * Live hardware readings from the seat (F5.1, first used by C1.6).
 *
 * The bridge contract says the *caller* owns the interval so there is exactly
 * one, which is precisely why this is a hook and not five components each
 * calling `getTelemetry()`. Rules it enforces:
 *
 *  - Nothing is polled unless the handshake said `ready` **and** the seat
 *    reports `telemetry` as a capability. A console seat without it never gets a
 *    request, so `live` is `false` and the UI renders "unavailable" rather than
 *    a plausible ping (F5.4).
 *  - A failed read drops the reading instead of freezing the last one on screen.
 *    A stale 4 ms next to a dead link is a lie with a number on it.
 *  - Polling stops while the tab is hidden: an idle kiosk should not keep a
 *    2.5 s timer alive for a HUD nobody is looking at, and the reading is
 *    refreshed the moment it comes back.
 */
export function useAgentTelemetry({
  enabled = true,
  intervalMs = TELEMETRY_INTERVAL_MS,
}: TelemetryOptions = {}): TelemetryState {
  const { status, capabilities } = useAgent()
  const [telemetry, setTelemetry] = useState<MachineTelemetry | null>(null)

  const canPoll = enabled && status === 'ready' && capabilities.telemetry

  useEffect(() => {
    if (!canPoll) {
      setTelemetry(null)
      return
    }

    let alive = true

    const tick = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const next = await agent.getTelemetry()
        if (alive) setTelemetry(next)
      } catch (error) {
        if (!alive) return
        console.log('[v0] telemetry read failed:', toAgentError(error).code)
        setTelemetry(null)
      }
    }

    void tick()
    const interval = setInterval(() => void tick(), intervalMs)
    // Coming back to a visible tab must not wait out a whole interval before the
    // strip stops showing whatever it had when the tab was hidden.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [canPoll, intervalMs])

  return { telemetry, live: canPoll && telemetry !== null }
}
