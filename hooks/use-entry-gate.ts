'use client'

/**
 * "Can anybody come in right now?" — asked in one place (C2.13).
 *
 * The mirror of `use-sales-gate.ts`, deliberately not folded into it. Both hooks
 * answer "is this action safe while the link is down", but they guard opposite
 * ends of a visit and their refusals do not translate into one another:
 *
 *   • **Money** can also be refused because the club is *shut* (C2.11) — a fact
 *     with a time attached to it ("opens at 10:00") that the player can act on.
 *   • **The door** has exactly one reason: no link. Closing hours do not lock a
 *     member out of a seat they are already standing at, and a paid visit parked
 *     on this station is resumable at four in the morning.
 *
 * So there is one reason here, on purpose, and it stays a `reason` rather than a
 * bare boolean because the panel that replaces the form has to name it — and
 * because C4.7/C4.8 will add the second half of the same conversation (a game
 * launches offline, a club account cannot be handed over) and will want to say
 * *which* refusal it is looking at.
 *
 * The outage flag is **borrowed, never recomputed**. It comes from
 * `useRealtimeStatus()`, which is the same `offline` the banner renders and is
 * already delayed by `OFFLINE_BANNER_DELAY_MS`. A second timer here would drift
 * out of step with the strip and produce the one combination that reads as a
 * broken build: a dead sign-in form with no banner above it saying why. It also
 * means a 300 ms blink of packet loss never blanks the form mid-typing — the
 * grace period is inside the flag.
 *
 * What it does **not** gate: `support.callStaff`. Reaching a human is the one
 * thing an outage must never take away, and on a lock screen it is the only door
 * left. The panel keeps that button live.
 */

import { useMemo } from 'react'
import { useRealtimeStatus } from '@/components/realtime/realtime-provider'

/** Why the door is closed. `null` when it is not. */
export type EntryBlockReason = 'offline'

export interface EntryGate {
  /**
   * `true` when a visit may be opened. The **only** thing a door needs; the
   * reason below is for choosing the wording.
   */
  canEnter: boolean
  /** The refusal to state, `null` while the door is open. */
  reason: EntryBlockReason | null
  /** The link to the club server is down, past the banner's grace period. */
  offline: boolean
}

export function useEntryGate(): EntryGate {
  const { offline } = useRealtimeStatus()

  return useMemo(
    () => ({ canEnter: !offline, reason: offline ? 'offline' : null, offline }),
    [offline],
  )
}
