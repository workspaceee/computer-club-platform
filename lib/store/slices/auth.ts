/**
 * `auth` slice (F6.1) — who is at the station, and the visit lifecycle.
 *
 * This slice owns identity only; the timer, wallet, cart, overlays and invites
 * belong to their own slices. Lifecycle actions therefore read as a list of
 * named calls — which is the point: there is exactly one teardown path, so a new
 * slice can be cleared on logout by adding one line here rather than by
 * remembering four separate places.
 */
import type { UserProfile } from '@/lib/types/user'
import type { SliceCreator } from '../types'

/**
 * Walk-in identity for the `guest` surface (F6.2).
 *
 * A guest has no `UserProfile` — no XP, no coins, no wallet — only a label for
 * the shell and an open tab the bar settles at the counter (MVP §8.2).
 */
export interface GuestIdentity {
  guestId: string
  label: string
}

export interface AuthSlice {
  user: UserProfile | null
  /** Set only while `screen === 'guest'`. Mutually exclusive with `user`. */
  guest: GuestIdentity | null

  loginSuccess: (user: UserProfile) => void
  /** Walk-in check-in: opens the `guest` surface instead of the member one. */
  guestSuccess: (guest: GuestIdentity) => void
  logout: () => void
  /** Keeps the visit, drops to the lock screen, stops the clock. */
  lockPc: () => void
  /** Unlock: back to the surface the visit started on, clock running. */
  resumeSession: () => void
}

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  user: null,
  guest: null,

  loginSuccess: (user) => {
    // Lock PC keeps the visit, so signing back in as the *same* member must
    // continue the paused clock — the lock dialog promises exactly that. Only a
    // different member starts a new session, and then the clock starts over.
    const paused = get()
    const returning =
      paused.user?.email === user.email && paused.sessionSeconds > 0 && !paused.sessionExpired

    set({ user, guest: null })
    // `coins` is required on `UserProfile`, so the balance comes from the
    // account — never from whatever the previous player left on screen.
    get().setCoins(user.coins)
    get().resetUi()
    get().setScreen('launcher')
    if (returning) get().resumeTimer()
    else get().startSession()
  },

  // A guest gets no coin balance: the loyalty economy is members-only, and the
  // bar runs on an open tab instead (F6.2). Clearing the wallet here is what
  // keeps the top bar from showing a member's balance to the next walk-in.
  guestSuccess: (guest) => {
    // A guest has no password, so a paused guest visit on this station is
    // resumed rather than replaced: the open tab belongs to the seat, and
    // starting a second one would silently abandon what the first one owes.
    const paused = get()
    const returning = paused.guest !== null && paused.sessionSeconds > 0 && !paused.sessionExpired

    set({ user: null, guest: returning ? paused.guest : guest })
    get().clearWallet()
    if (!returning) {
      get().clearCart()
      get().clearSocial()
    }
    get().resetUi()
    get().setScreen('guest')
    if (returning) get().resumeTimer()
    else get().startSession()
  },

  // The single teardown path. Every way a visit can end — sign out, end guest
  // session, expired clock — comes through here.
  logout: () => {
    set({ user: null, guest: null })
    get().clearCart()
    get().clearSocial()
    get().clearWallet()
    get().resetSession()
    get().resetUi()
    get().setScreen('lock')
  },

  lockPc: () => {
    get().pauseSession()
    get().closeOverlays()
    get().setScreen('lock')
  },

  resumeSession: () => {
    get().setScreen(get().guest ? 'guest' : 'launcher')
    get().resumeTimer()
  },
})
