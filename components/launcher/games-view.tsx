'use client'

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/ui/dropdown'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { useInstalledGames } from '@/hooks/use-agent'
import { useApi } from '@/hooks/use-api'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { navItem } from '@/lib/launcher-nav'
import { fetchGames, type GameSort } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { Game, GameCategory } from '@/lib/types/catalog'
import { cn } from '@/lib/utils'

/**
 * The filter row: the value the endpoint filters on, plus the key it is *named*
 * by (C4.1).
 *
 * The two are deliberately separate. `GameCategory` is data — it travels to
 * `GET /api/games` as a query param and matches rows in the catalogue — and
 * printing that value into the button is what left nine English words standing
 * on a Russian screen. Pairing each with a dictionary key keeps the query honest
 * and the label translated, and makes the next category added to the catalogue a
 * compile error in three dictionaries rather than silent English.
 */
const CATEGORIES: { value: GameCategory | 'All'; key: TKey }[] = [
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
 * Category → label key, for the badge on each card.
 *
 * Derived from `CATEGORIES` rather than written out again: two hand-kept lists
 * of the same eight genres is the setup where the filter row says
 * "Королевская битва" and the badge under the cover still says "Battle Royale".
 */
const CATEGORY_KEYS = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.key]),
) as Record<GameCategory | 'All', TKey>

type Sort = 'popularity' | 'az' | 'recent' | 'rating' | 'online'

/** Same split for the sort control: stable option value, translated label. */
const SORTS: { id: Sort; key: TKey }[] = [
  { id: 'popularity', key: 'games.sortPopularity' },
  { id: 'az', key: 'games.sortAz' },
  { id: 'recent', key: 'games.sortRecent' },
  { id: 'rating', key: 'games.sortRating' },
  { id: 'online', key: 'games.sortOnline' },
]

/** UI sort → the `sort` query param the endpoint understands. */
const SORT_PARAM: Record<Sort, GameSort> = {
  popularity: 'popular',
  az: 'name',
  // "Recently played" is the member's own launch history, which only the server
  // has: `sortGames` reduces `game_launches` to a last-played timestamp per
  // title. The client has never seen that table and must not learn to.
  recent: 'recent',
  rating: 'rating',
  // The live counter is a client-side simulation, so the server sorts by
  // popularity and the fluctuating value is applied on top below.
  online: 'popular',
}

/**
 * The three state filters beside the genres (C4.2).
 *
 * `installed` is the odd one out and the row is built so it can be: the club
 * server answers the other two as query params, while "is it on *this* disk"
 * belongs to the station agent — so the chip is dropped entirely on a seat whose
 * agent never answered, rather than offered and matching nothing (F5.4).
 */
type StateFilter = 'installed' | 'houseAccount' | 'friends'

const STATE_FILTERS: { id: StateFilter; key: TKey; hint: TKey }[] = [
  { id: 'installed', key: 'games.filterInstalled', hint: 'games.filterInstalledHint' },
  { id: 'houseAccount', key: 'games.filterHouseAccount', hint: 'games.filterHouseAccountHint' },
  { id: 'friends', key: 'games.filterFriends', hint: 'games.filterFriendsHint' },
]

/**
 * One chip look for both filter rows.
 *
 * Extracted when the second row arrived, not before: two copies of the same six
 * classes is how the genre pills and the state pills end up a pixel of padding
 * apart, and two rows of chips that *nearly* match read as a mistake rather than
 * a grouping. The applied state stays T3 (§4.4) — border, tint and colour, no
 * bloom of its own, because this screen's T1 belongs to the launch button and an
 * accent in two places is an accent in neither.
 */
const CHIP = 'label-mono rounded-md border px-3.5 py-1.5 text-[10px] transition-all'
const CHIP_ON = 'border-primary bg-primary/15 text-primary'
const CHIP_OFF =
  'border-border bg-white/[0.03] text-text-medium hover:border-border-strong hover:text-text-high'

