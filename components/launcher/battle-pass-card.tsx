'use client'

/**
 * "Battle Pass" on the home screen (C3.5).
 *
 * Four questions, and the card refuses every fifth one: which tier the player is
 * standing on, how far the next one is, what the next one pays, and the way into
 * the full ladder. That last one is why this is a teaser and not a ladder: fifty
 * levels on two tracks is a screen (C8.5), and a home card that tried to show
 * them would be a worse copy of it.
 *
 * The decisions worth naming, each of them a bug the card would otherwise ship:
 *
 *  1. **The server picks "current" and "next".** `fetchBattlePass()` answers with
 *     `currentTier` / `nextTier` already chosen, so this component renders a pair
 *     it did not select. A card that scanned `tiers` itself would be a second place
 *     deciding what comes next — one that could promise a different reward than
 *     the pass screen does, off the same payload.
 *
 *  2. **The next tier is the *free* track's.** The teaser promises what levelling
 *     up pays, not what buying the season pays: a premium reward on the home
 *     screen would advertise a lane this player may not have. The paid track is
 *     real and belongs to the pass screen, where the price is visible next to it.
 *
 *  3. **"Open" is a door, not a claim.** Collectable tiers are *counted* here and
 *     collected there, because C8.6 makes the claim an opening animation with the
 *     reward in it — and a silent claim from a home card would spend that moment
 *     on nothing. This card moves no wallet, which is also why it needs none of
 *     `quests-card.tsx`'s double-click machinery.
 *
 *  4. **Two words for two numbers.** The greeting above says "Level", the account
 *     rank; everything here says "Tier", the standing in this season. They are
 *     different counters and would look like one broken one if they shared a word.
 *
 * The season countdown is days, never seconds: §4.2 spends the ticking-digits
 * attention once, on the session clock, and a month-long deadline does not need
 * a runner. Like the dailies card, this one renders nothing for a walk-in — season
 * progress is keyed to an account, so a guest would be shown the previous member's
 * standing.
 */

import { motion } from 'framer-motion'
import { DataBoundary } from '@/components/data-boundary'
import { Skeleton } from '@/components/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RingProgress } from '@/components/ui/ring-progress'
import { SectionHeader } from '@/components/ui/section-header'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import { fetchBattlePass } from '@/lib/mock/api'
import { formatCoins } from '@/lib/money'
import { useStore } from '@/lib/store'
import { SECONDS_PER_HOUR, secondsUntil, serverNowMs } from '@/lib/time'
import type { BattlePassTier } from '@/lib/types/loyalty'

const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24

/**
 * Which icon a reward wears, by what the reward *is*.
 *
 * Keyed on `rewardType` and not on the label, because the label is admin-authored
 * copy ("30 min free time") and matching words in it would break the moment a club
 * renamed a drop or wrote it in Lithuanian.
 */
const REWARD_ICON: Record<BattlePassTier['rewardType'], LucideIcon> = {
  coins: icons.coins,
  time: icons.timer,
  product: icons.drinks,
  merch: icons.merch,
  cosmetic: icons.achievement,
}

