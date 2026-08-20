// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/social/*`: friends, requests, presence and game parties. Privacy is
// enforced here (`allowFriendRequests`, `allowPartyInvites`), so a component can
// never invite someone who has opted out just because it forgot to check.
import { ApiError, mutate, newId, query, required } from '@/lib/mock/api/client'
import {
  db,
  getFriends,
  getGame,
  getGamePresence,
  getMachine,
  getPlayer,
  getPrivacy,
  getZoneOccupancy,
} from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'
import type {
  ClubFriend,
  ClubNowBoard,
  Friendship,
  FriendSummary,
  GamePresence,
  Party,
  PartyMember,
} from '@/lib/types/social'

/**
 * The privacy block for a member, or permissive defaults when unset.
 *
 * Delegated to the db helper rather than re-inlined, because the same answer is
 * now needed by the summaries that decide whether to *offer* an invite (C3.7) and
 * by the mutation that refuses one. Two copies of the defaults would let a card
 * show a button the endpoint below is about to reject.
 */
const privacyOf = getPrivacy

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

/**
 * `GET /api/club/playing` — players per title in the hall right now (C4.4).
 *
 * Its own read rather than a field on the shelf `fetchGames` returns, and that is
 * the whole design of the library card's counter:
 *
 *  - the catalogue is static between two reads and the hall is not, so the two
 *    have different refresh cadences — folding them together would make the grid
 *    refetch sixty-seven catalogue rows every half minute to learn one number;
 *  - it is a *club* fact, so it is the same answer for every screen that asks and
 *    can be cached under one key regardless of who is signed in;
 *  - and it degrades on its own. When this read fails the library still renders —
 *    the cards simply say nothing about presence, which is the honest outcome. A
 *    counter folded into the shelf payload would have taken the whole grid down
 *    with it.
 *
 * Sparse, from `getGamePresence()`: seated players only, so "playing from home"
 * never inflates a number the player is about to walk across the room on.
 */
export function fetchGamePresence(): Promise<GamePresence> {
  return query('social.fetchGamePresence', () => getGamePresence())
}

/**
 * `GET /api/games/:id/friends` — friends in **this** title right now (C4.5).
 *
 * Server-side for the same reason the `friendsPlaying` filter is (see
 * `fetchGames`): the client holds neither half of the answer, and a detail panel
 * that wanted it would have to pull the whole friend list plus everyone's presence
 * to name two people. One join, two shapes — the filter returns titles, this
 * returns the people.
 *
 * Seated players only — `online` **and** a seat. A friend playing this game from
 * home is not somebody the panel can offer to sit down next to, and listing them
 * under "in the club now" sends a player looking round the hall for somebody who
 * is not in it. Same rule as `friendsInClub` on the home card (C3.7).
 */
