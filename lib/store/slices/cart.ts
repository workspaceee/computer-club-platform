/**
 * `cart` slice (F6.1) — bar order in progress.
 */
import type { ShopEntry } from '@/lib/types/catalog'
import type { CartItem } from '@/lib/types/order'
import type { SliceCreator } from '../types'
import { CHECKOUT_AWARD_COINS } from './loyalty'

export interface CartSlice {
  cart: CartItem[]

  /** Takes a catalogue row whole, so the basket keeps the price in cents and
   *  the image the drawer draws its thumbnail from. */
  addToCart: (item: ShopEntry) => void
  removeFromCart: (id: string) => void
  changeQty: (id: string, delta: number) => void
  clearCart: () => void
  checkout: () => void
}

export const createCartSlice: SliceCreator<CartSlice> = (set, get) => ({
  cart: [],

  addToCart: (item) => {
    set((s) => {
      const existing = s.cart.find((c) => c.id === item.id)
      return {
        cart: existing
          ? s.cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
          : [...s.cart, { ...item, qty: 1 }],
      }
    })
    get().setCartOpen(true)
  },

  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

  changeQty: (id, delta) =>
    set((s) => ({
      cart: s.cart
        .map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    })),

  clearCart: () => set({ cart: [] }),

  checkout: () => {
    // A guest has no wallet, so an order earns them nothing — crediting coins
    // here would create a balance the guest surface deliberately never shows.
    const earnsCoins = get().guest === null
    set({ cart: [] })
    get().setCartOpen(false)
    if (earnsCoins) get().addCoins(CHECKOUT_AWARD_COINS)
  },
})
