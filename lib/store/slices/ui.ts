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

  /**
   * The "My session" panel behind the HUD (C2.3).
   *
   * In `ui` rather than in `session` for the same reason `cartOpen` is: it is a
   * fact about the screen, not about the visit. Nothing the panel shows is
   * stored here either — the panel fetches `session/detail` when it opens, so
   * this flag is the *only* state the shell has to keep, and a stale copy of the
   * seat or the grant history cannot outlive the dialog that showed it.
   */
  sessionPanelOpen: boolean

  /**
   * The title that currently holds the machine, or `null` (F8.4).
   *
   * It lives in `ui` rather than in `session` because it answers a question
   * about the *surface*: while it is set, the launcher is not what the player is
   * looking at — a game is. Nothing about the paid clock changes.
   *
   * Distinct from `launchGameId`, which is the id the launch **dialog** is open
   * for. One is an intention on our screen, the other is a process on the
   * machine; collapsing them would silence the launcher the moment a player
   * merely opened the dialog and then cancelled it.
   */
  runningGameId: string | null

  /** Switches surface and re-resolves the open section against it. */
  setScreen: (screen: Screen) => void
  setView: (view: LauncherView) => void
  setCartOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSessionPanelOpen: (open: boolean) => void
  setLaunchGame: (id: string | null) => void
  /**
   * A title took the machine (`id`) or handed it back (`null`) — F8.4.
   *
   * Not folded into `setLaunchGame`: the dialog closes as the game comes up, so
   * one setter would have to mean both "the dialog is shut" and "a game is
   * running", which are opposite values of the same field.
   */
  setRunningGame: (id: string | null) => void
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
  sessionPanelOpen: false,
  launchGameId: null,
  runningGameId: null,

  // Both entry points into navigation go through the surface map, so a
  // member-only section can never survive a switch to the guest surface —
  // whether it arrives from a click, a shortcut or a stale value (F6.2).
  setScreen: (screen) =>
    set((s) => ({ screen, view: resolveView(surfaceOf(screen), s.view) })),

  setView: (view) => set((s) => ({ view: resolveView(surfaceOf(s.screen), view) })),

  setCartOpen: (open) => set({ cartOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSessionPanelOpen: (open) => set({ sessionPanelOpen: open }),
  setLaunchGame: (id) => set({ launchGameId: id }),
  setRunningGame: (id) => set({ runningGameId: id }),

  // `runningGameId` deliberately survives here: locking the seat closes our
  // dialogs, it does not close the player's game. Clearing it would let the
  // launcher start talking over a match that is still up (F8.4).
  closeOverlays: () =>
    set({ cartOpen: false, settingsOpen: false, sessionPanelOpen: false, launchGameId: null }),

  // `resetUi` is a *fresh visit*, and no title survives the end of one — so this
  // is the one path that must clear it, or the next player would inherit a
  // silenced launcher with nothing on screen to explain it.
  resetUi: () =>
    set({
      view: 'home',
      cartOpen: false,
      settingsOpen: false,
      sessionPanelOpen: false,
      launchGameId: null,
      runningGameId: null,
    }),
})
