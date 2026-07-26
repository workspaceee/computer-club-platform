import type { UserProfile } from '@/lib/types/user'

import type { SliceCreator } from '../types'
import { cartResetState } from './cart'
import { sessionResetState } from './session'
import { socialResetState } from './social'
import { uiResetState } from './ui'

export interface AuthSlice {
  user: UserProfile | null

  loginSuccess: (user: UserProfile) => void
  logout: () => void
}

export const authInitialState = {
  user: null,
} satisfies Pick<AuthSlice, 'user'>

export const createAuthSlice: SliceCreator<AuthSlice> = (set) => ({
  ...authInitialState,

  // Signing in hands the launcher over and starts the clock.
  loginSuccess: (user) =>
    set((s) => ({
      user,
      screen: 'launcher',
      view: 'home',
      timerRunning: true,
      coins: user.coins ?? s.coins,
    })),

  /**
   * Signing out wipes everything tied to the person, not just the profile:
   * a shared machine must never leak a cart or a pending invite to the next
   * player. Settings themselves are machine-level and survive.
   */
  logout: () =>
    set({
      ...authInitialState,
      ...sessionResetState,
      ...cartResetState,
      ...uiResetState,
      ...socialResetState,
      settingsOpen: false,
    }),
})
