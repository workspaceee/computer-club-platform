'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { createAuthSlice } from './slices/auth'
import { createCartSlice } from './slices/cart'
import { createLoyaltySlice } from './slices/loyalty'
import { createNotificationsSlice } from './slices/notifications'
import { createSessionSlice } from './slices/session'
import { createSettingsSlice } from './slices/settings'
import { createSocialSlice } from './slices/social'
import { createUiSlice } from './slices/ui'
import type { StoreState } from './types'

/**
 * One store for the whole client, assembled from eight domain slices (F6.1).
 *
 * State stays flat: `useStore((s) => s.coins)` keeps working everywhere, and the
 * slices below are a split of the source file, not a reshape of the state.
 */
export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSessionSlice(...a),
  ...createCartSlice(...a),
  ...createSettingsSlice(...a),
  ...createUiSlice(...a),
  ...createNotificationsSlice(...a),
  ...createLoyaltySlice(...a),
  ...createSocialSlice(...a),
}))

/* ------------------------------------------------------------------ *
 * Public surface
 * ------------------------------------------------------------------ */

export type { StoreState } from './types'

export { authInitialState } from './slices/auth'
export { cartCount, cartTotal } from './slices/cart'
export { CHECKOUT_REWARD_COINS } from './slices/loyalty'
export { MAX_NOTIFICATIONS, MAX_TOASTS, unreadCount } from './slices/notifications'
export { SESSION_LENGTH } from './slices/session'
export { DEFAULT_SETTINGS } from './slices/settings'

export type { AuthSlice } from './slices/auth'
export type { CartSlice } from './slices/cart'
export type { LoyaltySlice } from './slices/loyalty'
export type {
  NotificationsSlice,
  Toast,
  ToastKind,
  ToastOptions,
} from './slices/notifications'
export type { SessionSlice } from './slices/session'
export type { Settings, SettingsSlice } from './slices/settings'
export type { SocialSlice } from './slices/social'
export type { LauncherView, Screen, UiSlice } from './slices/ui'

/* ------------------------------------------------------------------ *
 * Typed slice hooks
 *
 * Convenience for screens that need a whole domain at once. Each one is shallow
 * compared, so pulling a group never re-renders on unrelated state. Selecting a
 * single field directly from `useStore` is still the cheapest option.
 * ------------------------------------------------------------------ */

export const useAuth = () =>
  useStore(
    useShallow((s) => ({
      user: s.user,
      loginSuccess: s.loginSuccess,
      logout: s.logout,
    })),
  )

export const useSession = () =>
  useStore(
    useShallow((s) => ({
      sessionSeconds: s.sessionSeconds,
      timerRunning: s.timerRunning,
      sessionExpired: s.sessionExpired,
      timeBalanceLabel: s.timeBalanceLabel,
      tick: s.tick,
      lockPc: s.lockPc,
      resumeSession: s.resumeSession,
      expireSession: s.expireSession,
      clearExpired: s.clearExpired,
    })),
  )

export const useCart = () =>
  useStore(
    useShallow((s) => ({
      cart: s.cart,
      cartOpen: s.cartOpen,
      addToCart: s.addToCart,
      removeFromCart: s.removeFromCart,
      changeQty: s.changeQty,
      clearCart: s.clearCart,
      setCartOpen: s.setCartOpen,
      checkout: s.checkout,
    })),
  )

export const useSettings = () =>
  useStore(
    useShallow((s) => ({
      settings: s.settings,
      settingsOpen: s.settingsOpen,
      updateSettings: s.updateSettings,
      setSettingsOpen: s.setSettingsOpen,
    })),
  )

export const useUi = () =>
  useStore(
    useShallow((s) => ({
      screen: s.screen,
      view: s.view,
      launchGameId: s.launchGameId,
      setView: s.setView,
      setLaunchGame: s.setLaunchGame,
    })),
  )

export const useNotifications = () =>
  useStore(
    useShallow((s) => ({
      toasts: s.toasts,
      notifications: s.notifications,
      toast: s.toast,
      dismissToast: s.dismissToast,
      clearToasts: s.clearToasts,
      pushNotification: s.pushNotification,
      markNotificationRead: s.markNotificationRead,
      markAllNotificationsRead: s.markAllNotificationsRead,
      clearNotifications: s.clearNotifications,
    })),
  )

export const useLoyalty = () =>
  useStore(
    useShallow((s) => ({
      coins: s.coins,
      addCoins: s.addCoins,
    })),
  )

export const useSocial = () =>
  useStore(
    useShallow((s) => ({
      pendingFriendRequests: s.pendingFriendRequests,
      pendingPartyInvite: s.pendingPartyInvite,
      receiveFriendRequest: s.receiveFriendRequest,
      dismissFriendRequest: s.dismissFriendRequest,
      receivePartyInvite: s.receivePartyInvite,
      dismissPartyInvite: s.dismissPartyInvite,
    })),
  )
