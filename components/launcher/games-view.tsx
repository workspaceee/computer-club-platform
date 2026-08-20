'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCard } from '@/components/launcher/game-card'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/ui/dropdown'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { useInstalledGames } from '@/hooks/use-agent'
import { useApi } from '@/hooks/use-api'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { GAME_CATEGORIES } from '@/lib/game-labels'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { navItem } from '@/lib/launcher-nav'
import { fetchGamePresence, fetchGames, type GameSort } from '@/lib/mock/api'
import { FLOOR_REFRESH_MS } from '@/lib/presence'
import type { GameCategory } from '@/lib/types/catalog'
import { cn } from '@/lib/utils'

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
  // "By players in the club" has no `sort` of its own: presence is a separate read
  // (`fetchGamePresence`) and the endpoint would have to join it per request. The
  // server hands back the shelf ordered by popularity — a stable tiebreak for the
  // sixty titles nobody is in — and `filtered` re-orders it by the presence map
  // below. Legal for the same reason the local search pass is: the library is
  // unpaginated, so nothing that would sort to the top is on a page never fetched.
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

  // Held so clearing the term — by the × or by Escape — leaves the caret where
  // the next term is typed instead of dropping focus on the body.
  const searchRef = useRef<HTMLInputElement>(null)

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

  /**
   * Who is in what, **in the hall**, right now (C4.4).
   *
   * This read is the whole reason the card's counter is trustworthy. What stood
   * here before was `Game.players` — a lifetime play count in the thousands —
   * seeded into local state and nudged by ±10 every five seconds, so a forty-seat
   * club showed "1 204 playing" under a `Users` glyph and showed it *moving*. Two
   * orders of magnitude wrong, and animated.
   *
   * One request for the whole shelf, not one per tile: presence is a single sparse
   * map keyed by game id, so sixty cards cost one fetch.
   *
   * Keyed under the `social` family on purpose — that is what makes a pushed
   * `session.moved` (somebody changed seats) revalidate it without a subscription
   * of its own (`EVENT_INVALIDATES`), and `FLOOR_REFRESH_MS` is the same cadence
   * the "Club now" card reads the floor with, because both are readings of the
   * same seated players.
   *
   * Not keyed to the member: the answer is the room's, identical for whoever is
   * signed in, so a sign-out must not throw it away.
   */
  const presence = useApi(['social/game-presence'], fetchGamePresence, {
    refreshInterval: FLOOR_REFRESH_MS,
    keepPreviousData: true,
  })
  // `?? {}` and never a loading state of its own: the grid must not wait on the
  // counter, and a title with nobody in it renders exactly like a title the
  // presence read has not answered for yet — no chip at all. Memoised because the
  // sort below depends on it, and a fresh `{}` every render would re-sort the
  // whole shelf on every keystroke while the read is still in flight.
  const inClub = useMemo(() => presence.data ?? {}, [presence.data])

  const filtered = useMemo(() => {
    // The one filter applied to the page instead of asked for: disk state comes
    // from the agent, and `GET /api/games` cannot answer for a machine it has
    // never seen (see `useInstalledGames`). Safe to narrow here only because the
    // library is unpaginated — the endpoint returns the whole shelf, so nothing
    // that matches is left on a page this screen never fetched.
    let shelf = installedOnly ? items.filter((g) => installed.ids.has(g.id)) : items

    // The "instant" half of C4.3, and the reason the debounce above can stay.
    // The endpoint is still the search — it owns the shelf — but between a
    // keystroke and its answer sit 300ms of debounce plus the mock's latency,
    // and for that beat the grid showed titles the player had already typed
    // past. Re-applying the *current* term to the shelf on every render closes
    // that gap: the same substring rule `fetchGames` uses (`needle` on a
    // case-folded name), so the local pass can only ever narrow to a subset of
    // what the server is about to return — never show a row the server would
    // have excluded, and never hide one it keeps. Legal for the same reason the
    // installed filter is: the shelf is the whole library, unpaginated.
    const needle = rawQuery.trim().toLowerCase()
    if (needle) shelf = shelf.filter((g) => g.name.toLowerCase().includes(needle))

    // "By players in the club" is ordered here rather than by the endpoint (see
    // `SORT_PARAM`): presence is its own read, and the server's `popular` order is
    // what breaks the tie between the many titles nobody is in.
    if (sort !== 'online') return shelf
    return [...shelf].sort((a, b) => (inClub[b.id] ?? 0) - (inClub[a.id] ?? 0))
  }, [items, inClub, sort, installedOnly, installed.ids, rawQuery])

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
        // Wrapped in a live region rather than printed as plain text (C4.3):
        // the count is the only thing on screen that answers "did my typing
        // find anything", and a player who cannot see the grid narrow was
        // typing into silence. `polite` so it waits for a pause in the
        // keystrokes instead of interrupting every letter, and the whole
        // sentence is inside the region because a number read on its own is not
        // an answer.
        subtitle={
          <span role="status" aria-live="polite">
            {library.data ? tp('games.libraryCount', filtered.length) : t('games.subtitle')}
          </span>
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
            {GAME_CATEGORIES.map((c) => (
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
              ref={searchRef}
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              // Escape empties the field and keeps the caret in it — the
              // shortcut every search box on the platform has, and the one a
              // player reaches for before hunting a small button with the mouse.
              // `stopPropagation` because this view is rendered inside the
              // shell: an unhandled Escape here travels up to whatever overlay
              // is listening and closing a panel is not what clearing a search
              // should do.
              onKeyDown={(e) => {
                if (e.key !== 'Escape' || rawQuery === '') return
                e.stopPropagation()
                setRawQuery('')
              }}
              placeholder={t('games.searchPlaceholder')}
              aria-label={t('games.searchPlaceholder')}
              className="w-full min-w-0 bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
            />
            {/* Present only while there is something to clear: a permanent × on
                an empty field is a control that does nothing, and it sat where
                the placeholder ends. Focus returns to the input rather than
                being dropped on the body — the player clears a term to type
                another one. */}
            {rawQuery !== '' && (
              <button
                onClick={() => {
                  setRawQuery('')
                  searchRef.current?.focus()
                }}
                aria-label={t('games.searchClear')}
                title={t('games.searchClear')}
                className="shrink-0 rounded-[4px] p-0.5 text-text-low transition-colors hover:text-text-high"
              >
                <icons.close size={14} aria-hidden />
              </button>
            )}
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
                // The seated count from `fetchGamePresence`, defaulted to zero —
                // never `game.players`, which is the catalogue's lifetime tally
                // and belongs to a different sentence entirely.
                playersInClub={inClub[game.id] ?? 0}
                // `rawQuery`, not the debounced `query`: the grid is narrowed by
                // the live term (see `filtered`), so marking the debounced one
                // meant every row on screen already matched what the player had
                // typed while the mark still underlined the term from 300ms ago
                // — a title kept for "stri" with only "str" lit inside it. The
                // two are now the same term, which is the whole point of the
                // local pass.
                query={rawQuery}
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

