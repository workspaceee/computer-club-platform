import type { SliceCreator } from '../types'

/** Which surface owns the screen. Extended to `guest` in F6.2. */
export type Screen = 'lock' | 'launcher'

/** Tabs inside the launcher. Extended with wallet/rewards/social/help in F6.2. */
export type LauncherView = 'home' | 'games' | 'shop' | 'profile'

export interface UiSlice {
  screen: Screen
  view: LauncherView
  /** Game awaiting the launch confirmation modal, `null` when it is closed. */
  launchGameId: string | null

  setView: (view: LauncherView) => void
  setLaunchGame: (id: string | null) => void
}

export const uiInitialState = {
  screen: 'lock',
  view: 'home',
  launchGameId: null,
} satisfies Pick<UiSlice, 'screen' | 'view' | 'launchGameId'>

/** Returning to the lock screen from a clean slate — shared by logout. */
export const uiResetState = uiInitialState

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  ...uiInitialState,

  setView: (view) => set({ view }),
  setLaunchGame: (id) => set({ launchGameId: id }),
})
