/**
 * `social` slice (F6.1) — incoming friend requests and party invites.
 *
 * Why this exists before the social screen does: the realtime layer already
 * delivers `friend.request` and `party.invite` (F4.1), and until now the only
 * thing that happened to them was a six-second toast. Miss the toast and the
 * invite is gone — the payload was never stored anywhere. This slice is the
 * inbox those events land in, so the data survives long enough for a screen to
 * show it.
 *
 * Honest status: the slice is **written but not yet rendered.** The friends and
 * party UI is `C9` — until then nothing in the client displays these lists, and
 * the section stays a `PendingView` rather than a half-built screen.
 */
import type { FriendRequestEvent, PartyInviteEvent } from '@/lib/realtime/events'
import type { SliceCreator } from '../types'

/** An invite inbox is not a log — old entries are dropped, not accumulated. */
const MAX_PENDING = 20

export interface PendingFriendRequest extends FriendRequestEvent {
  receivedAt: number
}

export interface PendingPartyInvite extends PartyInviteEvent {
  receivedAt: number
}

export interface SocialSlice {
  friendRequests: PendingFriendRequest[]
  partyInvites: PendingPartyInvite[]

  receiveFriendRequest: (event: FriendRequestEvent) => void
  receivePartyInvite: (event: PartyInviteEvent) => void
  dismissFriendRequest: (friendshipId: string) => void
  dismissPartyInvite: (partyId: string) => void
  /** Drops invites whose `expiresAt` has passed. */
  prunePartyInvites: () => void
  /** Nothing social survives the end of a visit. */
  clearSocial: () => void
}

export const createSocialSlice: SliceCreator<SocialSlice> = (set, get) => ({
  friendRequests: [],
  partyInvites: [],

  // Guests have no social graph at all (F6.2), so their events are dropped
  // rather than queued for an account that does not exist.
  receiveFriendRequest: (event) => {
    if (get().guest) return
    // `accepted` / `declined` are answers to a request *we* sent — they are
    // news, not something to act on, so only `received` joins the inbox.
    if (event.kind !== 'received') return
    set((s) => ({
      friendRequests: [
        ...s.friendRequests.filter((r) => r.friendshipId !== event.friendshipId),
        { ...event, receivedAt: Date.now() },
      ].slice(-MAX_PENDING),
    }))
  },

  receivePartyInvite: (event) => {
    if (get().guest) return
    // Prune on arrival — the only moment the list changes. Without this call
    // `prunePartyInvites` would be an action nobody invokes, and the inbox would
    // keep offering parties whose `expiresAt` has already passed.
    get().prunePartyInvites()
    set((s) => ({
      partyInvites: [
        ...s.partyInvites.filter((i) => i.partyId !== event.partyId),
        { ...event, receivedAt: Date.now() },
      ].slice(-MAX_PENDING),
    }))
  },

  dismissFriendRequest: (friendshipId) =>
    set((s) => ({
      friendRequests: s.friendRequests.filter((r) => r.friendshipId !== friendshipId),
    })),

  dismissPartyInvite: (partyId) =>
    set((s) => ({ partyInvites: s.partyInvites.filter((i) => i.partyId !== partyId) })),

  prunePartyInvites: () =>
    set((s) => {
      const now = Date.now()
      const live = s.partyInvites.filter((i) => new Date(i.expiresAt).getTime() > now)
      return live.length === s.partyInvites.length ? s : { partyInvites: live }
    }),

  clearSocial: () => set({ friendRequests: [], partyInvites: [] }),
})
