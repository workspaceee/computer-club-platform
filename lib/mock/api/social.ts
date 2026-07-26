// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/social/*`: friends, requests, presence and game parties. Privacy is
// enforced here (`allowFriendRequests`, `allowPartyInvites`), so a component can
// never invite someone who has opted out just because it forgot to check.
import { ApiError, mutate, newId, query, required } from '@/lib/mock/api/client'
import { db, getFriends, getMachine, getPlayer } from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'
import type { Friendship, FriendSummary, Party, PartyMember } from '@/lib/types/social'

/** The privacy block for a member, or permissive defaults when unset. */
function privacyOf(userId: ID) {
  return (
    db.userPreferences.find((p) => p.userId === userId)?.privacy ?? {
      showOnLeaderboard: true,
      showRealName: false,
      allowFriendRequests: true,
      allowPartyInvites: true,
    }
  )
}

function findFriendship(a: ID, b: ID): Friendship | undefined {
  return db.friendships.find(
    (f) => (f.userId === a && f.friendId === b) || (f.userId === b && f.friendId === a),
  )
}

/* ------------------------------------------------------------------ *
 * Friends
 * ------------------------------------------------------------------ */

/** `GET /api/social/friends` — accepted friends with live presence. */
export function fetchFriends(userId: ID = db.currentUserId): Promise<FriendSummary[]> {
  return query('social.fetchFriends', () => getFriends(userId))
}

export interface FriendRequestSummary {
  userId: ID
  nickname: string
  level: number
  createdAt: string
  /** `incoming` needs accept/decline buttons; `outgoing` only a cancel. */
  direction: 'incoming' | 'outgoing'
}

/** `GET /api/social/requests` — both directions in one call. */
export function fetchFriendRequests(userId: ID = db.currentUserId): Promise<FriendRequestSummary[]> {
  return query('social.fetchFriendRequests', () =>
    db.friendships
      .filter((f) => f.status === 'pending' && (f.userId === userId || f.friendId === userId))
      .flatMap((f) => {
        const otherId = f.userId === userId ? f.friendId : f.userId
        const other = getPlayer(otherId)
        if (!other) return []
        return [
          {
            userId: otherId,
            nickname: other.user.nickname,
            level: other.user.level,
            createdAt: f.createdAt,
            direction: f.userId === userId ? ('outgoing' as const) : ('incoming' as const),
          },
        ]
      }),
  )
}

/** `GET /api/social/search` — find members by nickname, excluding yourself. */
export function searchMembers(term: string, userId: ID = db.currentUserId): Promise<FriendSummary[]> {
  return query('social.searchMembers', () => {
    const needle = term.trim().toLowerCase()
    if (needle.length < 2) return []
    return [...db.players.values()]
      .filter((p) => p.user.id !== userId && p.user.nickname.toLowerCase().includes(needle))
      .slice(0, 10)
      .map((p) => ({
        userId: p.user.id,
        nickname: p.user.nickname,
        level: p.user.level,
        online: p.online,
        machineLabel: p.machineId ? (getMachine(p.machineId)?.label ?? null) : null,
        playingGameId: p.playingGameId,
      }))
  })
}

/** `POST /api/social/friends` — send a request, honouring the target's privacy. */
export function sendFriendRequest(
  targetId: ID,
  userId: ID = db.currentUserId,
): Promise<Friendship> {
  return mutate('social.sendFriendRequest', () => {
    if (targetId === userId) throw new ApiError('validation')
    required(getPlayer(targetId))
    if (!privacyOf(targetId).allowFriendRequests) throw new ApiError('forbidden')
    if (findFriendship(userId, targetId)) throw new ApiError('conflict')

    const friendship: Friendship = {
      userId,
      friendId: targetId,
      status: 'pending',
      createdAt: db.now,
    }
    db.friendships.push(friendship)
    return friendship
  })
}

