/**
 * Store composition (F6.1).
 *
 * `StoreState` is the intersection of the eight slices, so every slice sees the
 * whole store through `set` / `get` while owning only its own fields. That is
 * deliberate: the transitions of this product are cross-domain by nature (a
 * logout has to clear identity, timer, cart, overlays and invites at once), and
 * the honest way to express that is one slice calling another's named action —
 * not eight copies of the same reset written inline.
 *
 * Rule of thumb when adding state: it belongs to the slice whose *domain* owns
 * it, not the screen that happens to render it. Coins live in `loyalty` even
 * though the top bar shows them; `cartOpen` lives in `ui` because it is an
 * overlay, not a cart fact.
 */
import type { StateCreator } from 'zustand'
import type { AuthSlice } from './slices/auth'
import type { CartSlice } from './slices/cart'
import type { LoyaltySlice } from './slices/loyalty'
import type { NotificationsSlice } from './slices/notifications'
import type { SessionSlice } from './slices/session'
import type { SettingsSlice } from './slices/settings'
import type { SocialSlice } from './slices/social'
import type { UiSlice } from './slices/ui'

export type StoreState = AuthSlice &
  SessionSlice &
  CartSlice &
  SettingsSlice &
  UiSlice &
  NotificationsSlice &
  LoyaltySlice &
  SocialSlice

/**
 * Signature every slice factory uses. Typing `set` / `get` against the full
 * `StoreState` is what makes cross-slice calls compile-checked instead of
 * hopeful — rename `clearCart` and every caller breaks at build time.
 */
export type SliceCreator<T> = StateCreator<StoreState, [], [], T>
