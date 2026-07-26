import type { ShopItem } from '@/lib/types/catalog'
import type { CartItem } from '@/lib/types/order'

import type { SliceCreator } from '../types'
import { CHECKOUT_REWARD_COINS } from './loyalty'

export interface CartSlice {
  cart: CartItem[]
  cartOpen: boolean

  addToCart: (item: ShopItem) => void
  removeFromCart: (id: string) => void
  changeQty: (id: string, delta: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  checkout: () => void
}

export const cartInitialState = {
  cart: [],
  cartOpen: false,
} satisfies Pick<CartSlice, 'cart' | 'cartOpen'>

/** An emptied, closed cart — shared by logout and by a finished checkout. */
export const cartResetState = cartInitialState

export const createCartSlice: SliceCreator<CartSlice> = (set) => ({
  ...cartInitialState,

  // Adding an item opens the drawer so the change is never silent.
  addToCart: (item) =>
    set((s) => {
      const existing = s.cart.find((c) => c.id === item.id)
      const cart = existing
        ? s.cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
        : [...s.cart, { ...item, qty: 1 }]
      return { cart, cartOpen: true }
    }),

  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

  // Quantity can never go below one: hitting zero removes the line.
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
      ...cartResetState,
      coins: s.coins + CHECKOUT_REWARD_COINS,
    })),
})

export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.price * item.qty, 0)

export const cartCount = (cart: CartItem[]) => cart.reduce((sum, item) => sum + item.qty, 0)
