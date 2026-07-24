'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Mouse,
  Play,
  Shirt,
  Sticker,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { GameCover } from '@/components/game-cover'
import { Skeleton } from '@/components/skeleton'
import { fetchLeaderboard } from '@/lib/mock/api'
import { PRIZES, TOP_GAMES } from '@/lib/mock/data'
import { formatCoins } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const PRIZE_ICONS: Record<string, React.ElementType> = {
  sticker: Sticker,
  clock: Clock,
  shirt: Shirt,
  mouse: Mouse,
}

export function HomeView() {
  return (
    <div className="flex flex-col gap-8">
      <TopGamesCarousel />
      <PromoBanner />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <PrizeLadder />
        <Leaderboard />
      </div>
    </div>
  )
}

function TopGamesCarousel() {
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const count = TOP_GAMES.length

  const go = (next: number) => {
    setDir(next > index || (index === count - 1 && next === 0) ? 1 : -1)
    setIndex((next + count) % count)
  }

  useEffect(() => {
    const t = setInterval(() => {
      setDir(1)
      setIndex((i) => (i + 1) % count)
    }, 5000)
    return () => clearInterval(t)
  }, [count])

  const game = TOP_GAMES[index]

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-black uppercase tracking-wide text-text-high">
        Top 5 Games
      </h2>
      <div className="relative h-64 overflow-hidden rounded-2xl border border-border md:h-80">
        <AnimatePresence custom={dir} mode="popLayout">
          <motion.div
            key={game.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <GameCover game={game} className="h-full w-full" titleClassName="text-3xl md:text-5xl" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {game.category}
                </span>
                <span className="text-sm font-medium text-white/80">
                  {game.players.toLocaleString()} playing
                </span>
              </div>
              <button
                onClick={() => setLaunchGame(game.id)}
                className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-display font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(229,53,43,0.5)] transition-all hover:bg-primary-hover"
              >
                <Play size={18} fill="currentColor" />
                Play
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => go(index - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Previous game"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => go(index + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Next game"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {TOP_GAMES.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-primary' : 'w-1.5 bg-white/40',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function PromoBanner() {
  return (
    <section className="shimmer relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/25 to-primary/5 p-6">
      <div className="relative z-10 flex flex-col items-start gap-1">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          Happy Hours
        </span>
        <h3 className="mt-2 font-display text-2xl font-black text-text-high">
          2x Coins until 18:00
        </h3>
        <p className="text-sm text-text-medium">
          Every session earns double rewards. Stack them for the prize ladder.
        </p>
      </div>
    </section>
  )
}

function PrizeLadder() {
  const coins = useStore((s) => s.coins)
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-black uppercase tracking-wide text-text-high">
        Prize Ladder
      </h2>
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        {PRIZES.map((prize) => {
          const Icon = PRIZE_ICONS[prize.icon] ?? Gift
          const reached = coins >= prize.coins
          return (
            <div
              key={prize.coins}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                reached ? 'border-primary/40 bg-primary/10' : 'border-border bg-black/20',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  reached ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-text-low',
                )}
              >
                <Icon size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-high">{prize.reward}</p>
                <p className="text-xs text-text-low">{formatCoins(prize.coins)} coins</p>
              </div>
              {reached && (
                <span className="text-xs font-bold uppercase text-success">Unlocked</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const RANK_GRADIENT = [
  'linear-gradient(116deg, #bc841f, #f9c66c)',
  'linear-gradient(116deg, #a0a5c5, #cfe0e2)',
  'linear-gradient(116deg, #874a12, #d3975f)',
]

function Leaderboard() {
  const { data, isLoading } = useSWR('leaderboard', fetchLeaderboard, {
    refreshInterval: 10000,
  })

  // jitter coins slightly each refresh for a live feel
  const rows = useMemo(() => data ?? [], [data])

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-black uppercase tracking-wide text-text-high">
        Leaderboard
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-[40px_1fr_70px_80px] gap-2 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-low">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Hours</span>
          <span className="text-right">Coins</span>
        </div>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-2.5">
                <Skeleton className="h-6 w-full" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={row.rank}
                className={cn(
                  'grid grid-cols-[40px_1fr_70px_80px] items-center gap-2 px-4 py-2.5 text-sm',
                  row.isCurrentUser && 'bg-primary/10',
                )}
              >
                {row.rank <= 3 ? (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md font-display text-xs font-black text-black"
                    style={{ background: RANK_GRADIENT[row.rank - 1] }}
                  >
                    {row.rank}
                  </span>
                ) : (
                  <span className="pl-1.5 font-display font-bold text-text-low">{row.rank}</span>
                )}
                <span className="flex items-center gap-2 truncate">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-text-medium">
                    {row.nickname.slice(0, 2).toUpperCase()}
                  </span>
                  <span className={cn('truncate font-medium', row.isCurrentUser ? 'text-primary' : 'text-text-high')}>
                    {row.nickname}
                    {row.isCurrentUser && ' (You)'}
                  </span>
                </span>
                <span className="text-right tabular-nums text-text-medium">{row.hours}h</span>
                <motion.span
                  key={row.coins}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-end gap-1 text-right tabular-nums text-text-high"
                >
                  <Zap size={11} className="text-warning" />
                  {formatCoins(row.coins)}
                </motion.span>
              </div>
            ))}
      </div>
    </section>
  )
}
