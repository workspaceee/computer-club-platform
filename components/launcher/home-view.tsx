'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Gift,
  type LucideIcon,
  Mouse,
  Play,
  Shirt,
  Sticker,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ApiErrorState, DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import { fetchFeaturedGames, fetchFeaturedRewards, fetchLeaderboard } from '@/lib/mock/api'
import { formatCoins } from '@/lib/money'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const PRIZE_ICONS: Record<string, LucideIcon> = {
  sticker: Sticker,
  clock: Clock,
  shirt: Shirt,
  mouse: Mouse,
}

function SectionHeader({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="label-mono text-[10px] text-primary tabular-nums">{index}</span>
      <span className="h-3 w-px bg-border-strong" />
      <h2 className="font-display text-lg font-bold uppercase tracking-tight text-text-high">
        {children}
      </h2>
      <span className="ml-1 h-px flex-1 bg-border" />
    </div>
  )
}

export function HomeView() {
  return (
    <div className="flex flex-col gap-10">
      <HeroCarousel />
      <QuickStats />
      <PromoBanner />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
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

  const { t } = useT()
  // `GET /api/games/featured` — the curated hero row (F3.4).
  const featured = useApi('games/featured', fetchFeaturedGames)
  const slides = useMemo(() => featured.data ?? [], [featured.data])
  const count = slides.length

  const go = (next: number) => {
    if (count === 0) return
    setDir(next > index || (index === count - 1 && next === 0) ? 1 : -1)
    setIndex((next + count) % count)
  }

  useEffect(() => {
    if (count === 0) return
    const t = setInterval(() => {
      setDir(1)
      setIndex((i) => (i + 1) % count)
    }, 5000)
    return () => clearInterval(t)
  }, [count])

  const game = count > 0 ? slides[index % count] : null

  // The carousel owns slide state above the fetch, so it renders the three
  // states by hand instead of through <DataBoundary>.
  if (!game) {
    return (
      <section>
        <div className="mb-4 flex flex-col gap-2">
          <Skeleton className="h-3 w-32" radius="sm" />
          <Skeleton className="h-10 w-72" radius="sm" />
        </div>
        {featured.error ? (
          <ApiErrorState state={featured} className="h-72 md:h-96" />
        ) : featured.isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl md:h-96" />
        ) : (
          <EmptyState
            icon={Play}
            title={t('games.noFeatured')}
            description={t('games.noFeaturedBody')}
            className="h-72 md:h-96"
          />
        )}
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-1 text-[10px] text-text-low">
            Welcome back{user ? ' //' : ''}{' '}
            <span className="text-primary">{user?.nickname}</span>
          </p>
          <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tighter text-text-high md:text-5xl">
            Ready to <span className="text-primary text-glow">dominate</span>
          </h1>
        </div>
        <span className="label-mono hidden rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] text-primary sm:inline">
          Top 5 Live
        </span>
      </div>

      <div className="glass tick-corners relative h-72 overflow-hidden rounded-xl md:h-96">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="label-mono rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                  {game.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  {game.players.toLocaleString()} playing
                </span>
              </div>
              <button
                onClick={() => setLaunchGame(game.id)}
                className="mt-4 flex w-fit items-center gap-2 rounded-md bg-primary px-7 py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_-4px_rgba(229,53,43,0.8)] transition-all hover:scale-[1.03] hover:bg-primary-hover"
              >
                <Play size={17} fill="currentColor" />
                Play now
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => go(index - 1)}
          className="glass absolute left-4 top-1/2 -translate-y-1/2 rounded-md p-2.5 text-white transition-colors hover:bg-white/15"
          aria-label="Previous game"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => go(index + 1)}
          className="glass absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-2.5 text-white transition-colors hover:bg-white/15"
          aria-label="Next game"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute bottom-6 right-8 flex gap-1.5">
          {slides.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1 rounded-full transition-all',
                i === index
                  ? 'w-8 bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]'
                  : 'w-1.5 bg-white/40',
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
  // Same SWR key as the prize ladder below, so the row is fetched once.
  const prizes = useApi('loyalty/rewards/featured', fetchFeaturedRewards)
  const ladder = prizes.data ?? []
  const prizesUnlocked = ladder.filter((p) => coins >= p.coins).length

  const stats: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Coins, value: formatCoins(coins), label: 'IMBA Coins' },
    { icon: Timer, value: timeLabel, label: 'Time balance' },
    { icon: Trophy, value: `${prizesUnlocked}/${ladder.length}`, label: 'Prizes unlocked' },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass group flex items-center gap-4 rounded-lg p-4 transition-colors hover:border-border-strong"
        >
          <IconTile icon={s.icon} variant="primary" size="lg" ticks />
          <div>
            <p className="font-display text-2xl font-bold leading-none tabular-nums text-text-high">
              {s.value}
            </p>
            <p className="label-mono mt-1.5 text-[9px] text-text-low">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </section>
  )
}