/** `POST /api/social/friends/:id/accept` — only the receiver may accept. */
export function acceptFriendRequest(
  requesterId: ID,
  userId: ID = db.currentUserId,
): Promise<Friendship> {
  return mutate('social.acceptFriendRequest', () => {
    const friendship = required(findFriendship(userId, requesterId))
    if (friendship.status !== 'pending') throw new ApiError('conflict')
    if (friendship.friendId !== userId) throw new ApiError('forbidden')
    friendship.status = 'accepted'
    return friendship
  })
}

/** `DELETE /api/social/friends/:id` — declines a request or removes a friend. */
export function removeFriend(otherId: ID, userId: ID = db.currentUserId): Promise<void> {
  return mutate('social.removeFriend', () => {
    const friendship = required(findFriendship(userId, otherId))
    db.friendships.splice(db.friendships.indexOf(friendship), 1)
  })
}

/** `POST /api/social/block` — blocking replaces any existing relation. */
export function blockMember(otherId: ID, userId: ID = db.currentUserId): Promise<Friendship> {
  return mutate('social.blockMember', () => {
    required(getPlayer(otherId))
    const existing = findFriendship(userId, otherId)
    if (existing) db.friendships.splice(db.friendships.indexOf(existing), 1)

    const blocked: Friendship = {
      userId,
      friendId: otherId,
      status: 'blocked',
      createdAt: db.now,
    }
    db.friendships.push(blocked)
    return blocked
  })
}

/* ------------------------------------------------------------------ *
 * Parties
 * ------------------------------------------------------------------ */

/** `GET /api/social/parties` — parties the member owns or was invited to. */
export function fetchParties(userId: ID = db.currentUserId): Promise<Party[]> {
  return query('social.fetchParties', () =>
    db.parties.filter((p) => p.ownerId === userId || p.members.some((m) => m.userId === userId)),
  )
}

/** `POST /api/social/parties` — the owner joins their own party immediately. */
export function createParty(gameId: ID, userId: ID = db.currentUserId): Promise<Party> {
  return mutate('social.createParty', () => {
    required(db.games.find((g) => g.id === gameId))
    const owner = required(getPlayer(userId))
    const partyId = newId('party')

    const party: Party = {
      id: partyId,
      ownerId: userId,
      gameId,
      members: [{ partyId, userId, nickname: owner.user.nickname, state: 'joined' }],
      createdAt: db.now,
    }
    db.parties.push(party)
    return party
  })
}

/** `POST /api/social/parties/:id/invite` */
export function inviteToParty(
  partyId: ID,
  targetId: ID,
  userId: ID = db.currentUserId,
): Promise<Party> {
  return mutate('social.inviteToParty', () => {
    const party = required(db.parties.find((p) => p.id === partyId))
    if (party.ownerId !== userId) throw new ApiError('forbidden')

    const target = required(getPlayer(targetId))
    if (!privacyOf(targetId).allowPartyInvites) throw new ApiError('forbidden')
    if (party.members.some((m) => m.userId === targetId && m.state !== 'left')) {
      throw new ApiError('conflict')
    }

    const member: PartyMember = {
      partyId,
      userId: targetId,
      nickname: target.user.nickname,
      state: 'invited',
    }
    party.members.push(member)
    return party
  })
}

/** `POST /api/social/parties/:id/respond` — accept or decline an invite. */
export function respondToPartyInvite(
  partyId: ID,
  accept: boolean,
  userId: ID = db.currentUserId,
): Promise<Party> {
  return mutate('social.respondToPartyInvite', () => {
    const party = required(db.parties.find((p) => p.id === partyId))
    const member = required(party.members.find((m) => m.userId === userId))
    if (member.state !== 'invited') throw new ApiError('conflict')
    member.state = accept ? 'joined' : 'declined'
    return party
  })
}

/** `POST /api/social/parties/:id/leave` — the owner leaving disbands the party. */
export function leaveParty(partyId: ID, userId: ID = db.currentUserId): Promise<Party | null> {
  return mutate('social.leaveParty', () => {
    const party = required(db.parties.find((p) => p.id === partyId))
    if (party.ownerId === userId) {
      db.parties.splice(db.parties.indexOf(party), 1)
      return null
    }
    const member = required(party.members.find((m) => m.userId === userId))
    member.state = 'left'
    return party
  })
}