export function GamesView() {
  const { t, tp } = useT()
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GameCategory | 'All'>('All')
  const [sort, setSort] = useState<Sort>('popularity')
  const [players, setPlayers] = useState<Record<string, number>>({})
  // The three toggles are independent, so they are a set and not one more
  // single-choice row: "ready to play, and a friend is in it" is the question
  // someone with twenty minutes left actually asks.
  const [states, setStates] = useState<Set<StateFilter>>(new Set())
  const on = (id: StateFilter) => states.has(id)
  const toggleState = (id: StateFilter) =>
    setStates((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  // What this seat can actually start (C4.2). `known` is false while the
  // handshake runs and on a seat with no agent — the filter is not offered then.
  const installed = useInstalledGames()
  const installedOnly = installed.known && on('installed')

  // Three composite widgets on this screen (F6.7). The grid is the reason the
  // pattern exists at all: with plain Tab, leaving a full library meant one
  // keypress per remaining title.
  const filtersRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
  const statesRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
  const gridRef = useRovingFocus<HTMLDivElement>({ orientation: 'grid' })

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300)
    return () => clearTimeout(t)
  }, [rawQuery])

  // `GET /api/games` — search, category and sort are query params, so the screen
  // never filters the whole library itself (F3.4).
  const library = useApi(
    // Both server filters are part of the cache key: without them the page for
    // "needs a club account" and the page for the whole shelf would share one
    // entry, and toggling a chip would show whichever answered last.
    ['games', query, category, sort, on('houseAccount'), on('friends')],
    () =>
      fetchGames({
        search: query,
        category: category === 'All' ? 'all' : category,
        sort: SORT_PARAM[sort],
        needsHouseAccount: on('houseAccount'),
        friendsPlaying: on('friends'),
      }),
    { keepPreviousData: true },
  )

  const items = useMemo(() => library.data?.items ?? [], [library.data])

  // Seed a live counter for every title the endpoint returned.
  useEffect(() => {
    if (items.length === 0) return
    setPlayers((prev) => {
      const next = { ...prev }
      let added = false
      for (const g of items) {
        if (next[g.id] === undefined) {
          next[g.id] = g.players
          added = true
        }
      }
      return added ? next : prev
    })
  }, [items])

  // live player counters fluctuate every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setPlayers((prev) => {
        const next: Record<string, number> = {}
        for (const [id, value] of Object.entries(prev)) {
          next[id] = Math.max(50, value + Math.floor(Math.random() * 21) - 10)
        }
        return next
      })
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() => {
    // The one filter applied to the page instead of asked for: disk state comes
    // from the agent, and `GET /api/games` cannot answer for a machine it has
    // never seen (see `useInstalledGames`). Safe to narrow here only because the
    // library is unpaginated — the endpoint returns the whole shelf, so nothing
    // that matches is left on a page this screen never fetched.
    const shelf = installedOnly ? items.filter((g) => installed.ids.has(g.id)) : items
    if (sort !== 'online') return shelf
    return [...shelf].sort(
      (a, b) => (players[b.id] ?? b.players) - (players[a.id] ?? a.players),
    )
  }, [items, players, sort, installedOnly, installed.ids])

  // Any filter on at all — drives the "Clear filters" action in the empty state,
  // which must not offer to clear a search box and a genre row that are already
  // clear just because a toggle emptied the grid.
  const anyFilter = rawQuery !== '' || category !== 'All' || states.size > 0
  const clearFilters = () => {
    setRawQuery('')
    setCategory('All')
    setStates(new Set())
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="section-games">
      {/* The numbered `SectionHeader` (§5), not a hand-built title block: the
          library used to paint its own "Games // 02" out of a mono label and a
          2xl heading, which is the same header every other screen has — only
          drifting. One component means the section number comes from
          `LAUNCHER_NAV` (so it can never disagree with the top bar) and the rule
          under the title is the same hairline everywhere.
          `as="h1"`: the view *is* the page inside the shell, and it names the
          region through `headingId`. */}
      <SectionHeader
        index={navItem('games').index}
        headingId="section-games"
        as="h1"
        className="mb-0"
        title={t('games.title')}
        // The count is the library's own readout, so it is stated only once the
        // endpoint has answered: "0 titles ready to launch" under a grid of
        // skeletons is a wrong number, not a loading state.
        // Counts what is on screen, so it counts `filtered`: `total` is the
        // endpoint's answer and would keep claiming 67 titles under a grid the
        // "Ready to play" chip has cut to nine.
        subtitle={
          library.data ? tp('games.libraryCount', filtered.length) : t('games.subtitle')
        }
      />

      {/* Search and sort ride with the filters rather than in the header's
          `action` slot: the slot is `shrink-0` next to the title, so on a 390px
          phone the input and the select were pushed off the right edge — the
          sort control was simply not reachable. Below the header they get the
          full width and stack, and from `sm` they sit opposite the genre row the
          way they did on the desktop kiosk. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {/* Nine filters were nine tab stops on the way to the results. As one
              composite widget they are a single stop, and entering it lands on the
              filter that is actually applied because `aria-pressed` marks it (F6.7). */}
          <div
            ref={filtersRef}
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('games.categoryFilter')}
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                data-roving-item
                className={cn(CHIP, category === c.value ? CHIP_ON : CHIP_OFF)}
              >
                {t(c.key)}
              </button>
            ))}
          </div>

          {/* The state row is a second group, not more chips in the first: genre
              is one choice out of nine, these are three independent switches, and
              arrow keys that walked from "RPG" into "Friends playing" would be
              walking across that seam. Separate `role="group"`, separate roving
              stop, own label. */}
          <div
            ref={statesRef}
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('games.stateFilter')}
          >
            {STATE_FILTERS.map((f) => {
              // No agent, no honest answer — so the chip is absent rather than
              // present and matching nothing (F5.4).
              if (f.id === 'installed' && !installed.known) return null
              const active = on(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleState(f.id)}
                  aria-pressed={active}
                  title={t(f.hint)}
                  data-roving-item
                  className={cn(
                    CHIP,
                    'inline-flex items-center gap-1.5',
                    active ? CHIP_ON : CHIP_OFF,
                  )}
                >
                  {/* The glyph is the *only* thing these chips add over a genre:
                      three switches that can all be on at once need a mark that
                      survives being read at a glance next to a tinted genre pill.
                      `icons.check` is the product's "this option is chosen". */}
                  {active && <icons.check size={11} aria-hidden />}
                  {t(f.key)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Two controls, one row — but only from `sm`. Sharing a 390px row meant
            the search field gave up whatever the fixed-width sort control did not
            take, and at the narrow end its placeholder was clipped to "Поис"
            while the sort trigger next to it truncated its own label: two half-
            readable controls instead of one of each. Below `sm` they stack and
            each takes the full width, which is also the only way the sort
            trigger can state a Russian option in full. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0">
          <div className="glass flex min-w-0 items-center gap-2 rounded-md px-3.5 py-2 sm:w-56">
            <icons.search size={16} className="shrink-0 text-text-low" aria-hidden />
            <input
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder={t('games.searchPlaceholder')}
              aria-label={t('games.searchPlaceholder')}
              className="w-full min-w-0 bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
            />
          </div>
          {/* The product's own listbox, not a native `<select>` (C4.2).
              The trigger was already a glass plate; the list that dropped out of
              it was the operating system's — grey rows, its own font, its own
              blue selection — two centimetres from a row of filter chips marked
              in the brand red. `Dropdown` draws the open panel from the same
              `glass-strong` the avatar menu uses and marks the applied row the
              way an applied chip is marked, so the whole filter row is one
              control surface whether it is open or shut.
              `panelWidth="auto"` is the default and is load-bearing here: from
              `sm` the trigger is a fixed width in a row that also holds the
              search field, but the *panel* must fit its longest label. Pinning it to the
              trigger cut three of the five Russian options mid-word ("По
              популярнос…", "По игрокам он…") — a list of sorts the player cannot
              read is worse than the OS panel this replaced. The trigger alone
              still truncates, which is correct: it states a choice already made,
              and the full text is one press away. */}
          <Dropdown
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            label={t('games.sortLabel')}
            icon={<icons.sort size={15} />}
            align="end"
            className="w-full sm:w-48 sm:shrink-0"
            options={SORTS.map((s) => ({ value: s.id, label: t(s.key) }))}
          />
        </div>
      </div>

      <DataBoundary
        state={library}
        loading={
          <Grid>
            {/* One skeleton per card, built from the same two blocks as the real
                card — a 16:9 cover plus the copy strip — so the grid does not
                resize under the player when the library answers. A single
                `h-64` plate here was a different height from the card it stood
                in for, which is a layout shift the moment data lands. */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass overflow-hidden rounded-lg">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex flex-col gap-1.5 p-3">
                  <Skeleton className="h-3 w-14 rounded-[4px]" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </Grid>
        }
        // `filtered`, not `page.items`: "Ready to play" narrows the answered page
        // on the client, so a shelf of 67 titles none of which are on this disk is
        // a page the endpoint filled and an empty grid — the boundary has to be
        // told about the row it cannot see.
        isEmpty={() => filtered.length === 0}
        empty={
          <EmptyState
            icon={icons.games}
            title={t('games.noResults')}
            description={t('games.noResultsBody')}
            // Offered only when something is actually on, and it clears all three
            // rows: after C4.2 the grid can be empty with the search box blank and
            // every genre showing, so a button that reset only those two would
            // leave the player looking at the same empty grid.
            actionLabel={anyFilter ? t('games.clearFilters') : undefined}
            onAction={clearFilters}
          />
        }
      >
        {() => (
          // One tab stop for the whole library, arrows walk the cards, and the
          // row jump is measured from the rendered layout so it follows the
          // responsive column count (F6.7).
          <Grid ref={gridRef}>
            {filtered.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                players={players[game.id] ?? game.players}
                // The debounced `query`, not `rawQuery`: the highlight has to
                // mark the term these results were actually fetched for,
                // otherwise mid-typing it underlines a substring of a title the
                // server has not filtered on yet.
                query={query}
              />
            ))}
          </Grid>
        )}
      </DataBoundary>
    </section>
  )
}

/**
 * `ref` is forwarded because only the *results* grid is a composite widget — the
 * skeleton variant holds no focusable items, so attaching the roving hook to it
 * would leave the group empty while the library loads.
 */
function Grid({
  children,
  ref,
}: {
  children: React.ReactNode
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      // Five columns on the widest breakpoint because the target hardware is a
      // club station, not a laptop: at 2560px a four-column library stretched
      // each cover past the 800px the generated artwork actually ships, so the
      // grid was upscaling every tile it drew.
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
    >
      {children}
    </div>
  )
}

/**
 * Marks the searched term inside a title (C4.3).
 *
 * Plain substring matching on a case-folded copy, and the slice comes out of the
 * *original* string — replacing the matched text with the query itself would
 * reprint "elden ring" in the player's own casing over the catalogue's
 * "Elden Ring". No regex either: titles carry `:`, `.` and `(` and a player
 * typing "PUBG:" would otherwise build an invalid pattern out of their own input.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim()
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      {/* `mark` for the meaning, restyled because the UA default is a black-on-
          yellow block that belongs to no palette here. The term is stated in the
          brand red over a faint wash of it — the same "this is what you asked
          for" colour the active filter uses. */}
      <mark className="rounded-[2px] bg-primary/20 text-primary">
        {text.slice(at, at + term.length)}
      </mark>
      {text.slice(at + term.length)}
    </>
  )
}

