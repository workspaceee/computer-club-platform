/**
 * `loyalty` slice (F6.1) — the coin economy shown to members.
 *
 * Playable time is deliberately *not* here: F6.3 made it a derivation of the
 * session anchors, so there is no second copy of the clock for a label to drift
 * away from.
 *
 * The economy lives here and only here. Before the split, checkout granted coins
 * inline inside the cart, which meant the reward rate was defined by a magic
 * number in a shopping action; now the cart asks this slice to credit an award
 * and cannot invent a rate of its own.
 */
import type { SliceCreator } from '../types'

/** Coins credited for a bar order. Mock economy until C7 wires the wallet. */
export const CHECKOUT_AWARD_COINS = 150

export interface LoyaltySlice {
  coins: number

  addCoins: (amount: number) => void
  setCoins: (amount: number) => void
  /** Guests and free stations have no balance — 0 is the truth, not a placeholder. */
  clearWallet: () => void
}

export const createLoyaltySlice: SliceCreator<LoyaltySlice> = (set) => ({
  coins: 0,

  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
  setCoins: (amount) => set({ coins: amount }),
  clearWallet: () => set({ coins: 0 }),
})
