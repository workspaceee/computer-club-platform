import type { Cents, ID, ISODateTime } from './common'

export type GameCategory =
  | 'Shooter'
  | 'MOBA'
  | 'Battle Royale'
  | 'Sports'
  | 'Racing'
  | 'Strategy'
  | 'MMO'
  | 'RPG'

export interface Game {
  id: ID
  name: string
  category: GameCategory
  rating: number
  players: number
  /** two tailwind color stops for the gradient cover */
  cover: [string, string]
  launcher: string
}

/**
 * `game_accounts` — shared club logins for launchers that need one. Exposed to
 * the player as "House Account #1" so no credentials ever reach the client.
 */
export interface HouseAccount {
  id: ID
  label: string
  status: 'available' | 'in-use'
  linkedUser?: string
}

/** `game_launches` — one row per start, used for playtime stats and quests. */
export interface GameLaunch {
  id: ID
  userId: ID
  gameId: ID
  sessionId: ID
  startedAt: ISODateTime
  endedAt: ISODateTime | null
}

/** `products.category` — drives the tabs of the bar/shop screen. */
export type ProductCategory =
  | 'drinks'
  | 'coffee'
  | 'snacks'
  | 'food'
  | 'combo'
  | 'merch'
  | 'time'
  | 'membership'

/**
 * Bar and merch catalogue entry as the API delivers it: integer cents and a real
 * image path. `ShopItem` below is the legacy UI shape still used by the shop
 * views; it collapses into this once F3.6 lands.
 */
export interface Product {
  id: ID
  clubId: ID
  name: string
  category: ProductCategory
  priceCents: Cents
  description?: string
  /** Marketing badge such as "Popular" — optional and admin-editable. */
  tag?: string
  stock: number
  inStock: boolean
  image: string
}

/** Legacy shop shape: `price` is whole euros. Superseded by `Product` (F3.6). */
export interface ShopItem {
  id: ID
  name: string
  price: number
  tag?: string
  description?: string
}
