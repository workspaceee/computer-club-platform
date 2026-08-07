'use client'

/**
 * "Can this player spend money right now?" — asked in one place (C2.12).
 *
 * Two independent things can stop a sale, and before this hook existed each
 * surface decided for itself which of them it cared about. The shop grid knew
 * about closing hours (C2.11) but not about the link being down; the checkout
 * button knew about neither until it had already posted a card number. That is
 * how the same club ends up with a cart that refuses and an "Extend" that
 * charges, sixty seconds apart, for exactly the same reason.
 *
 * So both reasons are folded into one answer here, and every money button reads
 * *this* rather than re-deriving it:
 *
 *   • **closed** — the club is shut (C2.11). There is nobody to pour the drink
 *     and no counter to collect it.
 *   • **offline** — no link to the club server (C2.12). A payment cannot be
 *     confirmed, so it must not be attempted.
 *
 * Four decisions shape it, and each one is a bug it would otherwise ship with.
 *
 *  1. **The outage flag is *borrowed*, never recomputed.** It comes from
 *     `useRealtimeStatus()`, which is the same `offline` the banner renders — and
 *     it is already delayed by `OFFLINE_BANNER_DELAY_MS`. A second timer here
 *     would drift out of step with the strip, and the player would get the one
 *     combination that reads as a broken build: a Checkout button greyed out with
 *     no banner on screen saying why, or a banner up over buttons that still take
 *     money. One flag, one moment, both surfaces.
 *
 *  2. **A blink of packet loss disables nothing.** That falls out of (1) for
 *     free: the grace period is inside the flag, so a 300 ms hiccup mid-match
 *     never flickers nine buttons off and on.
 *
 *  3. **It gates *spending*, and nothing else.** Browsing is not a purchase: the
 *     catalogue still loads, the cart still opens, quantities still change, the
 *     total still adds up. What stops is the irreversible step. Starting a game
 *     and calling an admin are deliberately not in scope — those are the two
 *     things a stranded player needs *most*, and an outage is the worst possible
 *     moment to take them away.
 *
 *  4. **`reason` is ordered, because two refusals cannot both be the headline.**
 *     A club that is both shut and unreachable is *shut* — that is the fact with
 *     a time attached to it ("opens at 10:00"), and the one the player can act on
 *     by coming back. "No connection" on top of it would be a second sentence
 *     about a shop that was not going to sell anything anyway.
 *
 * Copy lives in the dictionaries, not here: `shop.closed*` for the closed club
 * and `realtime.sales*` for the outage (F2.2). This hook returns *which* refusal
 * applies; the surface picks the sentence that fits the space it has.
 */

import { useMemo } from 'react'
import { useClubHours } from '@/hooks/use-club-hours'
import { useRealtimeStatus } from '@/components/realtime/realtime-provider'

/** Why money is refused. `null` when it is not. */
export type SalesBlockReason = 'closed' | 'offline'

export interface SalesGate {
  /**
   * `true` when a charge may be attempted. The **only** thing a money button
   * needs; everything below is for choosing the wording.
   */
  canSpend: boolean
  /** The refusal to state, most actionable first. `null` while sales are open. */
  reason: SalesBlockReason | null
  /** The club is shut (C2.11). */
  closed: boolean
  /** The link to the club server is down, past the banner's grace period. */
  offline: boolean
  /**
   * `false` until the club's schedule has been read.
   *
   * Sales are **allowed** while it is `false` — see `useClubHours()`, which
   * reports "open" until it knows better for exactly this reason. A gate that
   * defaulted to closed would grey out the shop on every boot for as long as the
   * settings request took, which is a refusal the club never made.
   */
  ready: boolean
}

/**
 * The one hook a money button calls.
 *
 * ```tsx
 * const sales = useSalesGate()
 *
 * <button disabled={!sales.canSpend} onClick={pay}>Pay</button>
 * {sales.reason === 'offline' && <p>{t('realtime.salesHint')}</p>}
 * ```
 *
 * Cheap to call from several components at once: `useClubHours()` shares a single
 * SWR entry and `useRealtimeStatus()` reads the one channel through context, so
 * nothing here opens a stream, starts an interval or fires a request of its own.
 */
export function useSalesGate(): SalesGate {
  const club = useClubHours()
  const { offline } = useRealtimeStatus()

  const closed = club.ready && !club.open

  return useMemo(
    () => ({
      canSpend: !closed && !offline,
      // Closed first: it is the refusal that names a time the player can act on.
      reason: closed ? 'closed' : offline ? 'offline' : null,
      closed,
      offline,
      ready: club.ready,
    }),
    [closed, offline, club.ready],
  )
}