function PromoBanner() {
  return (
    <section className="shimmer relative overflow-hidden rounded-xl border border-primary/30 bg-[linear-gradient(110deg,rgba(229,53,43,0.24),rgba(229,53,43,0.03)_62%)] p-6 md:p-7">
      <div className="pointer-events-none absolute -right-8 -top-10 select-none font-display text-[9rem] font-bold leading-none text-primary/10">
        2X
      </div>
      <div className="relative z-10 flex max-w-lg flex-col items-start gap-1">
        <span className="label-mono rounded-md bg-primary px-2.5 py-1 text-[10px] text-primary-foreground">
          Happy Hours
        </span>
        <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-text-high md:text-3xl">
          Double coins until 18:00
        </h3>
        <p className="text-sm leading-relaxed text-text-medium">
          Every session earns 2x rewards. Stack them up and climb the prize ladder.
        </p>
      </div>
    </section>
  )
}

function PrizeLadder() {
  const { t } = useT()
  const coins = useStore((s) => s.coins)
  const prizes = useApi('loyalty/rewards/featured', fetchFeaturedRewards)

  return (
    <section>
      <SectionHeader index="04">Prize Ladder</SectionHeader>
      <div className="glass flex flex-col gap-2 rounded-xl p-4">
        <DataBoundary
          state={prizes}
          errorBare
          errorSize="sm"
          loading={
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[62px] w-full" radius="md" />
              ))}
            </>
          }
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              bare
              size="sm"
              icon={Gift}
              title={t('loyalty.noRewards')}
              description={t('loyalty.noRewardsBody')}
            />
          }
        >
          {(rows) =>
            rows.map((prize) => {
              const Icon = PRIZE_ICONS[prize.icon] ?? Gift
              const reached = coins >= prize.coins
              return (
                <div
                  key={prize.coins}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                    reached ? 'border-primary/40 bg-primary/10' : 'border-border bg-black/20',
                  )}
                >
                  <IconTile icon={Icon} size="md" variant={reached ? 'primary' : 'muted'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-high">{prize.reward}</p>
                    <p className="label-mono text-[9px] text-text-low tabular-nums">
                      {formatCoins(prize.coins)} coins
                    </p>
                  </div>
                  {reached && (
                    <span className="label-mono rounded-md bg-success/15 px-2.5 py-1 text-[9px] text-success">
                      Unlocked
                    </span>
                  )}
                </div>
              )
            })
          }
        </DataBoundary>
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
  const { t } = useT()
  // Wrapped so SWR's key is not passed through as the query object.
  const board = useApi('leaderboard', () => fetchLeaderboard({ limit: 10 }), {
    refreshInterval: 10000,
  })

  return (
    <section>
      <SectionHeader index="05">Leaderboard</SectionHeader>
      <div className="glass overflow-hidden rounded-xl">
        <div className="label-mono grid grid-cols-[40px_1fr_70px_80px] gap-2 border-b border-border px-5 py-3 text-[9px] text-text-low">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Hours</span>
          <span className="text-right">Coins</span>
        </div>
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          loading={
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-5 py-2.5">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </>
          }
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              bare
              size="sm"
              icon={Trophy}
              title={t('loyalty.noLeaderboard')}
              description={t('loyalty.noLeaderboardBody')}
            />
          }
        >
          {(rows) =>
            rows.map((row) => (
              <div
                key={row.rank}
                className={cn(
                  'grid grid-cols-[40px_1fr_70px_80px] items-center gap-2 px-5 py-2.5 text-sm transition-colors',
                  row.isCurrentUser ? 'bg-primary/10' : 'hover:bg-white/[0.03]',
                )}
              >
                {row.rank <= 3 ? (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-[5px] font-display text-xs font-bold text-black"
                    style={{ background: RANK_GRADIENT[row.rank - 1] }}
                  >
                    {row.rank}
                  </span>
                ) : (
                  <span className="pl-1.5 font-display font-bold text-text-low tabular-nums">
                    {row.rank}
                  </span>
                )}
                <span className="flex items-center gap-2 truncate">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-white/5 text-[10px] font-bold text-text-medium">
                    {row.nickname.slice(0, 2).toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'truncate font-medium',
                      row.isCurrentUser ? 'text-primary' : 'text-text-high',
                    )}
                  >
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
            ))
          }
        </DataBoundary>
      </div>
    </section>
  )
}
