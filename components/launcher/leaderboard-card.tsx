'use client'

/**
 * "Leaderboard of the week" on the home screen (C3.10).
 *
 * Ten rows and one switcher: who is ahead this week by hours, by coins earned or
 * by matches won — and where the reader sits in that order, even when that is
 * outside the ten.
 *
 * The decisions worth naming, each of them a bug the card would otherwise ship:
 *
 *  1. **The metric is a request, not a client-side sort.** Re-sorting the ten rows
 *     already on screen would rank the *page* instead of the club: the tenth by
 *     hours is not the tenth by wins, and a player lying eleventh on coins could
 *     never surface however the reader sorted. So `metric` travels to the endpoint,
 *     the whole field is ordered there, and `rank` arrives stamped — which is also
 *     why the switcher moves the SWR key rather than a `useMemo`.
 *
 *  2. **The reader's own row is chased down the whole list.** A top-10 is close to
 *     useless to the member sitting twelfth, so the server returns their row
 *     separately (`viewer`) and it is pinned under the ten behind a dashed break.
 *     It is `null` when they are already on the page — the card must never print
 *     one player twice — and the break is narrated for readers who cannot see it,
 *     because a jump from 10 to 12 otherwise reads as a board that lost a player.
 *
 *  3. **It is a table, because it is a table.** Three columns of comparable
 *     numbers with a heading each: `<th scope="col">` is what gives a bare "28" the
 *     word "hours" when read aloud, and `aria-sort` on the active column states the
 *     ordering the switcher just chose without a second sentence saying so.
 *
 *  4. **The bar behind each number is the one piece of decoration that carries a
 *     fact** — the gap to first place, which no column of numbers states. It is
 *     measured against the leader of the page, so the ordering and the bar can
 *     never disagree, and the same fact is given to assistive tech in words.
 *
 * Shown to a walk-in, unlike the dailies, the season card or "the club now" (C3.4,
 * C3.5, C3.7): the standings are a fact about the club rather than about an
 * account, and a guest at the counter has every reason to see who is winning. They
 * simply get no highlighted row and no pinned one — there is no "you" to point at,
 * so `viewerId: null` is sent and the server flags nobody.
 *
 * No push moves this board: hours and wins accrue for *other* members, whose
 * events are scoped to their own sessions. So the card polls, at the cadence the
 * other two club-wide readings on this screen use.
 */

