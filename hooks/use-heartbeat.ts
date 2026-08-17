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
 *
 * An outage needs no machinery of its own (C2.16). The reading is a function of
 * the anchor rather than a sum of ticks, so it keeps growing while the link is
 * down and one report states the whole outage when the link is back — see
 * `reportOnce()` for the silence and `reportNow()` for the catch-up.
 */

import { useCallback, useRef } from 'react'
import { ApiError, heartbeat, isTransportOffline } from '@/lib/mock/api'
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
 * Whether a report is on the wire, module-wide (C2.16).
 *
 * It was a ref inside the hook while the tick was the only caller. The catch-up
 * report on reconnect is a second caller, and it has to share *this* latch, not
 * own a parallel one: the reconnect edge and a tick can land in the same instant,
 * and two reports in flight together is precisely the race the latch exists to
 * stop — the older answer arriving last and re-anchoring the client to a reading
 * the newer one already passed. A module scalar is right because there is one
 * station and one clock; a second `<SessionManager>` would be the bug, not a case
 * to support.
 */
let inFlight = false

/**
 * Send the current reading, if there is one to send.
 *
 * Silent while the link is down, and that is the whole of the offline story
 * (C2.16). Nothing is queued, because there is nothing to queue: the reading is a
 * *function of the anchor*, not a sum of ticks, so ten offline minutes are still
 * sitting in `unreportedSeconds()` when the link returns and one report states
 * them all. A queue of per-tick deltas would be sixty ways to double-bill the
 * same span.
 *
 * Asking beforehand rather than letting the request fail keeps the dev log
 * honest: a refusal line every ten seconds through a long outage would bury the
 * failures that actually mean something.
 */
async function reportOnce(): Promise<void> {
  if (inFlight || isTransportOffline()) return

  // Read through `getState()` rather than a subscription: this runs from a timer,
  // not from a render, and subscribing would re-run the effect that owns the
  // interval every second.
  const report = sessionReport(useStore.getState())
  if (!report) return

  inFlight = true
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
    inFlight = false
  }
}

/**
 * The catch-up report the reconnect edge sends, before anything else asks the
 * server what is true (C2.16).
 *
 * The order is the point, and it is a money argument rather than a tidiness one.
 * The resync's other half refetches the session and adopts it through
 * `applySnapshot()`, which rotates the anchor to the server's belief — and the
 * server's belief still ends at the last reading it heard, ten minutes ago. Adopt
 * first and the whole outage is erased from the row *and* handed back to the
 * player as free time on the countdown. Report first and the snapshot that lands
 * a moment later already contains the outage.
 *
 * Deliberately not awaited by the toast: "Connection restored" is about the link,
 * which is demonstrably back, and it must not wait on a request that may lose the
 * race. A failure here is logged like any other refused report, and the next tick
 * — a few seconds away — states the same reading again, because the reading is
 * idempotent (C2.14) and never stopped accumulating.
 */
export function reportNow(): Promise<void> {
  return reportOnce()
}

/**
 * Returns the tick handler the one interval calls. Stable, so the effect that
 * owns the interval is not torn down and rebuilt by this hook.
 */
export function useHeartbeat(): () => void {
  const ticks = useRef(0)

  return useCallback(() => {
    ticks.current += 1
    if (ticks.current < HEARTBEAT_TICKS) return
    // Reset before the attempt, not after it: a report that is refused — or one
    // there was nothing to send for — must not make the next attempt wait for a
    // second window.
    ticks.current = 0
    void reportOnce()
  }, [])
}
