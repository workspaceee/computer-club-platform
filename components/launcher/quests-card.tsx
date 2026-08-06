'use client'

/**
 * "Daily quests" on the home screen (C3.4).
 *
 * The one card on this surface that asks the player to *do* something rather than
 * reporting what already happened. So every line on it is written to answer one of
 * three questions and nothing else: what is the objective, how far along is it,
 * and what does finishing it pay.
 *
 * Four decisions, each of them a bug the card would otherwise ship with.
 *
 *  1. **The server picks the three.** The club runs four dailies in the seed, and
 *     "which three" is a product decision with an order to it — collectable first,
 *     then in progress, then settled. That lives in `fetchDailyQuests()`, so this
 *     component renders a list it did not choose and cannot reshuffle. A card that
 *     sliced `fetchQuests('daily')` itself would be the second place deciding what
 *     a day consists of.
 *
 *  2. **The reset is the club's day, not midnight.** A member playing at 03:00 is
 *     still inside the set they started the evening with, and a countdown to
 *     midnight would empty the card in front of them mid-visit. The endpoint
 *     answers with `resetsAt` — the club's next opening — and this card only counts
 *     down to it.
 *
 *  3. **The countdown starts no interval.** `ResetChip` re-derives off
 *     `sessionSeconds`, the app's single heartbeat (F6.3), and it is a separate
 *     component so that one ticking chip does not re-render three quest rows every
 *     second. It shows hours and minutes, never seconds: the seconds runner in this
 *     product is the session clock, and §4.2 spends that attention once.
 *
 *  4. **Completion and collection are two events.** The club notices the objective
 *     was met; the player presses the button that pays it. `claimQuest()` is the
 *     only thing that moves the wallet, and the balance it answers with is written
 *     to the store rather than added to it — so a double click, a stale card and a
 *     revalidation cannot between them invent coins.
 *
 * Season XP is deliberately *not* pushed into the store on a claim: the greeting's
 * XP bar is fed by the profile snapshot, and the live pass surface is C3.5's to
 * own. Paying the coins twice would be a lie; showing the XP bar a beat later is
 * not.
 */

import { motion } from 'framer-motion'
import { useCallback, useMemo, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/ui/section-header'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import {
  claimQuest,
  DAILY_QUEST_SLOTS,
  fetchDailyQuests,
  toApiError,
} from '@/lib/mock/api'
import { formatCoins, formatNumber } from '@/lib/money'
import { useStore } from '@/lib/store'
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE, secondsUntil, serverNowMs } from '@/lib/time'
import type { ID, ISODateTime } from '@/lib/types/common'
import type { Quest } from '@/lib/types/loyalty'
import { cn } from '@/lib/utils'

/**
 * No `surface` prop, for the reason the greeting and "Continue" have none (C3.1,
 * C3.2): whether this is a member or a walk-in is already answered by the store.
 * Here it is required rather than tidy — quest progress is keyed to an account, so
 * a card on the guest surface would show a walk-in the previous member's evening.
 */
export function QuestsCard() {
  const { t } = useT()
  const user = useStore((s) => s.user)
  const toast = useStore((s) => s.toast)
  const setCoins = useStore((s) => s.setCoins)

  // Keyed by the member so a sign-out cannot leave the next player looking at a
  // cached set. The `loyalty` head is what makes a pushed `quest.completed` land
  // here without a subscription of its own (`EVENT_INVALIDATES`).
  const board = useApi(user ? ['loyalty/quests/daily', user.email] : null, fetchDailyQuests)

  const [claiming, setClaiming] = useState<ID | null>(null)
  // A ref beside the state for the reason `useExtendTime()` keeps one: a double
  // click arrives before React has re-rendered, so the closure would still see
  // `null` and post the claim twice.
  const inFlight = useRef(false)

  const claim = useCallback(
    async (quest: Quest) => {
      if (inFlight.current) return
      inFlight.current = true
      setClaiming(quest.id)
      try {
        const result = await claimQuest(quest.id)
        // The club's balance, not ours plus a reward: `addCoins` here would
        // double-count the moment a `wallet.updated` push landed as well.
        setCoins(result.wallet.coins)
        await board.mutate()
        toast(
          'success',
          t('home.questClaimedToast', {
            coins: formatCoins(quest.rewardCoins),
            xp: formatNumber(quest.rewardXp),
          }),
        )
      } catch (error) {
        // The API answers with a code; the sentence is ours (F2.2).
        toast('error', t(`errors.${toApiError(error).code}` as TKey))
      } finally {
        inFlight.current = false
        setClaiming(null)
      }
    },
    [board, setCoins, t, toast],
  )

  if (!user) return null

  const pending = board.data
  const owed =
    pending && (pending.pendingCoins > 0 || pending.pendingXp > 0)
      ? t('home.questsPending', {
          coins: formatCoins(pending.pendingCoins),
          xp: formatNumber(pending.pendingXp),
        })
      : undefined

  return (
    <section aria-labelledby="quests-heading">
      <SectionHeader
        index="04"
        title={t('home.questsTitle')}
        headingId="quests-heading"
        // What the rest of the day is still worth, over the whole active set —
        // including a fourth daily that did not make the three rows. It is the one
        // number that answers "is it worth finishing these", which no single row
        // can.
        subtitle={owed}
        action={pending ? <ResetChip resetsAt={pending.resetsAt} /> : null}
      />

      <div className="glass tick-corners rounded-xl p-4">
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          loading={
            <div className="flex flex-col gap-2">
              {/* Final row height, so the card does not resize when the set lands
                  (C3.11). */}
              {Array.from({ length: DAILY_QUEST_SLOTS }).map((_, i) => (
                <Skeleton key={i} className="h-[78px] w-full" radius="md" />
              ))}
            </div>
          }
          isEmpty={(data) => data.quests.length === 0}
          empty={
            <EmptyState
              bare
              size="sm"
              icon={icons.accuracy}
              title={t('home.questsEmpty')}
              description={t('home.questsEmptyBody')}
            />
          }
        >
          {(data) => (
            <ul className="flex flex-col gap-2">
              {data.quests.map((quest, i) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  index={i}
                  claiming={claiming === quest.id}
                  // Every other row goes inert while one claim is in flight — one
                  // wallet, one write.
                  blocked={claiming !== null && claiming !== quest.id}
                  onClaim={() => void claim(quest)}
                />
              ))}
            </ul>
          )}
        </DataBoundary>
      </div>
    </section>
  )
}