export function fetchFriendsInGame(
  gameId: ID,
  userId: ID = db.currentUserId,
): Promise<FriendSummary[]> {
  return query('social.fetchFriendsInGame', () =>
    getFriends(userId)
      .filter((f) => f.online && f.machineLabel !== null && f.playingGameId === gameId)
      // Seat order, like `friendsInClub`: the order a player can walk the room in.
      .sort((a, b) => (a.machineLabel ?? '').localeCompare(b.machineLabel ?? '')),
  )
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
        playingGameName: p.playingGameId ? (getGame(p.playingGameId)?.name ?? null) : null,
        acceptsPartyInvites: privacyOf(p.user.id).allowPartyInvites,
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

/* ------------------------------------------------------------------ *
 * "The club now" (C3.7)
 * ------------------------------------------------------------------ */

/**
 * The party this member is the owner of, if any.
 *
 * Ownership rather than membership, because only an owner may invite
 * (`inviteToParty`): being a guest in someone else's squad is not a party the
 * viewer can pull a third person into.
 */
function ownedParty(userId: ID): Party | undefined {
  return db.parties.find((p) => p.ownerId === userId)
}

/**
 * The title a call would form a party around.
 *
 * The viewer's own running game, because a party is formed around what the person
 * pressing the button is playing — not around the most popular title in the club,
 * and not around whatever the target happens to be in. `null` when the viewer is
 * not in a game and owns no party: there is nothing to invite anyone *to*, and the
 * card must say so rather than opening an empty squad.
 */
function partyGameFor(userId: ID): ID | null {
  const owned = ownedParty(userId)
  if (owned) return owned.gameId
  return getPlayer(userId)?.playingGameId ?? null
}

/**
 * `GET /api/club/now` — free seats by zone, friends on the floor, and whether each
 * of them can be called into a party (C3.7).
 *
 * One payload for three readings on purpose. They answer the same question — "is
 * anything happening here, and where" — and splitting them would give the card
 * three loading states, therefore three heights, therefore a surface that resizes
 * twice while it settles (C3.11).
 *
 * `callable` is computed here rather than in the UI because it is the *same*
 * predicate `callToParty` enforces below: the target's privacy, whether they are
 * already in the squad, and whether there is a title to form one around. A card
 * that guessed would offer a button the API then refuses.
 */
export function fetchClubNow(userId: ID = db.currentUserId): Promise<ClubNowBoard> {
  return query('social.fetchClubNow', () => {
    const zones = getZoneOccupancy()
    const party = ownedParty(userId)
    const gameId = partyGameFor(userId)

    const friends = getFriends(userId)
    // "In the club" is a seat, not an `online` flag: presence without a machine is
    // a member the club cannot point at, and this card's whole promise is naming
    // the PC.
    const seated = friends.filter((f) => f.machineLabel !== null)

    const friendsInClub: ClubFriend[] = seated
      .map((friend) => {
        const membership = party?.members.find(
          (m) => m.userId === friend.userId && m.state !== 'left' && m.state !== 'declined',
        )
        return {
          ...friend,
          partyState: membership?.state ?? null,
          callable:
            gameId !== null && friend.acceptsPartyInvites && membership === undefined,
        }
      })
      // Seat order, so the list reads like the room: a player looking for a friend
      // scans the labels, and an arbitrary order makes them read all of them.
      .sort((a, b) => (a.machineLabel ?? '').localeCompare(b.machineLabel ?? ''))

    return {
      zones,
      // Summed from the same rows the zones were counted from, so the total and
      // its parts cannot disagree — the failure mode of a client adding these up.
      free: zones.reduce((sum, z) => sum + z.free, 0),
      total: zones.reduce((sum, z) => sum + z.total, 0),
      friendsInClub,
      friendsAway: friends.length - seated.length,
      // The club's own offer (C3.13), carried here so the half of the card that has
      // nobody to list can say what bringing somebody in is worth — without a
      // second read, and without the number being written into three dictionaries.
      referralMinutes: db.clubSettings.referralBonusMinutes,
      partyId: party?.id ?? null,
      partyGameName: gameId ? (getGame(gameId)?.name ?? null) : null,
    }
  })
}

/**
 * `POST /api/social/parties/call` — "call into the party", in one request.
 *
 * The card offers one button, and behind it are two very different writes: create
 * a party around what the viewer is playing, or invite into the one they already
 * own. Doing that in the client would mean two awaits with a window between them
 * in which a double click creates two parties — so the composite lives here, on
 * the side that can make it atomic.
 *
 * Privacy is still enforced by `inviteToParty`, not re-checked here: this endpoint
 * composes the existing ones rather than becoming a second place that decides who
 * may be invited.
 */
export function callToParty(
  targetId: ID,
  userId: ID = db.currentUserId,
): Promise<Party> {
  return mutate('social.callToParty', () => {
    const gameId = partyGameFor(userId)
    // Nothing to invite anyone *to*. `validation`, not `conflict`: the request was
    // never answerable, and the card is expected to have hidden the button.
    if (gameId === null) throw new ApiError('validation')

    const target = required(getPlayer(targetId))
    if (!privacyOf(targetId).allowPartyInvites) throw new ApiError('forbidden')

    let party = ownedParty(userId)
    if (!party) {
      const owner = required(getPlayer(userId))
      const partyId = newId('party')
      party = {
        id: partyId,
        ownerId: userId,
        gameId,
        members: [{ partyId, userId, nickname: owner.user.nickname, state: 'joined' }],
        createdAt: db.now,
      }
      db.parties.push(party)
    }

    const existing = party.members.find((m) => m.userId === targetId)
    if (existing && existing.state !== 'left' && existing.state !== 'declined') {
      throw new ApiError('conflict')
    }
    // A member who left or declined is re-invited in place rather than pushed
    // twice: two rows for one person would make `memberCount` lie.
    if (existing) {
      existing.state = 'invited'
    } else {
      party.members.push({
        partyId: party.id,
        userId: targetId,
        nickname: target.user.nickname,
        state: 'invited',
      })
    }

    return party
  })
}
