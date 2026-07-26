/**
 * `session` slice (F6.1) — the paid clock and nothing else.
 *
 * Note the debt this slice inherits, recorded against F6.3: time is still a
 * local decrement, not a countdown to `expires_at`, so it drifts when the
 * machine sleeps. Keeping it isolated here is what makes that rewrite a
 * one-file change instead of a hunt through the shell.
 */
import type { SliceCreator } from '../types'

/** Length of a prepaid session. Temporary until `expires_at` lands (F6.3). */
export const SESSION_LENGTH = 2 * 60 * 60

export interface SessionSlice {
  sessionSeconds: number
  timerRunning: boolean
  sessionExpired: boolean

  /** Fresh paid session: full clock, running, not expired. */
  startSession: () => void
  /** Lock PC — the session survives, the clock does not run. */
  pauseSession: () => void
  /** Unlock — resume only if there is time left to burn. */
  resumeTimer: () => void
  /** Full clock, stopped: the state a free station is in. */
  resetSession: () => void
  tick: () => void
  expireSession: () => void
  /** Acknowledge the expiry screen and hand the station back to the club. */
  clearExpired: () => void
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  sessionSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,

  startSession: () =>
    set({ sessionSeconds: SESSION_LENGTH, timerRunning: true, sessionExpired: false }),

  pauseSession: () => set({ timerRunning: false }),

  resumeTimer: () => set((s) => ({ timerRunning: s.sessionSeconds > 0 })),

  resetSession: () =>
    set({ sessionSeconds: SESSION_LENGTH, timerRunning: false, sessionExpired: false }),

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

  expireSession: () => set({ timerRunning: false, sessionExpired: true }),

  // Expiry ends the visit, so it reuses the one teardown path instead of a
  // second, slightly different reset that would inevitably drift from `logout`.
  clearExpired: () => {
    set({ sessionExpired: false })
    get().logout()
  },
})
