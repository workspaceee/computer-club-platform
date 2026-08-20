/**
 * `settings` slice (F6.1) — station preferences the player can change.
 *
 * The open/closed state of the settings modal is not here: that is an overlay
 * and belongs to `ui`.
 */
import { DEFAULT_SFX_VOLUME } from '@/lib/sfx'
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

  /**
   * Interface sounds on/off (F8.3) — the launcher's own cues only, never the
   * game or the voice chat, which are the machine's mixer and not ours.
   *
   * A separate boolean rather than "volume 0" because the two are different
   * statements: zero is a level a drag can pass through by accident, off is a
   * decision. The engine honours it even for `critical` cues (F8.4) — an
   * explicit refusal outranks our idea of what is important.
   */
  interfaceSounds: boolean
  /**
   * Interface volume as a **percent**, because that is what the slider shows
   * and the only place a 0…1 float is needed is the mixer input.
   */
  interfaceVolume: number
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

  // On by default: a launcher whose confirmations are silent out of the box
  // teaches the player nothing about the sound existing at all, and every cue
  // in the set is already mastered quiet (F8.1).
  interfaceSounds: true,
  // Derived, not typed out: the mixer's fallback and the stored default are the
  // same number by construction, so raising one can never leave the other behind.
  interfaceVolume: Math.round(DEFAULT_SFX_VOLUME * 100),
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
