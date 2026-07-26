import type { SliceCreator } from '../types'
import { cartResetState } from './cart'
import { uiResetState } from './ui'

/** Default grant for a fresh session: 2 hours, in seconds. */
export const SESSION_LENGTH = 2 * 60 * 60

export interface SessionSlice {
  sessionSeconds: number
  timerRunning: boolean
  sessionExpired: boolean
  timeBalanceLabel: string

  lockPc: () => void
  resumeSession: () => void
  expireSession: () => void
  clearExpired: () => void

  /**
   * Decrements the local counter once per second.
   *
   * TODO(F6.3): derive the countdown from the server `expiresAt` in
   * `SessionSnapshot` instead, so minimising the window or waking from sleep
   * cannot desync the clock. Behaviour is intentionally unchanged here.
   */
  tick: () => void
}

export const sessionInitialState = {
  sessionSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,
  timeBalanceLabel: '2h 00m',
} satisfies Pick<
  SessionSlice,
  'sessionSeconds' | 'timerRunning' | 'sessionExpired' | 'timeBalanceLabel'
>

/** Clock state for a signed-out machine. The label is left as-is. */
export const sessionResetState = {
  sessionSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  ...sessionInitialState,

  // Locking keeps the session alive and only pauses the clock.
  lockPc: () =>
    set({
      screen: 'lock',
      timerRunning: false,
      settingsOpen: false,
      launchGameId: null,
      cartOpen: false,
    }),

  resumeSession: () =>
    set((s) => ({
      screen: 'launcher',
      timerRunning: s.sessionSeconds > 0,
    })),

  expireSession: () => set({ timerRunning: false, sessionExpired: true }),

  // Dismissing the expiry notice drops the player back to the lock screen.
  clearExpired: () =>
    set({
      sessionExpired: false,
      screen: uiResetState.screen,
      view: uiResetState.view,
      user: null,
      sessionSeconds: SESSION_LENGTH,
      cart: cartResetState.cart,
    }),

  tick: () => {
    const { sessionSeconds, timerRunning } = get()
    if (!timerRunning) return
    if (sessionSeconds <= 1) {
      set({ sessionSeconds: 0 })
      get().expireSession()
      return
    }
    set({ sessionSeconds: sessionSeconds - 1 })
  },
})