import { motion } from 'framer-motion'
import { useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { Skeleton } from '@/components/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Segmented } from '@/components/ui/segmented'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { fetchLeaderboard } from '@/lib/mock/api'
import { formatCoins } from '@/lib/money'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { useStore } from '@/lib/store'
import type { LeaderboardEntry, LeaderboardMetric } from '@/lib/types/loyalty'
import { cn } from '@/lib/utils'

/** The board the card asks for. Ten is the promise the subtitle makes. */
const BOARD_ROWS = 10

/** Same cadence as "the club now" and the tournament: other people's numbers. */
const LEADERBOARD_REFRESH_MS = 30_000

/**
 * The three orderings, in the order they are offered.
 *
 * Hours first because it is the club's own default and the one number every
 * member has; coins and wins are what the evening pays and what it proves. The
 * union comes from the endpoint, so the switcher cannot offer a fourth column the
 * server has no way to rank by.
 */
const METRICS: { value: LeaderboardMetric; key: TKey; icon: keyof typeof icons }[] = [
  { value: 'hours', key: 'home.leaderboardHours', icon: 'clock' },
  { value: 'coins', key: 'home.leaderboardCoins', icon: 'coins' },
  { value: 'wins', key: 'home.leaderboardWins', icon: 'rewards' },
]

/**
 * Gold, silver and bronze — the only place on this screen colour carries meaning
 * on its own, which is why the number stays *inside* the medal instead of being
 * replaced by it.
 */
const RANK_GRADIENT = [
  'linear-gradient(116deg, #bc841f, #f9c66c)',
  'linear-gradient(116deg, #a0a5c5, #cfe0e2)',
  'linear-gradient(116deg, #874a12, #d3975f)',
]

export function LeaderboardCard({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t, formatNumber } = useT()
  const user = useStore((s) => s.user)
  const isGuest = surface === 'guest' || !user

  // Which column the club is ranked by. Client state, but it is part of the
  // *request*: the board comes back ordered, so this moves the key.
  const [metric, setMetric] = useState<LeaderboardMetric>('hours')

  // Keyed by the viewer as well as the metric: a sign-out must not leave the next
  // player with the previous member's row highlighted as "you".
  const board = useApi(
    ['leaderboard', metric, isGuest ? 'guest' : user.email],
    () =>
      fetchLeaderboard({
        limit: BOARD_ROWS,
        metric,
        // A walk-in has no row to flag or to chase — see the header note.
        viewerId: isGuest ? null : undefined,
      }),
    { refreshInterval: LEADERBOARD_REFRESH_MS },
  )

  const data = board.data
  // Where the reader stands, said once, under the board. `viewer` is the row when
  // they fell off the page; otherwise their place is read off the page itself.
  const onPage = data?.rows.find((row) => row.isCurrentUser)
  const standing = isGuest
    ? data
      ? t('home.leaderboardTotal', { total: formatNumber(data.total) })
      : undefined
    : data?.viewer
      ? t('home.leaderboardYourPlace', {
          rank: formatNumber(data.viewer.rank),
          total: formatNumber(data.total),
        })
      : onPage
        ? t('home.leaderboardYouRanked', {
            rank: formatNumber(onPage.rank),
            total: formatNumber(data?.total ?? 0),
          })
        : data
          ? t('home.leaderboardTotal', { total: formatNumber(data.total) })
          : undefined

  return (
    <section aria-labelledby="leaderboard-heading">
      <SectionHeader
        index="10"
        title={t('home.leaderboardTitle')}
        headingId="leaderboard-heading"
        subtitle={t('home.leaderboardSubtitle')}
        action={
          <Segmented
            options={METRICS.map((m) => {
              const Icon = icons[m.icon]
              return {
                value: m.value,
                label: t(m.key),
                icon: <Icon size={11} aria-hidden />,
              }
            })}
            value={metric}
            onChange={setMetric}
            size="sm"
            fill={false}
            // Three one-word segments; the group's name says what pressing does.
            label={t('home.leaderboardMetricLabel')}
          />
        }
      />

      <div className="glass tick-corners overflow-hidden rounded-xl">
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          errorClassName="p-4"
          loading={
            // The board's final geometry, row for row, so switching the metric —
            // which is a fetch — cannot make the panel jump (C3.11).
            <div className="flex flex-col">
              <div className="h-[41px] border-b border-border" />
              {Array.from({ length: BOARD_ROWS }).map((_, i) => (
                <div key={i} className="flex h-[44px] items-center gap-3 px-5">
                  <Skeleton className="h-6 w-6" radius="sm" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="ml-auto h-3.5 w-16" />
                </div>
              ))}
            </div>
          }
          isEmpty={(b) => b.rows.length === 0}
          empty={
            <div className="p-4">
              <EmptyState
                bare
                size="sm"
                icon={icons.rewards}
                title={t('loyalty.noLeaderboard')}
                description={t('loyalty.noLeaderboardBody')}
              />
            </div>
          }
        >
          {(b) => {
            // The bar's yardstick is the top row of *this* page, so the ordering
            // and the bar can never disagree — the leader is always full.
            const top = Math.max(...b.rows.map((row) => row[b.metric]), 1)
            const lastShown = b.rows[b.rows.length - 1]?.rank ?? 0

            return (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="label-mono border-b border-border text-[9px] text-text-low">
                    <th scope="col" className="w-[52px] px-5 py-3 text-left font-normal">
                      {/* The glyph is the column; its name is for the reader who
                          cannot see it. */}
                      <span aria-hidden>#</span>
                      <span className="sr-only">{t('home.leaderboardRank')}</span>
                    </th>
                    <th scope="col" className="py-3 pr-3 text-left font-normal">
                      {t('home.leaderboardPlayer')}
                    </th>
                    <th
                      scope="col"
                      // States the ordering the switcher just chose, on the column
                      // it applies to, instead of in a sentence beside it.
                      aria-sort="descending"
                      className="w-[136px] px-5 py-3 text-right font-normal text-text-medium"
                    >
                      {t(METRICS.find((m) => m.value === b.metric)!.key)}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {b.rows.map((row) => (
                    <Row key={row.nickname} row={row} metric={b.metric} top={top} />
                  ))}
                </tbody>

                {/* The reader, when they are not on the page. A dashed edge for the
                    positions in between, and the same gap said in words. */}
                {b.viewer && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-5 pb-1 pt-2">
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="h-px flex-1 border-t border-dashed border-border-strong" />
                          <span className="label-mono text-[9px] text-text-low" aria-hidden>
                            ···
                          </span>
                          <span aria-hidden className="h-px flex-1 border-t border-dashed border-border-strong" />
                        </div>
                        <span className="sr-only">
                          {t('home.leaderboardSkipped', {
                            from: formatNumber(lastShown + 1),
                            to: formatNumber(b.viewer.rank - 1),
                          })}
                        </span>
                      </td>
                    </tr>
                    <Row row={b.viewer} metric={b.metric} top={top} />
                  </tfoot>
                )}
              </table>
            )
          }}
        </DataBoundary>
      </div>

      {standing && (
        // Under the panel rather than in the subtitle: it is a fact about the
        // reader, and it is only true once the board has actually landed.
        <p className="mt-2.5 flex items-center gap-1.5 pl-[38px] text-xs text-text-medium">
          <icons.rewards size={12} aria-hidden className="text-primary" />
          {standing}
        </p>
      )}
    </section>
  )
}

