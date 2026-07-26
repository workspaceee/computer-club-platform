'use client'

/**
 * The one client store (F6.1), composed from eight domain slices in
 * `lib/store/slices/`. Import path is unchanged: `@/lib/store`.
 *
 *   auth          — who is at the station, visit lifecycle
 *   session       — the paid clock
 *   cart          — bar order in progress
 *   settings      — station preferences
 *   ui            — surface, open section, overlays
 *   notifications — toast queue
 *   loyalty       — coins and time balance
 *   social        — friend requests and party invites
 *
 * Slices are declared before `auth` on purpose: `auth` lifecycle actions call
 * into the others, so keeping it last makes the dependency direction obvious
 * when reading the composition.
 */
import { create } from 'zustand'
import type { CartItem } from '@/lib/types/order'
import { createAuthSlice } from './slices/auth'
import { createCartSlice } from './slices/cart'
import { createLoyaltySlice } from './slices/loyalty'
import { createNotificationsSlice } from './slices/notifications'
import { createSessionSlice } from './slices/session'
import { createSettingsSlice } from './slices/settings'
import { createSocialSlice } from './slices/social'
import { createUiSlice } from './slices/ui'
import type { StoreState } from './types'

export const useStore = create<StoreState>()((...a) => ({
  ...createUiSlice(...a),
  ...createSessionSlice(...a),
  ...createSettingsSlice(...a),
  ...createNotificationsSlice(...a),
  ...createLoyaltySlice(...a),
  ...createCartSlice(...a),
  ...createSocialSlice(...a),
  ...createAuthSlice(...a),
}))

/* ------------------------------------------------------------------ *
 * Public surface — re-exported so screens keep importing `@/lib/store`
 * ------------------------------------------------------------------ */

export type { StoreState } from './types'
export type { GuestIdentity } from './slices/auth'
export type { Settings } from './slices/settings'
export { DEFAULT_SETTINGS } from './slices/settings'
export { SESSION_LENGTH } from './slices/session'
export { CHECKOUT_AWARD_COINS } from './slices/loyalty'
export { MAX_TOASTS } from './slices/notifications'
export type { Toast, ToastKind, ToastOptions } from './slices/notifications'
export type { PendingFriendRequest, PendingPartyInvite } from './slices/social'

/**
 * `Screen` and `LauncherView` live in `lib/launcher-nav.ts` next to the table
 * that gives every section its label, icon, placement and guest availability
 * (F6.2). They are re-exported here because the store is where the rest of the
 * app already reads them from.
 */
export type { LauncherSurface, LauncherView, Screen } from '@/lib/launcher-nav'

export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.price * item.qty, 0)

export const cartCount = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.qty, 0)
