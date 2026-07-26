'use client'

import { create } from 'zustand'
import { resolveView, surfaceOf, type LauncherView, type Screen } from '@/lib/launcher-nav'
import type { ShopItem } from '@/lib/types/catalog'
import type { CartItem } from '@/lib/types/order'
import type { UserProfile } from '@/lib/types/user'

/**
 * `Screen` and `LauncherView` live in `lib/launcher-nav.ts` next to the table
 * that gives every section its label, icon, placement and guest availability
 * (F6.2). They are re-exported here because the store is where the rest of the
 * app already reads them from.
 */
export type { LauncherSurface, LauncherView, Screen } from '@/lib/launcher-nav'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  /** Optional emphasised line above the message. */
  title?: string
  /** Auto-dismiss delay in ms. `0` keeps it up until dismissed manually. */
  duration?: number
}

export interface ToastOptions {
  title?: string
  duration?: number
}

/** Never stack more than this — the oldest toast is dropped (F1.20). */
export const MAX_TOASTS = 3

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

const DEFAULT_SETTINGS: Settings = {
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

const SESSION_LENGTH = 2 * 60 * 60 // 2h in seconds

/**
 * Walk-in identity for the `guest` surface (F6.2).
 *
 * A guest has no `UserProfile` — no XP, no coins, no wallet — only a label for
 * the shell and an open tab the bar settles at the counter (MVP §8.2).
 */
export interface GuestIdentity {
  guestId: string
  label: string
}

interface StoreState {
  screen: Screen
  view: LauncherView
  user: UserProfile | null
  /** Set only while `screen === 'guest'`. Mutually exclusive with `user`. */
  guest: GuestIdentity | null

  sessionSeconds: number
  timerRunning: boolean
  sessionExpired: boolean

  coins: number
  timeBalanceLabel: string

  cart: CartItem[]
  cartOpen: boolean

  settings: Settings
  settingsOpen: boolean

  launchGameId: string | null

  toasts: Toast[]

  // auth / session lifecycle
  loginSuccess: (user: UserProfile) => void
  /** Walk-in check-in: opens the `guest` surface instead of the member one. */
  guestSuccess: (guest: GuestIdentity) => void
  logout: () => void
  lockPc: () => void
  resumeSession: () => void
  expireSession: () => void
  clearExpired: () => void

  // navigation
  setView: (view: LauncherView) => void

  // timer
  tick: () => void

  // cart
  addToCart: (item: ShopItem) => void
  removeFromCart: (id: string) => void
  changeQty: (id: string, delta: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  checkout: () => void

  // settings
  updateSettings: (patch: Partial<Settings>) => void
  setSettingsOpen: (open: boolean) => void

  // launch modal
  setLaunchGame: (id: string | null) => void

  // coins
  addCoins: (amount: number) => void

  // toasts
  toast: (kind: ToastKind, message: string, options?: ToastOptions) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  screen: 'lock',
  view: 'home',
  user: null,
  guest: null,

  sessionSeconds: SESSION_LENGTH,
  timerRunning: false,
  sessionExpired: false,

  coins: 1250,
  timeBalanceLabel: '2h 00m',

  cart: [],
  cartOpen: false,

  settings: DEFAULT_SETTINGS,
  settingsOpen: false,

  launchGameId: null,

  toasts: [],

  loginSuccess: (user) =>
    set((s) => ({
      user,
      guest: null,
      screen: 'launcher',
      view: 'home',
      timerRunning: true,
      coins: user.coins ?? s.coins,
    })),

  // Walk-in check-in. A guest has no profile and no coin balance — the bar runs
  // on an open tab instead, so the loyalty economy stays members-only (F6.2).
  guestSuccess: (guest) =>
    set({
      guest,
      user: null,
      screen: 'guest',
      view: 'home',
      timerRunning: true,
      sessionSeconds: SESSION_LENGTH,
      sessionExpired: false,
      coins: 0,
      cart: [],
    }),

  logout: () =>
    set({
      screen: 'lock',
      user: null,
      guest: null,
      timerRunning: false,
      sessionSeconds: SESSION_LENGTH,
      sessionExpired: false,
      cart: [],
      cartOpen: false,
      settingsOpen: false,
      launchGameId: null,
      view: 'home',
    }),

  // Lock PC keeps the session but pauses the timer.
  lockPc: () =>
    set({
      screen: 'lock',
      timerRunning: false,
      settingsOpen: false,
      launchGameId: null,
      cartOpen: false,
    }),

  // Unlocking returns to the surface the session started on, so a guest who
  // locked the station does not come back as a member.
  resumeSession: () =>
    set((s) => ({
      screen: s.guest ? 'guest' : 'launcher',
      timerRunning: s.sessionSeconds > 0,
    })),

  expireSession: () => set({ timerRunning: false, sessionExpired: true }),

  clearExpired: () =>
    set({
      sessionExpired: false,
      screen: 'lock',
      user: null,
      guest: null,
      sessionSeconds: SESSION_LENGTH,
      cart: [],
      view: 'home',
    }),

  // Navigation goes through the surface map so a guest can never land on a
  // member-only section, even from a stale deep link or a keyboard shortcut.
  setView: (view) => set((s) => ({ view: resolveView(surfaceOf(s.screen), view) })),

  tick: () => {
    const { sessionSeconds, timerRunning } = get()
    if (!timerRunning) return
    if (sessionSeconds <= 1) {
      set({ sessionSeconds: 0 })
      get().expireSession()
      return
    }
    set({ sessionSeconds: sessionSeconds - 1 })
  },

  addToCart: (item) =>
    set((s) => {
      const existing = s.cart.find((c) => c.id === item.id)
      const cart = existing
        ? s.cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
        : [...s.cart, { ...item, qty: 1 }]
      return { cart, cartOpen: true }
    }),

  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

  changeQty: (id, delta) =>
    set((s) => ({
      cart: s.cart
        .map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    })),

  clearCart: () => set({ cart: [] }),
  setCartOpen: (open) => set({ cartOpen: open }),

  checkout: () =>
    set((s) => ({
      cart: [],
      cartOpen: false,
      coins: s.coins + 150,
    })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setLaunchGame: (id) => set({ launchGameId: id }),

  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

  toast: (kind, message, options) =>
    set((s) => {
      const next: Toast = {
        id: crypto.randomUUID(),
        kind,
        message,
        title: options?.title,
        duration: options?.duration,
      }
      // Cap the queue at MAX_TOASTS by evicting the oldest entries.
      return { toasts: [...s.toasts, next].slice(-MAX_TOASTS) }
    }),

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}))

export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.price * item.qty, 0)

export const cartCount = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.qty, 0)