/**
 * One standing. Shared by the ten and by the pinned row, so the reader's own line
 * is the same object wherever it lands — a second markup for "your row" would be
 * a second chance for the two to drift apart.
 */
function Row({
  row,
  metric,
  top,
}: {
  row: LeaderboardEntry
  metric: LeaderboardMetric
  top: number
}) {
  const { t, formatNumber } = useT()
  const value = row[metric]
  // Coins are the club's currency and keep their own formatter; hours and wins are
  // ordinary counts, grouped by the reader's locale.
  const printed = metric === 'coins' ? formatCoins(value) : formatNumber(value)
  const share = Math.max(2, Math.round((value / top) * 100))
  const medal = row.rank <= 3 ? RANK_GRADIENT[row.rank - 1] : null

  return (
    <tr
      className={cn(
        'border-t border-border/60 transition-colors first:border-t-0',
        row.isCurrentUser ? 'bg-primary/10' : 'hover:bg-white/[0.03]',
      )}
    >
      <td className="px-5 py-2">
        {medal ? (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-[5px] font-display text-xs font-bold text-background"
            style={{ background: medal }}
          >
            {row.rank}
          </span>
        ) : (
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center font-display font-bold tabular-nums',
              row.isCurrentUser ? 'text-primary' : 'text-text-low',
            )}
          >
            {row.rank}
          </span>
        )}
      </td>

      <td className="py-2 pr-3">
        <div className="flex items-center gap-2.5">
          {/* Decorative here: the name is printed beside it, and the avatar's own
              label would say it a second time. The ring still carries the tier. */}
          <span aria-hidden>
            <Avatar name={row.nickname} level={row.level} size="xs" />
          </span>
          <span
            className={cn(
              'truncate font-medium',
              row.isCurrentUser ? 'text-primary' : 'text-text-high',
            )}
          >
            {/* Nicknames are the members' own, printed as they are. */}
            {row.nickname}
          </span>
          {row.isCurrentUser && (
            <span className="label-mono shrink-0 rounded-sm bg-primary/20 px-1.5 py-0.5 text-[8px] text-primary">
              {t('home.leaderboardYou')}
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-2 align-middle">
        <div className="flex flex-col items-end gap-1">
          <motion.span
            // The number is what changed when the metric moved, so it is the one
            // thing that fades in — the row around it stays put.
            key={`${metric}-${value}`}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            className={cn(
              'flex items-center gap-1 tabular-nums',
              row.isCurrentUser ? 'text-primary' : 'text-text-high',
            )}
          >
            {metric === 'coins' && <icons.coins size={11} aria-hidden className="text-coin" />}
            {printed}
          </motion.span>
          {/* The gap to first place. Decoration that carries a fact — and the fact
              is handed to assistive tech in words rather than as a bar. */}
          <span
            aria-hidden
            className="h-[3px] w-full max-w-[86px] overflow-hidden rounded-full bg-white/[0.06]"
          >
            <span
              className={cn(
                'block h-full rounded-full',
                row.isCurrentUser ? 'bg-primary' : row.rank === 1 ? 'bg-coin' : 'bg-steel-2',
              )}
              style={{ width: `${share}%` }}
            />
          </span>
          <span className="sr-only">
            {row.rank === 1
              ? t('home.leaderboardLeader')
              : t('home.leaderboardShare', { percent: String(share) })}
          </span>
        </div>
      </td>
    </tr>
  )
}
