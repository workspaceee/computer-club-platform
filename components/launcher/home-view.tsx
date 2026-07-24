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
import { Icon3D, type Icon3DName } from '@/components/icon-3d'
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-4 w-1 rounded-full bg-primary shadow-[0_0_12px_rgba(229,53,43,0.8)]" />
      <h2 className="font-display text-xl font-black uppercase tracking-wide text-text-high">
        {children}
      </h2>
    </div>
  )
}

export function HomeView() {
  return (
    <div className="flex flex-col gap-10">
      <HeroCarousel />
      <QuickStats />
      <PromoBanner />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <PrizeLadder />
        <Leaderboard />
      </div>
    </div>
  )
}

function HeroCarousel() {
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const user = useStore((s) => s.user)
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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-text-medium">
            Welcome back{user ? ',' : ''}{' '}
            <span className="font-semibold text-text-high">{user?.nickname}</span>
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-text-high md:text-4xl">
            Ready to <span className="text-primary text-glow">dominate</span>?
          </h1>
        </div>
        <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-primary sm:inline">
          Top 5 Now
        </span>
      </div>

      <div className="glass relative h-72 overflow-hidden rounded-3xl md:h-96">
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
            <GameCover game={game} className="h-full w-full" titleClassName="text-4xl md:text-6xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {game.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  {game.players.toLocaleString()} playing
                </span>
              </div>
              <button
                onClick={() => setLaunchGame(game.id)}
                className="mt-4 flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-hover px-7 py-3 font-display font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_-2px_rgba(229,53,43,0.7)] transition-all hover:scale-[1.03]"
              >
                <Play size={18} fill="currentColor" />
                Play now
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => go(index - 1)}
          className="glass absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-white transition-colors hover:bg-white/15"
          aria-label="Previous game"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => go(index + 1)}
          className="glass absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-white transition-colors hover:bg-white/15"
          aria-label="Next game"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute bottom-6 right-8 flex gap-1.5">
          {TOP_GAMES.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-7 bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]' : 'w-1.5 bg-white/40',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function QuickStats() {
  const coins = useStore((s) => s.coins)
  const timeLabel = useStore((s) => s.timeBalanceLabel)
  const prizesUnlocked = PRIZES.filter((p) => coins >= p.coins).length

  const stats: { icon: Icon3DName; value: string; label: string }[] = [
    { icon: 'coin', value: formatCoins(coins), label: 'IMBA Coins' },
    { icon: 'timer', value: timeLabel, label: 'Time balance' },
    { icon: 'trophy', value: `${prizesUnlocked}/${PRIZES.length}`, label: 'Prizes unlocked' },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-border-strong"
        >
          <Icon3D name={s.icon} size={52} float />
          <div>
            <p className="font-display text-2xl font-black leading-none text-text-high">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-low">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </section>
  )
}

function PromoBanner() {
  return (
    <section className="shimmer relative overflow-hidden rounded-3xl border border-primary/30 bg-[linear-gradient(110deg,rgba(229,53,43,0.28),rgba(229,53,43,0.04)_60%)] p-6 md:p-7">
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-90">
        <Icon3D name="rocket" size={120} float glow={false} />
      </div>
      <div className="relative z-10 flex max-w-lg flex-col items-start gap-1">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          Happy Hours
        </span>
        <h3 className="mt-2 font-display text-2xl font-black text-text-high md:text-3xl">
          2x Coins until 18:00
        </h3>
        <p className="text-sm text-text-medium">
          Every session earns double rewards. Stack them up and climb the prize ladder.
        </p>
      </div>
    </section>
  )
}

function PrizeLadder() {
  const coins = useStore((s) => s.coins)
  return (
    <section>
      <SectionHeader>Prize Ladder</SectionHeader>
      <div className="glass flex flex-col gap-2 rounded-3xl p-4">
        {PRIZES.map((prize) => {
          const Icon = PRIZE_ICONS[prize.icon] ?? Gift
          const reached = coins >= prize.coins
          return (
            <div
              key={prize.coins}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
                reached ? 'border-primary/40 bg-primary/10' : 'border-border bg-black/20',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  reached
                    ? 'bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-[0_0_16px_-2px_rgba(229,53,43,0.7)]'
                    : 'bg-white/5 text-text-low',
                )}
              >
                <Icon size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-high">{prize.reward}</p>
                <p className="text-xs text-text-low">{formatCoins(prize.coins)} coins</p>
              </div>
              {reached && (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold uppercase text-success">
                  Unlocked
                </span>
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

  const rows = useMemo(() => data ?? [], [data])

  return (
    <section>
      <SectionHeader>Leaderboard</SectionHeader>
      <div className="glass overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[40px_1fr_70px_80px] gap-2 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-low">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Hours</span>
          <span className="text-right">Coins</span>
        </div>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-2.5">
                <Skeleton className="h-6 w-full" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={row.rank}
                className={cn(
                  'grid grid-cols-[40px_1fr_70px_80px] items-center gap-2 px-5 py-2.5 text-sm transition-colors',
                  row.isCurrentUser ? 'bg-primary/10' : 'hover:bg-white/[0.03]',
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
