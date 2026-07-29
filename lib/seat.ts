/**
 * The seat, as a thing that can be taken and given back (C1.7).
 *
 * The lock screen already *asks* who is sitting here before it lets anybody past
 * the card (`fetchStationHolder`). This module is the other half of that
 * question: the three writes that make the answer true — claim the chair on the
 * way in, hold it while the visit is paused, hand it back on the way out.
 *
 * Why it is a module and not four calls sprinkled through the components:
 *
 *  - **The read alone proves nothing.** Before these writes existed, the holder
 *    endpoint could only ever report a fixture or something an admin did in the
 *    dev bus. A player could sign in on an "occupied" seat and the club would
 *    never learn about it, and "the chair was freed, let the next player in" was
 *    unreachable from the product itself.
 *  - **Failure has a safe direction, and it is not the obvious one.** A claim
 *    that fails must refuse (two visits on one keyboard is the bug the whole
 *    story exists to prevent), while a *release* that fails must be swallowed:
 *    the seat stays held, the next arrival is sent to the counter, and an admin
 *    with a key fixes in five seconds what a stuck "signing out…" spinner could
 *    not fix at all. Both rules are written once, here, instead of being
 *    re-decided at every exit.
 *  - **The store must not know about the network.** `lib/store` imports no API
 *    (F6.1): slices are pure transitions, and a `logout` that awaited an
 *    endpoint would make every teardown path async and every caller a place
 *    where a failed request could strand identity. So the pairing lives at the
 *    call site, and the call site gets these three functions.
 */
import {
  ApiError,
  endSession,
  fetchStationHolder,
  heartbeat,
  openSession,
  pauseSession as pauseSessionOnServer,
  type StationHolder,
} from '@/lib/mock/api'
import type { ID } from '@/lib/types/common'
import type { SessionSnapshot } from '@/lib/types/session'

/**
 * Who just authenticated at the keyboard. Exactly one field is set — a member
 * has an account, a walk-in has only the label the check-in handed them — and
 * `openSession` enforces that rather than trusting it.
 */
export interface Arrival {
  userId: ID | null
  guestId: ID | null
}

/**
 * The answer to "may I sit down".
 *
 * `granted: false` carries the occupant so the screen can name them;
 * `holder: null` means the seat is refused *and* the re-read of who holds it
 * also failed, which is the one case with nothing human to say.
 *
 * `granted: true` carries the **row that was claimed**, and that is not a
 * courtesy either (C1.10). `openSession` either opens a visit or *adopts* the
 * paused one already on this seat, and only it knows which — so the snapshot is
 * the one number that says how much time the arrival is actually walking into.
 * The client store cannot answer that: it banked its own remainder before the
 * pause and, on a reloaded or reset station, banks a full two hours nobody
 * bought. `snapshot: null` is the honest gap — a claim granted because the
 * request *failed* (see below) has no row to report, and the caller falls back
 * to whatever the store already believes rather than to a fabricated clock.
 */
export type SeatClaim =
  | { granted: true; snapshot: SessionSnapshot | null }
  | { granted: false; holder: StationHolder | null }

/**
 * Claim the chair for an arrival that already passed the lock screen's check.
 *
 * The screen's own read is a courtesy; this is the rule. Two arrivals racing the
 * same seat both read `null` from the holder endpoint before either of them
 * wrote anything, so the refusal has to come from the write — and when it does,
 * the seat is re-read so the loser is told *who* won rather than "conflict".
 *
 * A member visit is prepaid and a walk-in is postpaid (MVP §3.2): the clock runs
 * in opposite directions, and which one this is follows from the identity, not
 * from anything the screen picks.
 *
 * Anything that is not a `conflict` — a dropped request, a timeout — grants the
 * seat. That looks generous and is the same judgement the read makes: a failed
 * request is not evidence of a hold, and refusing on it would lock a paying
 * member out of a chair nobody is in because one call dropped.
 */
export async function claimSeat(arrival: Arrival): Promise<SeatClaim> {
  try {
    const snapshot = await openSession({
      userId: arrival.userId,
      guestId: arrival.guestId,
      billingMode: arrival.userId ? 'prepaid' : 'postpaid',
    })
    return { granted: true, snapshot }
  } catch (err) {
    if (err instanceof ApiError && err.code === 'conflict') {
      return { granted: false, holder: await fetchStationHolder().catch(() => null) }
    }
    // Granted without a row: there is nothing to adopt the clock from, so the
    // caller keeps the one it has instead of inventing one.
    return { granted: true, snapshot: null }
  }
}

/**
 * "Lock PC" — the visit stays on the seat, the clock stops.
 *
 * This is what makes a paused hold visible to the *next* person: the holder
 * endpoint reports `paused`, and the panel prints it, because a paused visit is
 * exactly the case where the machine looks free and is not.
 *
 * `usedSeconds` is the visit's spent time as the shell has been counting it, and
 * it is reported **before** the pause because the paused screen of C1.10 states
 * the remainder as a fact of the club ("42:17 left"): a row that was opened two
 * hours ago and never heard from again still believes nothing was used, so
 * without this the lock screen would promise back every minute the player had
 * already played. It goes through the heartbeat rather than a "set the clock"
 * call on purpose — the client reports *elapsed* and the server does the
 * accounting (F3.7), which is the same contract the 10 s heartbeat of `C2` will
 * use once it runs; this is the one report in its place until then.
 */
export async function holdSeat(usedSeconds = 0): Promise<void> {
  if (usedSeconds > 0) await heartbeat(usedSeconds).catch(() => {})
  await pauseSessionOnServer().catch(() => {})
}

/**
 * Hand the seat back: sign-out, "end guest session", and the acknowledged expiry
 * all end the same visit, so they all come through here.
 *
 * Errors are swallowed on purpose (see the header): the player is already on
 * their way to the door, there is nothing for them to retry, and a seat that
 * stays held is the harmless direction to fail in.
 */
export async function releaseSeat(): Promise<void> {
  await endSession().catch(() => {})
}
