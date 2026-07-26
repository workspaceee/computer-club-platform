import type { ID, ISODateTime } from './common'

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
