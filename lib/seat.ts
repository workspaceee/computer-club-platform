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
import type { SessionReport, SessionSnapshot } from '@/lib/types/session'

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
   * Refused for the opposite reason (C1.12): this chair is fine, *you* are
   * already playing on another one.
   *
   * A separate branch and not a `holder` with a different name, because the two
   * refusals have opposite repairs and the screen has to choose between them. A
   * stranger's visit can only be ended by the admin's key, so C1.7 offers a
   * re-check and nothing else; your own visit elsewhere is yours to move, so this
   * one offers a transfer. Collapsing them would put "ask the shift admin for the
   * key" over a session the player owns.
   *
   * `machineLabel` is the seat as the club writes it (`PC #05`) — the one string
   * the player will read out loud, either to walk back to it or to name it at the
   * counter. `sessionId` is what the transfer request is made against, so an
   * approval cannot move some other visit.
   */
  | { granted: false; activeElsewhere: true; machineLabel: string; sessionId: ID }

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
    /**
     * One PC, one session (C1.12). The seat is not re-read here — it is not the
     * seat that refused, and asking who holds *this* chair would answer a
     * question nobody asked. The refusal already named the machine the visit is
     * on, so the panel is built from the error's own payload.
     *
     * A payload that somehow arrived without the seat falls through to the
     * generous branch below rather than opening a panel with a blank machine
     * name: "your session is active on ——" tells the player nothing and takes
     * away the form they could have used.
     */
    if (err instanceof ApiError && err.code === 'activeElsewhere') {
      const label = err.data?.machineLabel
      const sessionId = err.data?.sessionId
      if (typeof label === 'string' && typeof sessionId === 'string') {
        return { granted: false, activeElsewhere: true, machineLabel: label, sessionId }
      }
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
 * `report` is the reading the shell owes the club, and it is sent **before** the
 * pause because the paused screen of C1.10 states the remainder as a fact of the
 * club ("42:17 left"): a row that was opened two hours ago and never heard from
 * again still believes nothing was used, so without this the lock screen would
 * promise back every minute the player had already played. It goes through the
 * heartbeat rather than a "set the clock" call on purpose — the client reports a
 * reading against an epoch and the server does the accounting (F3.7), which is the
 * same contract the 10 s heartbeat of `C2` will use once it runs; this is the one
 * report in its place until then.
 *
 * `null` is the ordinary "nothing to report" case (no anchor yet, or a clock that
 * has not moved since the last snapshot), and it stays silent rather than sending
 * an empty reading.
 */
export async function holdSeat(report: SessionReport | null = null): Promise<void> {
  if (report) await heartbeat(report).catch(() => {})
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
