/**
 * Genre → dictionary key, for everything that has to *name* a category (C4.4).
 *
 * The value and the label are deliberately separate. `GameCategory` is data — it
 * travels to `GET /api/games` as a query param and matches rows in the catalogue —
 * and printing that value into the UI is what once left nine English words
 * standing on a Russian screen (C4.1).
 *
 * It lives in `lib/` rather than beside the filter row because two surfaces need
 * the same answer: the row of chips that *selects* a genre and the badge on every
 * card that *states* one. Kept in the view, the card would have had to import from
 * the view that renders it — a cycle — and the alternative, a second hand-written
 * list of the same eight genres, is exactly the setup where the filter says
 * "Королевская битва" and the badge under the cover still says "Battle Royale".
 */
import type { TKey } from '@/lib/i18n/types'
import type { GameCategory } from '@/lib/types/catalog'

/** Ordered for the filter row: `All` first, then the catalogue's own genres. */
export const GAME_CATEGORIES: { value: GameCategory | 'All'; key: TKey }[] = [
  { value: 'All', key: 'games.catAll' },
  { value: 'Shooter', key: 'games.catShooter' },
  { value: 'MOBA', key: 'games.catMoba' },
  { value: 'Battle Royale', key: 'games.catBattleRoyale' },
  { value: 'Sports', key: 'games.catSports' },
  { value: 'Racing', key: 'games.catRacing' },
  { value: 'Strategy', key: 'games.catStrategy' },
  { value: 'MMO', key: 'games.catMmo' },
  { value: 'RPG', key: 'games.catRpg' },
]

/**
 * Lookup form of the same list. Derived, never written out again, so a genre added
 * to the catalogue is one edit and a compile error in three dictionaries rather
 * than a chip and a badge that disagree.
 */
export const CATEGORY_KEYS = Object.fromEntries(
  GAME_CATEGORIES.map((c) => [c.value, c.key]),
) as Record<GameCategory | 'All', TKey>
