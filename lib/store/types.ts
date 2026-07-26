import type { StateCreator } from 'zustand'

import type { AuthSlice } from './slices/auth'
import type { CartSlice } from './slices/cart'
import type { LoyaltySlice } from './slices/loyalty'
import type { NotificationsSlice } from './slices/notifications'
import type { SessionSlice } from './slices/session'
import type { SettingsSlice } from './slices/settings'
import type { SocialSlice } from './slices/social'
import type { UiSlice } from './slices/ui'

/**
 * The single client store, composed from one slice per domain (F6.1).
 *
 * The shape stays **flat** on purpose: every consumer keeps selecting
 * `useStore((s) => s.coins)`, and slices are an organisation of the source, not
 * a nesting of the state. Slices may write across boundaries — `logout` has to
 * clear the cart and the overlays — which is exactly why they share one type.
 */
export interface StoreState
  extends AuthSlice,
    SessionSlice,
    CartSlice,
    SettingsSlice,
    UiSlice,
    NotificationsSlice,
    LoyaltySlice,
    SocialSlice {}

/** Signature every slice creator uses, so each one can `get()` the whole store. */
export type SliceCreator<TSlice> = StateCreator<StoreState, [], [], TSlice>
