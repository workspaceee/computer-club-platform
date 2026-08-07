'use client'

import { motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { DataBoundary } from '@/components/data-boundary'
import { BarCard } from '@/components/launcher/bar-card'
import { BattlePassCard } from '@/components/launcher/battle-pass-card'
import { ClubNowCard } from '@/components/launcher/club-now-card'
import { ContinueRow } from '@/components/launcher/continue-row'
import { HeroCarousel } from '@/components/launcher/hero-carousel'
import { HomeGreeting } from '@/components/launcher/home-greeting'
import { IconTile } from '@/components/icon-tile'
import { PromoStrip } from '@/components/launcher/promo-strip'
import { QuestsCard } from '@/components/launcher/quests-card'
import { SessionCard } from '@/components/launcher/session-card'
import { TournamentCard } from '@/components/launcher/tournament-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { fetchFeaturedRewards, fetchLeaderboard } from '@/lib/mock/api'
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
      {/* The club's own highlights, not a second games shelf (C3.9): campaigns,
          the brackets the card below is *not* about, and the novelty shelf — one
          server-composed deck (`GET /api/hero`), so the hero cannot advertise the
          tournament `TournamentCard` shows a few blocks down. It asks as this
          surface's viewer, like the promo strip does, instead of being gated
          here. */}
      <HeroCarousel surface={surface} />
      <QuickStats showLoyalty={!isGuest} />
      {/* The strip decides for itself what a guest may see: it asks the server as
          `viewer: 'everyone'`, so members-only coin campaigns never reach it and
          an open-to-all one (parties, VIP) still does — which a blanket
          `!isGuest` gate here would have thrown away (F7.3). */}
      <PromoStrip surface={surface} />
      {/* Dailies (C3.4). Under the promo strip and above the ladder, because the
          order of the loyalty block is the order of effort: what the club asks for
          today, then what the coins it pays buys. The card renders nothing for a
          walk-in on its own — quest progress is keyed to an account — so the gate
          here is the store's, not this surface's. */}
      <QuestsCard />
      {/* The season, under the dailies (C3.5). Same order-of-effort argument the
          quests card makes about the ladder below it: the club's daily ask, then
          where the XP those quests pay actually goes. It gates itself on the store
          for the same reason — season standing is keyed to an account, so a walk-in
          would be shown the previous member's tier. */}
      <BattlePassCard />
      {/* The bar, under the loyalty block (C3.6). It is the one card on this screen
          that spends money rather than earning it, so it comes after the block that
          explains what the evening pays — and it is shown to a walk-in too: a guest
          orders at the counter exactly like a member does. It carries the campaign
          the promo strip above deliberately never sees (`surface: 'bar'`). */}
      <BarCard surface={surface} />
      {/* The room, last of the cards (C3.7): everything above is about this seat —
          the visit, the games, the evening's economy — and this is the one card
          about the hall around it and who else is in it. It gates itself on the
          store like the dailies and the season card do: both halves answer "where
          can I put my friend", and a walk-in has no friend list to answer it
          with. */}
      <ClubNowCard />
      {/* Tonight's bracket (C3.8), after the room and before the standings: the
          club now says who is here, this says what they are here *for*, and the
          ladder below is last night's outcome. It gates itself on the store like
          the dailies, the season card and "the club now" do — an entry is keyed to
          an account and the fee comes out of a wallet a walk-in has none of. */}
      <TournamentCard />
      {/* Last night's outcome, after tonight's bracket (C3.10). It is shown to a
          walk-in too — the standings are a fact about the club rather than about an
          account — so it asks as this surface's viewer instead of being gated
          here, the way the promo strip and the hero do. */}
      <div className={cn('grid gap-6', !isGuest && 'lg:grid-cols-[1fr_1.25fr]')}>
        {!isGuest && <PrizeLadder />}
        <LeaderboardCard surface={surface} />
      </div>
    </div>
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
      {/* 09, not 04: the dailies card (C3.4), the season card (C3.5), the bar card
          (C3.6), "the club now" (C3.7) and the tournament (C3.8) all landed between
          the promo strip and this ladder, and each took a number with it. */}
      <SectionHeader index="09">Prize Ladder</SectionHeader>
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
