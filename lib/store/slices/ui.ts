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
   * The inbox hanging off the bell in the top bar (C2.4).
   *
   * Here for the same reason `cartOpen` is: which panel is on screen is a fact
   * about the surface, not about the club. And like the session panel, nothing
   * the inbox *shows* is stored — the list and the unread count are fetched
   * under the `support/…` keys when the panel opens, so a stale copy of the
   * queue cannot outlive the popover that showed it.
   */
  notificationsOpen: boolean

  /**
   * The first-run tour is walking the player around the shell (C3.12).
   *
   * A flag here and nothing else: *whether the player has ever seen it* is a
   * preference on the account (`onboardingCompletedAt`), and the two must not be
   * confused — this one is true for about a minute, once, and is false again the
   * moment the overlay closes, including when the tour is re-opened by hand from
   * the avatar menu. Keeping the "seen" answer out of the store is also what
   * stops a re-run from having to lie about it.
   */
  tourOpen: boolean

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

  /**
   * A launch already handed to the agent and not finished yet (C3.2).
   *
   * The third state of one lifecycle, and the two neighbours cannot express it:
   * `launchGameId` is an intention on *our* screen (the dialog is open, the
   * player may still cancel), `runningGameId` is a title that already holds the
   * machine. Between them sits a few seconds during which the launcher must
   * refuse to start anything else, and that window is exactly where quick launch
   * lives — one click, no dialog, no confirmation step to hide behind.
   *
   * It is in the store rather than inside the launching component because more
   * than one surface can start a game now: the "Continue" card, the hero and the
   * library grid. A flag kept locally would let a player start Valorant from the
   * card and CS2 from the grid a second later, and the shell would end up naming
   * one running title while the machine came up with the other.
   */
  launchingGameId: string | null

  /** Switches surface and re-resolves the open section against it. */
  setScreen: (screen: Screen) => void
  setView: (view: LauncherView) => void
  setCartOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setSessionPanelOpen: (open: boolean) => void
  setNotificationsOpen: (open: boolean) => void
  setTourOpen: (open: boolean) => void
  setLaunchGame: (id: string | null) => void
  /**
   * A title took the machine (`id`) or handed it back (`null`) — F8.4.
   *
   * Not folded into `setLaunchGame`: the dialog closes as the game comes up, so
   * one setter would have to mean both "the dialog is shut" and "a game is
   * running", which are opposite values of the same field.
   */
  setRunningGame: (id: string | null) => void
  /**
   * The agent was asked to start `id`, or that attempt ended (`null`).
   *
   * Owned by `useGameLaunch()` — no screen sets it directly, or the "is anything
   * starting" answer would depend on which screen was asked.
   */
  setLaunchingGame: (id: string | null) => void
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
  notificationsOpen: false,
  tourOpen: false,
  launchGameId: null,
  runningGameId: null,
  launchingGameId: null,

  // Both entry points into navigation go through the surface map, so a
  // member-only section can never survive a switch to the guest surface —
  // whether it arrives from a click, a shortcut or a stale value (F6.2).
  setScreen: (screen) =>
    set((s) => ({ screen, view: resolveView(surfaceOf(screen), s.view) })),

  setView: (view) => set((s) => ({ view: resolveView(surfaceOf(s.screen), view) })),

  setCartOpen: (open) => set({ cartOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSessionPanelOpen: (open) => set({ sessionPanelOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setTourOpen: (open) => set({ tourOpen: open }),
  setLaunchGame: (id) => set({ launchGameId: id }),
  setRunningGame: (id) => set({ runningGameId: id }),
  setLaunchingGame: (id) => set({ launchingGameId: id }),

  // `runningGameId` deliberately survives here: locking the seat closes our
  // dialogs, it does not close the player's game. Clearing it would let the
  // launcher start talking over a match that is still up (F8.4).
  closeOverlays: () =>
    set({
      cartOpen: false,
      settingsOpen: false,
      sessionPanelOpen: false,
      notificationsOpen: false,
      // The tour goes with the rest: it is a walk around *this* screen, and the
      // player who comes back from a lock arrives at the PIN pad, not at step 3.
      // The account has already been marked as offered the tour by then, so
      // nothing re-opens it behind them (C3.12).
      tourOpen: false,
      launchGameId: null,
    }),

  // `resetUi` is a *fresh visit*, and no title survives the end of one — so this
  // is the one path that must clear it, or the next player would inherit a
  // silenced launcher with nothing on screen to explain it.
  resetUi: () =>
    set({
      view: 'home',
      cartOpen: false,
      settingsOpen: false,
      sessionPanelOpen: false,
      notificationsOpen: false,
      tourOpen: false,
      launchGameId: null,
      runningGameId: null,
      // Same reason `runningGameId` is cleared here and nowhere else: a start
      // that was in flight when the visit ended has nobody left to hand the
      // machine to, and a stale id would leave the next player's launcher
      // refusing to open anything.
      launchingGameId: null,
    }),
})
