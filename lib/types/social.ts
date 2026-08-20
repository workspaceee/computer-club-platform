import type { ID, ISODateTime } from './common'
import type { ZoneOccupancy } from './machine'

/**
 * `GET /api/club/playing` — how many people are in each title **in the hall right
 * now** (C4.4).
 *
 * Presence, not catalogue, which is why it is here and not a field on `Game`:
 * `Game.players` is a lifetime count that never changes between two reads, while
 * this answer changes every time somebody sits down, and a library that carried
 * it inside the shelf payload would have to refetch sixty-seven catalogue rows to
 * learn one number. Separate read, separate cadence.
 *
 * Keyed by game id and **sparse**: a title nobody is in is absent rather than
 * `0`, so a card cannot accidentally print a live-looking zero for the sixty
 * titles that are simply idle on a Tuesday afternoon.
 */
export type GamePresence = Record<ID, number>

/** `friendships.status` — a request is directional until it is accepted. */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  userId: ID
  friendId: ID
  status: FriendshipStatus
  createdAt: ISODateTime
}

/** Denormalised friend row for the social list: who they are and where they sit. */
export interface FriendSummary {
  userId: ID
  nickname: string
  level: number
  online: boolean
  /** Seat label such as `PC #17`, `null` when the friend is not in the club. */
  machineLabel: string | null
  playingGameId: ID | null
  /**
   * Title behind `playingGameId`, resolved server-side.
   *
   * Denormalised for the same reason `machineLabel` is: a card that showed a seat
   * but an id for the game would have to pull the whole library to print one
   * word, and a friend can be in a title this station has not installed — in
   * which case a client-side lookup finds nothing and the row silently loses the
   * fact it exists to state.
   */
  playingGameName: string | null
  /**
   * Whether this member accepts party invites at all (`allowPartyInvites`).
   *
   * A capability, not their settings page: `inviteToParty` refuses on privacy, and
   * a surface without this flag can only discover that by offering a button and
   * then apologising for it.
   */
  acceptsPartyInvites: boolean
}

export type PartyMemberState = 'invited' | 'joined' | 'declined' | 'left'

export interface PartyMember {
  partyId: ID
  userId: ID
  nickname: string
  state: PartyMemberState
}

/** A group forming around one game, so friends land on adjacent seats. */
export interface Party {
  id: ID
  ownerId: ID
  gameId: ID
  members: PartyMember[]
  createdAt: ISODateTime
}

/** One friend row on the "Club now" card (C3.7). */
export interface ClubFriend extends FriendSummary {
  /** Their standing in the *viewer's* party, `null` when they are not in it. */
  partyState: PartyMemberState | null
  /**
   * The server's answer to "may this row have a call button at all".
   *
   * It folds together everything `callToParty` will check anyway — the target's
   * privacy, whether they are already in the party, whether the viewer owns it,
   * and whether there is a title to form one around. One computation, so the
   * button that exists and the request that succeeds cannot disagree.
   */
  callable: boolean
}

/**
 * `GET /api/club/now` — the club as one payload (C3.7).
 *
 * Free seats and friends arrive together because they answer one question ("is
 * there anything happening, and where"), and because two reads would give the
 * card two loading states and therefore two heights (C3.11).
 */
export interface ClubNowBoard {
  /** Free-seat counts per zone, in the club's own zone order. */
  zones: ZoneOccupancy[]
  /** Club totals, summed server-side so no card adds up the zones itself. */
  free: number
  total: number
  /** Friends seated in the club right now, ordered by seat label. */
  friendsInClub: ClubFriend[]
  /**
   * Friends who are not here — a count, not a list. There is nothing to say about
   * them beyond "not tonight", and a greyed-out roster would bury the two people
   * the card exists to point at.
   */
  friendsAway: number
  /**
   * Free minutes the club pays for a friend who signs up, `0` when it runs no such
   * scheme (C3.13).
   *
   * It travels with this payload rather than being a second read of the club
   * settings, because the only place on the screen that may use it is the half of
   * *this* card that has nobody to list: the same sentence next to an empty roster
   * is an invitation and anywhere else an advertisement. One read also means the
   * offer and the emptiness that justifies making it were true at the same moment.
   */
  referralMinutes: number
  /** The party the viewer already stands in, `null` when they have none. */
  partyId: ID | null
  /** The title a call would form a new party around, when there is one. */
  partyGameName: string | null
}