/**
 * "Resets in 4 hours", on the club's clock.
 *
 * Its own component so the tick it subscribes to re-renders eleven words instead
 * of three quest rows, and so the arithmetic sits next to the reason for it:
 * `resetsAt` was stamped on the **server's** timeline, so it is measured against
 * `serverNowMs()` — a kiosk whose system clock is an hour off must not promise the
 * set rolls over an hour early.
 */
function ResetChip({ resetsAt }: { resetsAt: ISODateTime | null }) {
  const { t, tp } = useT()
  // The app's one clock, used as a heartbeat only (F6.3) — the value itself is the
  // session's remainder and means nothing here.
  const tick = useStore((s) => s.sessionSeconds)

  const label = useMemo(() => {
    // A club that never closes has no opening to roll over at, so there is nothing
    // to count down to and the chip says nothing at all.
    if (resetsAt === null) return null
    const seconds = secondsUntil(resetsAt, serverNowMs())
    if (seconds < SECONDS_PER_MINUTE) return t('home.questsResetNow')
    const hours = Math.floor(seconds / SECONDS_PER_HOUR)
    const duration =
      hours > 0
        ? tp('common.hours', hours)
        : tp('common.minutes', Math.floor(seconds / SECONDS_PER_MINUTE))
    return t('home.questsResetIn', { duration })
    // `tick` is the dependency that makes this live. It is intentionally unused
    // inside the body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetsAt, t, tp, tick])

  if (label === null) return null

  return (
    <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
      <icons.clock size={11} aria-hidden />
      {label}
    </span>
  )
}

function QuestRow({
  quest,
  index,
  claiming,
  blocked,
  onClaim,
}: {
  quest: Quest
  index: number
  claiming: boolean
  blocked: boolean
  onClaim: () => void
}) {
  const { t } = useT()

  const done = quest.progress >= quest.target
  const claimed = quest.claimedAt !== null
  const claimable = done && !claimed

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        'flex flex-col gap-3 rounded-md border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4',
        // Collectable is the only state that steps forward; a settled quest and an
        // unfinished one are both recessed into the panel — the shallow rung of the
        // well family (§3.3).
        claimable ? 'border-success/40 bg-success/10' : 'well-shallow border-border',
        claimed && 'opacity-70',
        blocked && 'opacity-45',
      )}
    >
      <IconTile
        icon={done ? icons.check : icons.accuracy}
        size="md"
        variant={claimable ? 'success' : claimed ? 'muted' : 'primary'}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {/* Admin-authored copy, so it is printed as the club wrote it — the
              dictionaries own our sentences, not the club's (F2.2). */}
          <p className="text-pretty text-sm font-semibold leading-snug text-text-high">
            {quest.description}
          </p>
          <span className="label-mono flex shrink-0 items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1 text-coin tabular-nums">
              <icons.coins size={11} aria-hidden />
              {formatCoins(quest.rewardCoins)}
              <span className="sr-only normal-case">{` ${t('wallet.coinBalance')}`}</span>
            </span>
            <span className="flex items-center gap-1 text-xp tabular-nums">
              <icons.season size={11} aria-hidden />
              {`${formatNumber(quest.rewardXp)} ${t('loyalty.xp')}`}
            </span>
          </span>
        </div>

        <Progress
          value={quest.progress}
          max={quest.target}
          tone={done ? 'success' : 'primary'}
          size="sm"
          showValue
          label={t('loyalty.progress')}
          format={(value, max) => `${formatNumber(value)} / ${formatNumber(max)}`}
        />
      </div>

      {/* One slot, three mutually exclusive outcomes — collect it, it is collected,
          or there is nothing to press yet. */}
      <div className="flex shrink-0 items-center sm:w-[104px] sm:justify-end">
        {claimable ? (
          <Button
            variant="primary"
            size="sm"
            loading={claiming}
            disabled={blocked}
            onClick={onClaim}
            iconLeft={<icons.gift aria-hidden />}
            // The visible label is one word, so the reader is given the quest it
            // belongs to: three "Claim" buttons in a list are three identical names.
            aria-label={t('home.questClaim', { title: quest.description })}
          >
            {t('loyalty.claim')}
          </Button>
        ) : claimed ? (
          <Badge tone="success" variant="soft" size="sm">
            {t('loyalty.claimed')}
          </Badge>
        ) : null}
      </div>
    </motion.li>
  )
}
