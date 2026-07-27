'use client'

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { useT } from '@/lib/i18n/provider'
import { fetchGames, type GameSort } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { Game, GameCategory } from '@/lib/types/catalog'
import { cn } from '@/lib/utils'

const CATEGORIES: (GameCategory | 'All')[] = [
  'All',
  'Shooter',
  'MOBA',
  'Battle Royale',
  'Sports',
  'Racing',
  'Strategy',
  'MMO',
  'RPG',
]

type Sort = 'popularity' | 'az' | 'rating' | 'online'

/** UI sort → the `sort` query param the endpoint understands. */
const SORT_PARAM: Record<Sort, GameSort> = {
  popularity: 'popular',
  az: 'name',
  rating: 'rating',
  // The live counter is a client-side simulation, so the server sorts by
  // popularity and the fluctuating value is applied on top below.
  online: 'popular',
}

export function GamesView() {
  const { t } = useT()
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [sort, setSort] = useState<Sort>('popularity')
  const [players, setPlayers] = useState<Record<string, number>>({})

  // Two composite widgets on this screen (F6.7). The grid is the reason the
  // pattern exists at all: with plain Tab, leaving a full library meant one
  // keypress per remaining title.
  const filtersRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
  const gridRef = useRovingFocus<HTMLDivElement>({ orientation: 'grid' })

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300)
    return () => clearTimeout(t)
  }, [rawQuery])

  // `GET /api/games` — search, category and sort are query params, so the screen
  // never filters the whole library itself (F3.4).
  const library = useApi(
    ['games', query, category, sort],
    () =>
      fetchGames({
        search: query,
        category: category === 'All' ? 'all' : category,
        sort: SORT_PARAM[sort],
      }),
    { keepPreviousData: true },
  )

  const items = useMemo(() => library.data?.items ?? [], [library.data])
  const total = library.data?.total ?? 0

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
    if (sort !== 'online') return items
    return [...items].sort(
      (a, b) => (players[b.id] ?? b.players) - (players[a.id] ?? a.players),
    )
  }, [items, players, sort])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <IconTile icon={icons.games} variant="primary" size="xl" ticks />
          <div>
            <p className="label-mono text-[10px] text-text-low">Library // 02</p>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tighter text-text-high">
              Game Library
            </h2>
            <p className="text-sm text-text-low">{total} titles ready to launch</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass flex flex-1 items-center gap-2 rounded-md px-4 py-2.5 sm:w-64">
            <icons.search size={16} className="text-text-low" />
            <input
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full bg-transparent text-sm text-text-high outline-none placeholder:text-text-low"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="glass rounded-md px-4 py-2.5 text-sm text-text-high outline-none"
          >
            <option value="popularity">Popularity</option>
            <option value="az">A–Z</option>
            <option value="rating">Rating</option>
            <option value="online">Players Online</option>
          </select>
        </div>
      </div>

      {/* Nine filters were nine tab stops on the way to the results. As one
          composite widget they are a single stop, and entering it lands on the
          filter that is actually applied because `aria-pressed` marks it (F6.7). */}
      <div ref={filtersRef} className="flex flex-wrap gap-2" role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            data-roving-item
            className={cn(
              'label-mono rounded-md border px-3.5 py-1.5 text-[10px] transition-all',
              category === c
                ? 'border-primary bg-primary/15 text-primary shadow-[0_0_16px_-6px_rgba(229,53,43,0.8)]'
                : 'border-border bg-white/[0.03] text-text-medium hover:border-border-strong hover:text-text-high',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <DataBoundary
        state={library}
        loading={
          <Grid>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </Grid>
        }
        isEmpty={(page) => page.items.length === 0}
        empty={
          <EmptyState
            icon={icons.games}
            title={t('games.noResults')}
            description={t('games.noResultsBody')}
            actionLabel={
              rawQuery || category !== 'All' ? t('games.clearFilters') : undefined
            }
            onAction={() => {
              setRawQuery('')
              setCategory('All')
            }}
          />
        }
      >
        {() => (
          // One tab stop for the whole library, arrows walk the cards, and the
          // row jump is measured from the rendered layout so it follows the
          // responsive column count (F6.7).
          <Grid ref={gridRef}>
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} players={players[game.id] ?? game.players} />
            ))}
          </Grid>
        )}
      </DataBoundary>
    </div>
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
    <div ref={ref} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  )
}

function GameCard({ game, players }: { game: Game; players: number }) {
  const { t } = useT()
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const prev = useRef(players)
  const rising = players > prev.current
  useEffect(() => {
    prev.current = players
  }, [players])

  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="glass group relative overflow-hidden rounded-lg transition-shadow hover:border-border-strong hover:shadow-[0_0_28px_-8px_rgba(229,53,43,0.5)]"
    >
      <div className="relative">
        <GameCover game={game} className="h-40 w-full" />
        {/* `group-focus-within` is not a nicety here: the launch button — the only
            action on a card — was revealed by hover alone, so a keyboard player
            focused a control they could not see press. The overlay now follows
            focus as well as the pointer. */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
            Play
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <span className="label-mono w-fit rounded-[4px] bg-white/5 px-2 py-0.5 text-[8px] text-text-medium">
          {game.category}
        </span>
        <h3 className="truncate font-display text-sm font-semibold text-text-high">{game.name}</h3>
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
            {players.toLocaleString()}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}
