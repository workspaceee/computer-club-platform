import type { SliceCreator } from '../types'

/** Coins granted by a completed checkout (placeholder until B-stage billing). */
export const CHECKOUT_REWARD_COINS = 150

export interface LoyaltySlice {
  coins: number
  addCoins: (amount: number) => void
}

export const loyaltyInitialState = {
  coins: 1250,
} satisfies Pick<LoyaltySlice, 'coins'>

export const createLoyaltySlice: SliceCreator<LoyaltySlice> = (set) => ({
  ...loyaltyInitialState,

  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
})
