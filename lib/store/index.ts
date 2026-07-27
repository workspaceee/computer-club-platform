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
import { mulCents, sumCents } from '@/lib/money'
import type { Cents } from '@/lib/types/common'
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
export { POSTPAID_CENTS_PER_MINUTE, SESSION_LENGTH, timeChargeCents } from './slices/session'
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

/**
 * Basket total in **cents**, named for its unit like every other money value in
 * the system. It used to return a float number of euros, which is what made the
 * top bar convert it back with `toCents(cartTotal(cart))` before it could add a
 * time charge to it (F3.6 / F7.2).
 */
export const cartTotalCents = (cart: CartItem[]): Cents =>
  sumCents(cart.map((item) => mulCents(item.priceCents, item.qty)))

export const cartCount = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.qty, 0)