export function BattlePassCard({ index }: { index: string }) {
  const { t, tp, formatNumber } = useT()
  const user = useStore((s) => s.user)
  const setView = useStore((s) => s.setView)

  // Keyed by the member, like the dailies board: a sign-out must not leave the
  // next player looking at a cached season standing. The `loyalty` head is what
  // makes a pushed `battlepass.tier` land here without a subscription of its own
  // (`EVENT_INVALIDATES`).
  const pass = useApi(user ? ['loyalty/battlepass', user.email] : null, () => fetchBattlePass())

  if (!user) return null

  const data = pass.data
  // The season deadline, on the **server's** timeline: a kiosk with a wrong system
  // clock must not end the season a day early. Rounded up, so the last partial day
  // still reads as a day left rather than as none.
  const daysLeft = data ? Math.ceil(secondsUntil(data.season.endsAt, serverNowMs()) / SECONDS_PER_DAY) : 0

  return (
    // The second anchor of the tour's loyalty step (C3.12) — see the note beside
    // `data-tour="quests"`. The overlay measures one box around both, so this
    // attribute has to exist even though the step is named after the other card.
    <section data-tour="pass" aria-labelledby="pass-heading">
      <SectionHeader
        index={index}
        title={t('loyalty.battlePass')}
        headingId="pass-heading"
        // The season's own name, which is the club's copy — printed as written,
        // the same way quest lines are (F2.2).
        subtitle={data?.season.name}
        action={
          data ? (
            <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
              <icons.calendar size={11} aria-hidden />
              {daysLeft <= 0
                ? t('home.passSeasonEndsToday')
                : t('home.passSeasonEndsIn', { duration: tp('common.days', daysLeft) })}
            </span>
          ) : null
        }
      />

      <div className="glass tick-corners rounded-xl p-4">
        <DataBoundary
          state={pass}
          errorBare
          errorSize="sm"
          loading={
            // The final height of the two columns, so the surface does not resize
            // when the season lands (C3.11).
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
              <div className="flex items-center gap-5">
                <Skeleton className="h-[104px] w-[104px]" radius="full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
              <Skeleton className="h-[104px] w-full" radius="md" />
            </div>
          }
        >
          {(view) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8"
            >
              {/* ── Where the player stands ─────────────────────────────── */}
              <div className="flex items-center gap-5">
                {/* The ring is the card's one signature element: the tier number
                    inside its own progress, so "where I am" and "how far to the
                    next" are a single object rather than two readings to compare.
                    Muted for screen readers on purpose — it draws the same two
                    numbers the bar and the "Tier N" line beside it already state,
                    and left announceable it would be a second `progressbar` with
                    an identical name, read twice in a row. */}
                <RingProgress
                  value={view.xpIntoLevel}
                  max={view.xpForNextLevel}
                  size={104}
                  thickness={7}
                  tone="xp"
                  aria-hidden
                >
                  <span className="flex flex-col items-center leading-none">
                    <span className="label-mono text-[8px] text-text-low">
                      {t('loyalty.level')}
                    </span>
                    <span className="font-display text-3xl font-bold tabular-nums text-text-high">
                      {view.userSeason.level}
                    </span>
                  </span>
                </RingProgress>

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-lg font-bold uppercase leading-none tracking-tight text-text-high">
                      {t('home.passTier', { level: view.userSeason.level })}
                    </p>
                    {/* The tier the player is standing on, named by the club.
                        Absent at level 0 of a season with no rung there — the
                        label is the club's data, so its absence is data too. */}
                    {view.currentTier && (
                      <p className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
                        <icons.check size={11} aria-hidden />
                        <span className="truncate normal-case">{view.currentTier.label}</span>
                      </p>
                    )}
                  </div>

                  {view.nextTier ? (
                    <Progress
                      value={view.xpIntoLevel}
                      max={view.xpForNextLevel}
                      tone="xp"
                      size="sm"
                      showValue
                      label={t('home.passToNextTier', { level: view.nextTier.level })}
                      format={(value, max) =>
                        t('home.passXpOf', {
                          xp: formatNumber(value),
                          max: formatNumber(max),
                        })
                      }
                    />
                  ) : (
                    // Top of the ladder: there is no bar to fill and no tier above
                    // to aim at, so the card says so instead of drawing an empty
                    // track towards nothing.
                    <p className="text-pretty text-xs leading-relaxed text-text-medium">
                      {t('home.passTopTierBody', { level: view.userSeason.level })}
                    </p>
                  )}
                </div>
              </div>

              {/* ── What the next tier gives, and the way in ─────────────── */}
              <div className="flex flex-col justify-center gap-3 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                {view.nextTier ? (
                  <NextReward tier={view.nextTier} />
                ) : (
                  <p className="label-mono flex items-center gap-1.5 text-[9px] text-success">
                    <icons.premium size={12} aria-hidden />
                    {t('home.passTopTier')}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setView('rewards')}
                    iconLeft={<icons.season aria-hidden />}
                    // One word on screen, so the reader is told which pass it
                    // opens — the season name is the only thing that identifies it.
                    aria-label={t('home.passOpenLabel', { season: view.season.name })}
                  >
                    {t('home.passOpen')}
                  </Button>
                  {/* Counted, not collected: the claim is an opening animation on
                      the pass screen (C8.6), so this is the reason to press the
                      button rather than a button of its own. */}
                  {view.claimable > 0 && (
                    <Badge tone="success" variant="soft" size="sm">
                      {tp('home.passReady', view.claimable)}
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </DataBoundary>
      </div>
    </section>
  )
}

/**
 * The one reward the next tier pays.
 *
 * Coins and minutes are *numbers* on the tier, so they are formatted by the
 * product's own formatters — `formatCoins` owns the club's currency, and a
 * duration is a phrase the dictionary declines. Everything else is a named drop
 * (a hoodie, a sticker pack), and those names are admin-authored: printed exactly
 * as the club wrote them, never re-worded here (F2.2).
 */
function NextReward({ tier }: { tier: BattlePassTier }) {
  const { t, tp } = useT()
  const Icon = REWARD_ICON[tier.rewardType]

  const reward =
    tier.rewardType === 'coins'
      ? // Declension from the count, digits from `formatCoins` — the club's
        // currency keeps its own grouping while the noun still agrees with the
        // number ("145 коинов", not "145 коин").
        tp('common.coins', tier.rewardAmount, { n: formatCoins(tier.rewardAmount) })
      : tier.rewardType === 'time'
        ? t('home.passRewardTime', { duration: tp('common.minutes', tier.rewardAmount) })
        : tier.label

  return (
    <div className="flex flex-col gap-2">
      <span className="label-mono text-[9px] text-text-low">
        {t('home.passNextGives', { level: tier.level })}
      </span>
      {/* Recessed into the panel — the shallow rung of the well family (§3.3).
          It is a promise, not something to press: the row that steps *forward* on
          this card is the button beside it. */}
      <div className="well-shallow flex items-center gap-3 rounded-md border border-border px-4 py-3">
        <Icon size={20} aria-hidden className="shrink-0 text-xp" />
        <p className="min-w-0 text-pretty text-sm font-semibold leading-snug text-text-high">
          {reward}
        </p>
      </div>
    </div>
  )
}
