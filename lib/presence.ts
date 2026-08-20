/**
 * How often a read about **the floor right now** is re-asked.
 *
 * Seats fill and empty when *other* people sit down, and those events are scoped
 * to their own stations — no push reaches this client for them
 * (`matchesScope`, `EVENT_INVALIDATES`). So every surface that reports the room
 * rather than the account has to poll, and they all have to poll at the same
 * cadence: "3 friends in the club" on the home screen (C3.7) and "2 people in
 * this game" on a library tile (C4.4) are two readings of the same seated
 * players, and two intervals would let the two cards disagree about the same
 * evening while both looked live.
 *
 * 30 s is the club's occupancy cadence — the one the attract screen already reads
 * free seats with. Slow enough that a shelf of sixty tiles is one request, fast
 * enough that a player who just watched a friend sit down sees it.
 */
export const FLOOR_REFRESH_MS = 30_000
