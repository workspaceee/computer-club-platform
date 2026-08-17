'use client'

/**
 * Stage 2 of the two-stage account of time: the periodic reading (C2.15).
 *
 * Stage 1 — the clock on the screen — has been correct for a while: it is derived
 * from the anchors and survives sleep, throttling and a wrong system clock. What
 * was missing is the other half: **the club being told**. `heartbeat` had exactly
 * one caller in the product ("Lock PC", `lib/seat.ts`), so a visit that ran for
 * three hours and was never locked left the row believing nothing had been
 * played. This hook is the thing that makes `secondsUsed` grow on its own.
 *
 * Three decisions, each of which is the reason this is a hook and not four lines
 * inside the interval:
 *
 *  - **No second interval exists** (F6.3). The product has one, in
 *    `components/session-manager.tsx`, and the report rides its every tenth tick.
 *    A `setInterval(…, 10_000)` of its own would be a second clock to keep in
 *    step with the first, would keep a background station waking up for nothing,
 *    and would be able to fire while the derived clock was stale.
 *  - **The reading has exactly one source.** `sessionReport()` (built on
 *    `unreportedSeconds()`) answers "how much has the club not heard about", and
 *    nothing here recomputes it. `null` from it means *stay quiet* — no anchor
 *    yet, a paused clock, or nothing burned since the last snapshot — which is
 *    also what keeps a station standing idle all night from hammering the
 *    endpoint once every ten seconds.
 *  - **The answer comes back through `applySnapshot()`,** the single door for
 *    server truth. That is what makes the acceptance invisible: adopting a fresh
 *    deadline is a re-read of the same instant with the skew corrected, so the
 *    digits the guest is looking at do not jump (§7 of `OFFLINE-TIME.md`).
 *
 * A refused report is **logged, not swallowed and not announced**. Under-reporting
 * is the safe direction (§6: the club has not billed time it did not hear about,
 * whereas over-reporting charges a player for minutes they never played), and the
 * next tick states the same reading again — the report is idempotent (C2.14), so
 * a lost answer costs nothing. Telling the guest their kiosk failed to invoice
 * them would be alarming and unactionable, so there is no toast; the failure goes
 * to the dev log, which is what `.catch(() => {})` refused to give anybody.
 */

import { useCallback, useRef } from 'react'
import { ApiError, heartbeat } from '@/lib/mock/api'
import { sessionReport, useStore } from '@/lib/store'

/**
 * Ticks of the app's one-second clock between reports — ten, i.e. ~10 s.
 *
 * "~" is honest and deliberate: the interval is re-synced, throttled and
 * suspended along with the station, so ten ticks is ten seconds of *foreground*
 * time and can be much longer in wall-clock. It does not matter, because the
 * report is a reading rather than a delta: a late one states the same total and
 * the server takes the `max`.
 */
export const HEARTBEAT_TICKS = 10

/**
 * Send the current reading, if there is one to send.
 *
 * `inFlight` is not about load — it is about ordering. A request that outlived a
 * tick would otherwise be racing its own successor, and the older answer could
 * land last and re-anchor the client to a reading the newer one already passed.
 */
async function reportOnce(inFlight: { current: boolean }): Promise<void> {
  if (inFlight.current) return

  // Read through `getState()` rather than a subscription: this runs from a timer,
  // not from a render, and subscribing would re-run the effect that owns the
  // interval every second.
  const report = sessionReport(useStore.getState())
  if (!report) return

  inFlight.current = true
  try {
    // The one door for server truth. The response also carries the rotated
    // anchor, without which the next reading would measure from a spent epoch
    // and stop growing (C2.14).
    useStore.getState().applySnapshot(await heartbeat(report))
  } catch (error) {
    console.log(
      '[v0] heartbeat refused:',
      error instanceof ApiError ? error.code : error,
      report,
    )
  } finally {
    inFlight.current = false
  }
}

/**
 * Returns the tick handler the one interval calls. Stable, so the effect that
 * owns the interval is not torn down and rebuilt by this hook.
 */
export function useHeartbeat(): () => void {
  const ticks = useRef(0)
  const inFlight = useRef(false)

  return useCallback(() => {
    ticks.current += 1
    if (ticks.current < HEARTBEAT_TICKS) return
    // Reset before the attempt, not after it: a report that is refused — or one
    // there was nothing to send for — must not make the next attempt wait for a
    // second window.
    ticks.current = 0
    void reportOnce(inFlight)
  }, [])
}
