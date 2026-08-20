'use client'

/**
 * Adding minutes to the running visit — the one door (C3.3).
 *
 * Until the home card existed there was a single place to extend from, so the
 * whole act lived in the footer of "My session": pick a step, call the endpoint,
 * adopt the snapshot, say what happened. The moment a second surface could grant
 * time, keeping it there would have meant two copies of the one sequence in the
 * product that moves a **deadline** — and the copies would have drifted in the
 * places that cost a player minutes: which steps are offered, whether an offline
 * club is allowed to be asked, and how the granted time reaches the clock.
 *
 * So it moved here, and the panel became one of its callers (the same split
 * `useGameLaunch` made for C3.2).
 *
 * What the hook owns:
 *
 *   **Which steps are honest.** `minutesBanked` comes from the server with the
 *   session payload, and every step is filtered against it, so nothing on screen
 *   can fail for lack of minutes. A step the wallet cannot cover is not disabled,
 *   it is absent — and when none are left the caller is handed `buyTime()`
 *   instead, because sending a player to the shop beats an `insufficientFunds`
 *   they could not have predicted.
 *
 *   **The single write path.** The endpoint answers with a snapshot and it goes
 *   in through `applySnapshot()` — the same door the heartbeat and `time.added`
 *   use (F6.3). There is no counter to patch, so a grant cannot be applied twice
 *   or lost, and the number on screen is the club's rather than ours.
 *
 *   **The refusal.** Extending needs the club to acknowledge it, so it is gated
 *   on `useSalesGate()` — closed, or past the reconnect grace period, and the
 *   request is not attempted (C2.12). The guard is repeated *inside* `extend()`
 *   as well as read by the caller for the disabled state, because a click that
 *   beats the re-render would otherwise sail straight through.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useSalesGate, type SalesGate } from '@/hooks/use-sales-gate'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { extendSession, toApiError, type SessionDetail } from '@/lib/mock/api'
import { useStore } from '@/lib/store'

/**
 * Minute steps on offer.
 *
 * Fixed rather than free entry: the club sells time in blocks, and a text field
 * would let a player ask for 7 minutes and be refused by a validation message
 * that explains nothing.
 */
export const EXTEND_STEPS = [15, 30, 60] as const

export interface ExtendController {
  /** The steps the banked minutes actually cover, smallest first. */
  steps: number[]
  /** Grant `minutes` to the running visit. No-op while one is in flight. */
  extend: (minutes: number) => Promise<void>
  /** The step being granted right now, for its own spinner. `null` when idle. */
  extending: number | null
  /** `true` while any grant is in flight — every other step goes inert. */
  busy: boolean
  /** Minutes the player could extend from, as the server reported them. */
  minutesBanked: number
  /** A walk-in's clock counts up into the tab: there is nothing to extend *to*. */
  postpaid: boolean
  /** Whether the club can be asked at all, and why not (C2.12). */
  sales: SalesGate
  /** Out of banked minutes — the honest button is the shop. */
  buyTime: () => void
}

/**
 * @param detail the session payload both callers already hold. Optional because
 *   the home card renders its clock before the fetch lands, and the actions
 *   simply have nothing to offer until it does.
 * @param onGranted called after a successful grant so the caller can refresh the
 *   payload it owns (the banked total and the grant history both just changed).
 */
export function useExtendTime(
  detail: SessionDetail | null | undefined,
  onGranted?: () => void,
): ExtendController {
  const { t } = useT()

  const toast = useStore((s) => s.toast)
  const applySnapshot = useStore((s) => s.applySnapshot)
  const setView = useStore((s) => s.setView)
  const setSessionPanelOpen = useStore((s) => s.setSessionPanelOpen)

  const sales = useSalesGate()

  const [extending, setExtending] = useState<number | null>(null)
  // A ref beside the state, because the state is what draws the spinner and the
  // ref is what stops the second click: a double click arrives before React has
  // re-rendered, so the closure would still see `null` and grant twice.
  const inFlight = useRef(false)

  const minutesBanked = detail?.minutesBanked ?? 0
  const postpaid = detail?.snapshot.billingMode === 'postpaid'

  const steps = useMemo(
    () => EXTEND_STEPS.filter((minutes) => minutes <= minutesBanked),
    [minutesBanked],
  )

  const extend = useCallback(
    async (minutes: number) => {
      if (inFlight.current || !sales.canSpend) return
      inFlight.current = true
      setExtending(minutes)
      try {
        // The response is a snapshot, so the deadline moves through the clock's
        // one write path — there is no counter here to get wrong.
        applySnapshot(await extendSession(minutes))
        onGranted?.()
        toast('success', t('session.extendedToast', { n: minutes }))
      } catch (error) {
        // The API answers with a code; the sentence is ours (F2.2).
        toast('error', t(`errors.${toApiError(error).code}` as TKey))
      } finally {
        inFlight.current = false
        setExtending(null)
      }
    },
    [applySnapshot, onGranted, sales.canSpend, t, toast],
  )

  const buyTime = useCallback(() => {
    // Closes the panel when the call came from inside it; on the home card the
    // panel is already shut and `false → false` is not a state change.
    setSessionPanelOpen(false)
    setView('shop')
  }, [setSessionPanelOpen, setView])

  return {
    steps,
    extend,
    extending,
    busy: extending !== null,
    minutesBanked,
    postpaid,
    sales,
    buyTime,
  }
}
