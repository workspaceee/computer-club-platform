'use client'

import { motion } from 'framer-motion'
import { Gamepad2, Play, Search, Star, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GameCover } from '@/components/game-cover'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { GAMES } from '@/lib/mock/data'
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

export function GamesView() {
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [sort, setSort] = useState<Sort>('popularity')
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Record<string, number>>(() =>
    Object.fromEntries(GAMES.map((g) => [g.id, g.players])),
  )

  // simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300)
    return () => clearTimeout(t)
  }, [rawQuery])

  // live player counters fluctuate every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setPlayers((prev) => {
        const next = { ...prev }
        for (const g of GAMES) {
          const delta = Math.floor(Math.random() * 21) - 10
          next[g.id] = Math.max(50, next[g.id] + delta)
        }
        return next
      })
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() => {
    let list = GAMES.filter(
      (g) =>
        (category === 'All' || g.category === category) &&
        g.name.toLowerCase().includes(query.toLowerCase()),
    )
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'az':
          return a.name.localeCompare(b.name)
        case 'rating':
          return b.rating - a.rating
        case 'online':
          return (players[b.id] ?? 0) - (players[a.id] ?? 0)
        default:
          return b.players - a.players
      }
    })
    return list
  }, [category, query, sort, players])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <IconTile icon={Gamepad2} variant="primary" size="xl" ticks />
          <div>
            <p className="label-mono text-[10px] text-text-low">Library // 02</p>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tighter text-text-high">
              Game Library
            </h2>
            <p className="text-sm text-text-low">{GAMES.length} titles ready to launch</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass flex flex-1 items-center gap-2 rounded-md px-4 py-2.5 sm:w-64">
            <Search size={16} className="text-text-low" />
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

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
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

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-xl py-16 text-center">
          <p className="font-display text-lg font-bold text-text-high">No games found</p>
          <p className="text-sm text-text-medium">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} players={players[game.id] ?? game.players} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameCard({ game, players }: { game: Game; players: number }) {
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setLaunchGame(game.id)}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_24px_-4px_rgba(229,53,43,0.9)] transition-transform hover:scale-105"
          >
            <Play size={15} fill="currentColor" />
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
            <Star size={12} fill="currentColor" />
            {game.rating.toFixed(1)}
          </span>
          <motion.span
            key={players}
            initial={{ color: rising ? 'var(--success)' : 'var(--text-low)' }}
            animate={{ color: 'var(--text-medium)' }}
            transition={{ duration: 1 }}
            className="flex items-center gap-1 tabular-nums"
          >
            <Users size={12} />
            {players.toLocaleString()}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}
