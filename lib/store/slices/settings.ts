import type { SliceCreator } from '../types'

export interface Settings {
  resolution: '1920x1080' | '1366x768'
  brightness: number
  reduceAnimations: boolean
  masterVolume: number
  gameVolume: number
  chatVolume: number
  outputDevice: string
  mouseSensitivity: number
  region: string
}

export const DEFAULT_SETTINGS: Settings = {
  resolution: '1920x1080',
  brightness: 80,
  reduceAnimations: false,
  masterVolume: 70,
  gameVolume: 85,
  chatVolume: 50,
  outputDevice: 'Speakers (Realtek)',
  mouseSensitivity: 5,
  region: 'EU West',
}

export interface SettingsSlice {
  settings: Settings
  settingsOpen: boolean

  updateSettings: (patch: Partial<Settings>) => void
  setSettingsOpen: (open: boolean) => void
}

export const settingsInitialState = {
  settings: DEFAULT_SETTINGS,
  settingsOpen: false,
} satisfies Pick<SettingsSlice, 'settings' | 'settingsOpen'>

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  ...settingsInitialState,

  // Settings belong to the machine, so they are never cleared on logout.
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
})
