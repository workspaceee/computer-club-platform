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
  openSession,
  pauseSession as pauseSessionOnServer,
  type StationHolder,
} from '@/lib/mock/api'
import type { ID } from '@/lib/types/common'

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
 * The answer to "may I sit down". `granted: false` carries the occupant so the
 * screen can name them; `holder: null` means the seat is refused *and* the
 * re-read of who holds it also failed, which is the one case with nothing
 * human to say.
 */
export type SeatClaim = { granted: true } | { granted: false; holder: StationHolder | null }

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
    await openSession({
      userId: arrival.userId,
      guestId: arrival.guestId,
      billingMode: arrival.userId ? 'prepaid' : 'postpaid',
    })
    return { granted: true }
  } catch (err) {
    if (err instanceof ApiError && err.code === 'conflict') {
      return { granted: false, holder: await fetchStationHolder().catch(() => null) }
    }
    return { granted: true }
  }
}

/**
 * "Lock PC" — the visit stays on the seat, the clock stops.
 *
 * This is what makes a paused hold visible to the *next* person: the holder
 * endpoint reports `paused`, and the panel prints it, because a paused visit is
 * exactly the case where the machine looks free and is not.
 */
export async function holdSeat(): Promise<void> {
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
