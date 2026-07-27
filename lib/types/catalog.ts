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
 * Everything the shop grid needs from anything sellable (F7.2).
 *
 * The grid has three tabs backed by two different tables — `products` for the
 * bar, the kitchen, merch and memberships, `passes` for gaming time — so it
 * needs one shape both can present as. `Product` *is* one of these, so the bar
 * tabs pass their rows straight through; `fetchShopTime` maps a `Pass` into one.
 *
 * This replaces the old `ShopItem`, which carried whole euros and no image and
 * was therefore the reason the artwork under `public/products/` was fetched by
 * nothing: the grid rendered a `lucide` glyph because its data had nowhere to
 * put a file path. Cents stay authoritative all the way to the card (F3.6).
 */
export interface ShopEntry {
  id: ID
  name: string
  category: ProductCategory
  priceCents: Cents
  description?: string
  /** Marketing badge such as "Popular" — optional and admin-editable. */
  tag?: string
  inStock: boolean
  /**
   * `/products/<id>.webp`, or `''` for a category that ships no photography
   * (time passes, memberships). Empty means "draw the category icon" — it is a
   * real state, not a missing asset, so the card must not request a file for it.
   */
  image: string
}

/** Bar and merch catalogue row as the API delivers it. */
export interface Product extends ShopEntry {
  clubId: ID
  stock: number
}
