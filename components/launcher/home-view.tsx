'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { useEffect, useMemo, useState } from 'react'
import { ApiErrorState, DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { ContinueRow } from '@/components/launcher/continue-row'
import { HomeGreeting } from '@/components/launcher/home-greeting'
import { IconTile } from '@/components/icon-tile'
import { PromoStrip } from '@/components/launcher/promo-strip'
import { SessionCard } from '@/components/launcher/session-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { useT } from '@/lib/i18n/provider'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { fetchFeaturedGames, fetchFeaturedRewards, fetchLeaderboard } from '@/lib/mock/api'
import { formatCoins } from '@/lib/money'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const PRIZE_ICONS: Record<string, LucideIcon> = {
  sticker: icons.sticker,
  clock: icons.timer,
  shirt: icons.merch,
  mouse: icons.mouse,
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

/**
 * Home (F6.2).
 *
 * The loyalty economy — coins, the prize ladder and the double-coins promo — is
 * members-only, so the guest surface omits those blocks entirely rather than
 * rendering them at zero. Games, the session clock and the leaderboard are the
 * same for everyone.
 */
export function HomeView({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const isGuest = surface === 'guest'

  return (
    <div className="flex flex-col gap-10">
      {/* The greeting owns the page heading (C3.1). It used to be an ad-hoc
          "Welcome back // NAME" eyebrow inside the hero, which greeted the player
          without telling them anything — no level, no streak, no elapsed time —
          and would have left the surface welcoming twice once a real greeting
          existed. */}
      <HomeGreeting />
      {/* The visit, at the size it can be acted on (C3.3). Above "Continue" and
          the hero because it is the frame everything else on this screen happens
          inside: how much of the evening is left, how much is already gone, and
          the button that buys more. It took the "Time balance" tile's reading with
          it — see `QuickStats` below. */}
      <SessionCard />
      {/* Above the hero, and that is the whole point (C3.2): a player who left a
          match five minutes ago should meet the way back into it before they meet
          the club's curated recommendations. It renders nothing on the guest
          surface — the history is keyed to an account, and a walk-in has none. */}
      <ContinueRow />
      <HeroCarousel />
      <QuickStats showLoyalty={!isGuest} />
      {/* The strip decides for itself what a guest may see: it asks the server as
          `viewer: 'everyone'`, so members-only coin campaigns never reach it and
          an open-to-all one (parties, VIP) still does — which a blanket
          `!isGuest` gate here would have thrown away (F7.3). */}
      <PromoStrip surface={surface} />
      <div className={cn('grid gap-6', !isGuest && 'lg:grid-cols-[1fr_1.25fr]')}>
        {!isGuest && <PrizeLadder />}
        <Leaderboard />
      </div>
    </div>
  )
}

function HeroCarousel() {
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  // Auto-advance is suspended while the keyboard is inside the hero (F6.7).
  // Without this, a player tabbing to "Play now" has the slide — and therefore
  // the game that button launches — swapped under them every five seconds.
  const [held, setHeld] = useState(false)

  // The slide dots are a composite widget: one tab stop, arrows walk the slides.
  const dotsRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })

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
    if (count === 0 || held) return
    const t = setInterval(() => {
      setDir(1)
      setIndex((i) => (i + 1) % count)
    }, 5000)
    return () => clearInterval(t)
  }, [count, held])

  const game = count > 0 ? slides[index % count] : null

  // The carousel owns slide state above the fetch, so it renders the three
  // states by hand instead of through <DataBoundary>.
  if (!game) {
    return (
      <section>
        {/* The heading skeleton went with the heading: the greeting above renders
            from the store and is never in a loading state, so a placeholder here
            would reserve space for text that has already arrived. */}
        {featured.error ? (
          <ApiErrorState state={featured} className="h-72 md:h-96" />
        ) : featured.isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl md:h-96" />
        ) : (
          <EmptyState
            icon={icons.play}
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
      {/* No header block. The greeting above the carousel is the page heading now,
          and "Top 5 Live" labelled nothing — the row is curated featured games,
          not a live top five, so the chip went with the duplicate welcome. */}
      <div
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={(e) => {
          // `relatedTarget` is where focus is going: still inside the hero means
          // the player is moving between the arrows and the dots, not leaving.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
        }}
        className="glass tick-corners relative h-72 overflow-hidden rounded-xl md:h-96"
      >
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
            {/* `hideTitle`: the hero writes the name itself, one line below, so
                the cover must not anchor a second title to the same bottom edge —
                that is what put a 60px game name on top of "Play now". */}
            <GameCover
              game={game}
              className="h-full w-full"
              hideTitle
              // The hero is the largest cover on screen and the first thing seen
              // after unlock, so it loads eagerly rather than lazily.
              priority
              sizes="(min-width: 1280px) 70vw, 100vw"
            />
            {/* §3 veil, not a gradient written here (F9.7b): the hero has its
                own rung because it is 70vw of art, not a 12rem caption. */}
            <div className="veil-hero-v absolute inset-0" />
            <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="label-mono rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                  {game.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  {game.players.toLocaleString()} playing
                </span>
              </div>
              {/* The hero's own heading. `pr-28` keeps a long name clear of the
                  slide dots parked in the bottom-right corner. */}
              <h2 className="max-w-2xl pr-28 font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-white text-balance drop-shadow-md md:text-5xl">
                {game.name}
              </h2>
              <button
                onClick={() => setLaunchGame(game.id)}
                className="flex w-fit items-center gap-2 rounded-md bg-primary px-7 py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_-4px_rgba(229,53,43,0.8)] transition-all hover:scale-[1.03] hover:bg-primary-hover"
              >
                <icons.play size={17} fill="currentColor" />
                Play now
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Vertically centred from `sm` up, pinned to the top corners below it
            (C2.9). The copy column is bottom-anchored and its height is fixed by
            the type, so as the frame narrows the column climbs: measured at
            320 px the left arrow (314–356) sat straight across the category chip
            (301–326) and the first line of the game name (338–398). At the top
            edge there is nothing but veil at any width. */}
        <button
          onClick={() => go(index - 1)}
          className="glass absolute left-3 top-3 rounded-md p-2.5 text-white transition-colors hover:bg-white/15 sm:left-4 sm:top-1/2 sm:-translate-y-1/2"
          aria-label="Previous game"
        >
          <icons.back size={20} />
        </button>
        <button
          onClick={() => go(index + 1)}
          className="glass absolute right-3 top-3 rounded-md p-2.5 text-white transition-colors hover:bg-white/15 sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
          aria-label="Next game"
        >
          <icons.forward size={20} />
        </button>

        <div ref={dotsRef} role="group" aria-label="Slides" className="absolute bottom-6 right-8 flex gap-1.5">
          {slides.map((g, i) => (
            <button
              key={g.id}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${g.name}`}
              aria-current={i === index ? 'true' : undefined}
              data-roving-item
              className={cn(
                // A 1px-tall dot is a 1px-tall focus ring, so the hit and focus
                // target is padded out to something a keyboard user can see.
                'h-1 rounded-full transition-all focus-visible:outline-offset-4',
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

function QuickStats({ showLoyalty }: { showLoyalty: boolean }) {
  const coins = useStore((s) => s.coins)
  // Same SWR key as the prize ladder below, so the row is fetched once.
  const prizes = useApi('loyalty/rewards/featured', fetchFeaturedRewards)
  const ladder = prizes.data ?? []
  const prizesUnlocked = ladder.filter((p) => coins >= p.coins).length

  // A guest has no coin balance and no ladder progress, so those tiles are
  // dropped instead of showing zeros the player can never move.
  //
  // The time tile that used to sit between them is gone (C3.3): `SessionCard`
  // above states the same remainder with the arc of the visit behind it and a
  // grant button on it, and a tile repeating the number — with no bar, no source
  // and nothing to press — would have put one reading on the screen twice.
  const stats: { icon: LucideIcon; value: string; label: string }[] = showLoyalty
    ? [
        { icon: icons.coins, value: formatCoins(coins), label: 'IMBA Coins' },
        {
          icon: icons.rewards,
          value: `${prizesUnlocked}/${ladder.length}`,
          label: 'Prizes unlocked',
        },
      ]
    : []

  // Which leaves a walk-in with nothing in this row at all — so the row itself
  // goes, rather than reserving vertical space for an empty grid.
  if (stats.length === 0) return null

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              icon={icons.gift}
              title={t('loyalty.noRewards')}
              description={t('loyalty.noRewardsBody')}
            />
          }
        >
          {(rows) =>
            rows.map((prize) => {
              const Icon = PRIZE_ICONS[prize.icon] ?? icons.gift
              const reached = coins >= prize.coins
              return (
                <div
                  key={prize.coins}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                    // Unreached rows are recessed into the panel — the shallow
                    // rung of the well family (§3.3).
                    reached ? 'border-primary/40 bg-primary/10' : 'border-border well-shallow',
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
              icon={icons.rewards}
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
                  <icons.energy size={11} className="text-warning" />
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
