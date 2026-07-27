/**
 * `ui` slice (F6.1) — what is on screen: the surface, the open section and the
 * overlays. No domain data lives here.
 */
import { resolveView, surfaceOf, type LauncherView, type Screen } from '@/lib/launcher-nav'
import type { SliceCreator } from '../types'

export interface UiSlice {
  screen: Screen
  view: LauncherView
  cartOpen: boolean
  settingsOpen: boolean
  launchGameId: string | null

  /** Switches surface and re-resolves the open section against it. */
  setScreen: (screen: Screen) => void
  setView: (view: LauncherView) => void
  setCartOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setLaunchGame: (id: string | null) => void
  /** Drops every overlay without touching the section — used by Lock PC. */
  closeOverlays: () => void
  /** Back to a fresh shell: home section, nothing open. Keeps `screen`. */
  resetUi: () => void
}

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  screen: 'lock',
  view: 'home',
  cartOpen: false,
  settingsOpen: false,
  launchGameId: null,

  // Both entry points into navigation go through the surface map, so a
  // member-only section can never survive a switch to the guest surface —
  // whether it arrives from a click, a shortcut or a stale value (F6.2).
  setScreen: (screen) =>
    set((s) => ({ screen, view: resolveView(surfaceOf(screen), s.view) })),

  setView: (view) => set((s) => ({ view: resolveView(surfaceOf(s.screen), view) })),

  setCartOpen: (open) => set({ cartOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setLaunchGame: (id) => set({ launchGameId: id }),

  closeOverlays: () => set({ cartOpen: false, settingsOpen: false, launchGameId: null }),

  resetUi: () =>
    set({ view: 'home', cartOpen: false, settingsOpen: false, launchGameId: null }),
})
