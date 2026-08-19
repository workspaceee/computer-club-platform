import type { Cents, ID, ISODateTime, Minutes } from './common'

export type GameCategory =
  | 'Shooter'
  | 'MOBA'
  | 'Battle Royale'
  | 'Sports'
  | 'Racing'
  | 'Strategy'
  | 'MMO'
  | 'RPG'

/**
 * Every launcher the club starts titles through (C4.4).
 *
 * A union and not `string`, because the value is *printed on the card* and read
 * by the rule that decides whether a start needs one of the club's own logins
 * (`HOUSE_ACCOUNT_LAUNCHERS`). As a free-form string, a seed row typed `Battle.Net`
 * or `Riot Games` stayed valid, silently landed outside that set, and the title
 * quietly became one nobody has to sign in for — a wrong badge and a wrong launch
 * path from one typo. Names are product names and travel verbatim, never through
 * the dictionaries (F2.2).
 */
export type GameLauncher =
  | 'Steam'
  | 'Epic'
  | 'Riot'
  | 'Battle.net'
  | 'EA App'
  | 'Ubisoft'
  | 'Rockstar'
  | 'GOG'
  | 'Xbox'
  | 'Mojang'
  | 'Square Enix'
  | 'BSG'
  | 'Gaijin'
  | 'Wargaming'

export interface Game {
  id: ID
  name: string
  category: GameCategory
  rating: number
  /**
   * Lifetime starts of this title **inside this club** — the popularity figure
   * `sort=popular` orders by.
   *
   * Emphatically not "playing right now": the club has forty seats and this
   * number runs into the thousands. How many people are in a title at this
   * moment is presence, not catalogue, and is answered by
   * `fetchGamePresence()` (C4.4) — which is also why nothing may print this
   * field next to a live-looking dot.
   */
  players: number
  /** two tailwind color stops for the gradient cover */
  cover: [string, string]
  launcher: GameLauncher
  /**
   * Does starting this title need one of the club's shared logins (C4.2)?
   *
   * A catalogue fact, not a launcher one, which is why it is a field and not
   * `LAUNCHER_NEEDS_ACCOUNT[game.launcher]` in the view: two Steam titles can
   * differ — one runs off the club's café licence, the next needs a publisher
   * account of its own — and the club decides that per game when it puts the
   * title on the disks. Derived in the UI it would also be derived *differently*
   * in the library, the launch dialog (C4.7) and the counter's screen.
   *
   * It is deliberately not the `HouseAccount` row: which of the pool a player
   * gets is availability the server owns at launch time. This only says whether
   * the question will be asked at all.
   */
  needsHouseAccount: boolean
}

/**
 * `game_releases` — the club's "new at the club" shelf (C3.9).
 *
 * A curated table rather than an `addedAt` column on `Game`: what counts as a
 * novelty is an editorial decision the staff makes, not a fact derivable from the
 * catalogue — which is why it is a table they can edit at all. A title
 * installed on the machines in March can be *new to this club* in June when it
 * finally gets a seat in the hall, and a re-release the club wants to shout about
 * has no new row to stamp at all.
 *
 * `note` is the club's own one-line reason for the shelf ("Now on all VIP seats"),
 * printed as written like tournament and product copy is (F2.2) — the hero frames
 * it, it does not rewrite it.
 */
export interface GameRelease {
  gameId: ID
  /** When the club put it on the shelf — newest first, and nothing else. */
  addedAt: ISODateTime
  note: string
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
 * What the shop has to know about a *time* pass to talk about closing (C2.11).
 *
 * The grid must answer "does this pass outlast the club's day" without knowing
 * what a night pass is, so both facts travel as data rather than being
 * recognised from an id or a name. `fetchShopTime` fills this in from the `Pass`
 * row; every other tab leaves it undefined.
 */
export interface TimePassMeta {
  /** Everything the pass grants, bonus minutes included. */
  minutes: Minutes
  /**
   * The pass is *sold* to cross closing, so a "runs past closing" note on it
   * would be nonsense. True for a windowed pass — a night pass is `22:00`–`08:00`
   * precisely because it spans the club's own edge — and for unlimited-in-window.
   */
  crossesClosing: boolean
}

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
  /**
   * Set only on rows that sell *time* (C2.11) — see `TimePassMeta`. Undefined on
   * a drink, and that absence is what keeps the closing notice off cards it
   * would be meaningless on.
   */
  time?: TimePassMeta
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
