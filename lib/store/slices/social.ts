import type { FriendRequestEvent, PartyInviteEvent } from '@/lib/realtime/events'

import type { SliceCreator } from '../types'

/**
 * Landing spot for the `friend.request` and `party.invite` events that F4.1
 * already delivers. Until the social screen exists (C13) this slice only holds
 * what arrives over the bus — the payload types are the realtime contracts, so
 * there is nothing invented here to go stale.
 */
export interface SocialSlice {
  /** Incoming requests awaiting an answer, newest first. */
  pendingFriendRequests: FriendRequestEvent[]
  /** Only the latest invite is actionable; invites expire, so one is enough. */
  pendingPartyInvite: PartyInviteEvent | null

  receiveFriendRequest: (event: FriendRequestEvent) => void
  dismissFriendRequest: (friendshipId: string) => void
  receivePartyInvite: (event: PartyInviteEvent) => void
  dismissPartyInvite: () => void
}

export const socialInitialState = {
  pendingFriendRequests: [],
  pendingPartyInvite: null,
} satisfies Pick<SocialSlice, 'pendingFriendRequests' | 'pendingPartyInvite'>

/** Social state is per-player, so it is wiped on logout. */
export const socialResetState = socialInitialState

export const createSocialSlice: SliceCreator<SocialSlice> = (set) => ({
  ...socialInitialState,

  /**
   * `received` queues a request; `accepted` and `declined` are answers to one we
   * sent, so they resolve the row instead of adding to the queue.
   */
  receiveFriendRequest: (event) =>
    set((s) => {
      const rest = s.pendingFriendRequests.filter((r) => r.friendshipId !== event.friendshipId)
      return {
        pendingFriendRequests: event.kind === 'received' ? [event, ...rest] : rest,
      }
    }),

  dismissFriendRequest: (friendshipId) =>
    set((s) => ({
      pendingFriendRequests: s.pendingFriendRequests.filter(
        (r) => r.friendshipId !== friendshipId,
      ),
    })),

  receivePartyInvite: (event) => set({ pendingPartyInvite: event }),
  dismissPartyInvite: () => set({ pendingPartyInvite: null }),
})
