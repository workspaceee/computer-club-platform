/**
 * `settings` slice (F6.1) — station preferences the player can change.
 *
 * The open/closed state of the settings modal is not here: that is an overlay
 * and belongs to `ui`.
 */
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
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
})
