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