function GameCard({
  game,
  players,
  query,
}: {
  game: Game
  players: number
  query: string
}) {
  const { t, formatNumber } = useT()
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const prev = useRef(players)
  const rising = players > prev.current
  useEffect(() => {
    prev.current = players
  }, [players])

  return (
    <motion.div
      whileHover={{ y: -6 }}
      // Lifting the card used to add a second red bloom directly under the
      // launch button's own halo, so the hovered tile glowed twice for one
      // action. The raise is depth now — a black elevation shadow, the same
      // language every other floating surface uses — and the red is left to the
      // control (§4.4).
      className="glass group relative overflow-hidden rounded-lg transition-shadow hover:border-border-strong hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)]"
    >
      {/* `aspect-video`, not a fixed height: the covers are generated at 800×450,
          so a 16:9 box is the one shape that neither crops the art nor
          letterboxes it, and it holds its own space before the file decodes —
          the tile reserves its slot in the grid whether the image arrives,
          arrives late, or never arrives at all. */}
      <GameCover
        game={game}
        className="aspect-video w-full"
        // The card writes the name into its own copy strip three lines down, so
        // the cover's built-in caption printed it twice per tile —
        // "CIVILIZATION VII" burned across the art with "Civilization VII"
        // directly beneath it. `hideTitle` is the documented way out: this
        // caller owns the heading, the cover stays pure art.
        hideTitle
        // Mirrors the breakpoints of `Grid` above — in pixels at the top end,
        // not `20vw`, because the shell caps its content at `max-w-6xl`: past
        // ~1150px the column stops growing with the window, so a tile on the
        // club's 2560px display is ~205px wide and not the 512px `20vw` claims.
        // Wrong `sizes` is not a cosmetic bug — it makes the browser pick a
        // candidate for a width the tile never has, and the station downloads a
        // 2× file for every one of 67 covers.
        sizes="(min-width: 1536px) 210px, (min-width: 1024px) 265px, (min-width: 640px) 33vw, 50vw"
      />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="label-mono shrink-0 rounded-[4px] bg-white/5 px-2 py-0.5 text-[8px] text-text-medium">
            {t(CATEGORY_KEYS[game.category])}
          </span>
          {/* Which launcher the title starts through (C4.4) — the club runs Steam,
              Epic, Riot and Battle.net side by side, and it decides whether a
              start needs a house account at all, so it belongs on the tile and
              not only in the launch modal.
              Printed verbatim from the catalogue and never translated: these are
              product names, the same rule the club's own copy follows (F2.2).
              `title` because a 2-column phone truncates "Battle.net". */}
          <span
            className="label-mono truncate text-[8px] text-text-low"
            title={game.launcher}
          >
            {game.launcher}
          </span>
        </div>
        <h3 className="truncate font-display text-sm font-semibold text-text-high">
          <Highlight text={game.name} query={query} />
        </h3>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-warning">
            <icons.rating size={12} fill="currentColor" />
            {game.rating.toFixed(1)}
          </span>
          <motion.span
            key={players}
            initial={{ color: rising ? 'var(--success)' : 'var(--text-low)' }}
            animate={{ color: 'var(--text-medium)' }}
            transition={{ duration: 1 }}
            className="flex items-center gap-1 tabular-nums"
          >
            <icons.community size={12} />
            {/* `formatNumber`, not `toLocaleString()`: the latter groups by the
                *browser's* locale, so a station whose Chrome is English printed
                "1,204" under a Russian interface. The provider's formatter
                follows the session language like every other number in the
                shell. */}
            {formatNumber(players)}
          </motion.span>
        </div>
      </div>
      {/* `group-focus-within` is not a nicety here: the launch button — the only
          action on a card — was revealed by hover alone, so a keyboard player
          focused a control they could not see press. The overlay now follows
          focus as well as the pointer. */}
      {/* Spans the whole card, not just the cover. Scoped to the art, the bottom
          third of every tile — the strip carrying the name, the rating and the
          live counter, i.e. the part a player reads before deciding — was a dead
          zone that dismissed the only action on the card the moment the pointer
          reached it. */}
      {/* `scrim` (§3.3): the tile is darkened so a raised control on top of it
          reads — the same job a modal backdrop does, so the same depth. */}
      {/* `pointer-events-none` while it is invisible, `auto` once it is shown: at
          `opacity-0` the layer is still a layer, so an untouched tile had a
          transparent sheet over its whole face swallowing every click and
          text selection. It only becomes a surface when it is actually visible —
          and because the trigger is `group-hover`, the same pointer that reveals
          it is the one that then reaches the button. */}
      <div className="scrim pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 backdrop-blur-[2px] transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <button
          onClick={() => setLaunchGame(game.id)}
          // The card carries the title, but a button announcing just "Play"
          // repeats itself sixty times in the accessibility tree.
          aria-label={`${t('games.launch')} ${game.name}`}
          // The card is the roving item, via its only control (F6.7).
          data-roving-item
          className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_24px_-4px_rgba(229,53,43,0.9)] transition-transform hover:scale-105"
        >
          <icons.play size={15} fill="currentColor" />
          {t('games.launch')}
        </button>
      </div>
    </motion.div>
  )
}
