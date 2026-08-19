'use client'

/**
 * The detail panel of one title (C4.5) — what a player reads *before* deciding.
 *
 * The library tile states five facts in a 200 px box. This is the surface for the
 * sixth through the twentieth: the club's own blurb, what the game asks of a
 * machine set against what this seat actually has, the member's own history with
 * it, which friends are in it right now, and one button that starts it.
 *
 * Four decisions worth keeping in view:
 *
 *  1. **It does not build its own launch.** `Launch` sets `launchGameId` and the
 *     existing dialog (`game-launch-modal.tsx`, C4.6) does the rest — the house
 *     account, the agent's checklist, the guard that keeps two titles off one
 *     machine. A second start path here would be a second place for the machine
 *     to be claimed from, which is the one thing `useGameLaunch()` exists to
 *     prevent. The panel stays open underneath while the player confirms, so
 *     cancelling returns them to what they were reading, and closes itself the
 *     moment the start actually reaches the agent — "reading about it" is over.
 *  2. **Three reads, not one.** The title's detail is a *club* fact (same answer
 *     for everyone, cached per game), the stats are the member's own, and who is
 *     in the game is presence that moves minute to minute. Folded into one
 *     payload, one player's playtime would be cached under the title's key and
 *     the whole panel would refetch sixty-seven catalogue fields to learn that a
 *     friend sat down.
 *  3. **The seat verdict is the server's.** `fit` arrives decided
 *     (`GameDetail.fit`): the requirement rows are publisher prose, and a panel
 *     that compared "RTX 2060 / RX 5700" against "NVIDIA RTX 4070 12GB" itself
 *     would disagree with the counter's screen the first time a launcher spelled
 *     a card differently. This file only chooses the words and the tone.
 *  4. **Absent blocks are absent.** No blurb yet, no screenshots shipped
 *     (`screenshots` is empty for every title today — the asset run is the open
 *     C4.1), never played here: each of those is a real state, and the panel
 *     either says so in one line or drops the section, the same move the tile's
 *     presence badge makes at zero. Nothing is framed as a placeholder.
 */

import { useEffect } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { Skeleton } from '@/components/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { StatTile } from '@/components/ui/stat-tile'
import { useApi } from '@/hooks/use-api'
import { CATEGORY_KEYS } from '@/lib/game-labels'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import { LAUNCHER_MARKS, LauncherMark } from '@/lib/launcher-marks'
import { fetchFriendsInGame, fetchGameDetail, fetchGameStats } from '@/lib/mock/api'
import { FLOOR_REFRESH_MS } from '@/lib/presence'
import { useStore } from '@/lib/store'
import { formatDateTime, formatDurationParts } from '@/lib/time'
import type { GameDetail, GameStats, StationFit } from '@/lib/types/catalog'
import type { FriendSummary } from '@/lib/types/social'
import { cn } from '@/lib/utils'

/**
 * The verdict, as a line and a tone.
 *
 * A table rather than three branches in the markup: the three outcomes differ
 * only in wording and colour, and `below` is the only one that owes the player a
 * second sentence (lower settings, and an admin can move them).
 */
const FIT: Record<StationFit, { key: TKey; body: TKey | null; tone: 'success' | 'info' | 'warning' }> =
  {
    above: { key: 'games.detailFitAbove', body: null, tone: 'success' },
    meets: { key: 'games.detailFitMeets', body: null, tone: 'success' },
    below: { key: 'games.detailFitBelow', body: 'games.detailFitBelowBody', tone: 'warning' },
  }

export function GameDetailPanel() {
  const detailGameId = useStore((s) => s.detailGameId)
  const setDetailGame = useStore((s) => s.setDetailGame)
  const launchingGameId = useStore((s) => s.launchingGameId)

  const open = detailGameId !== null

  // A start has actually been handed to the agent — the machine is coming up, and
  // a card describing a game is not what the player should be left looking at.
  // Not `launchGameId`: that one is only "the dialog is open", and closing on it
  // would delete the surface the player cancels *back* to.
  useEffect(() => {
    if (launchingGameId !== null && open) setDetailGame(null)
  }, [launchingGameId, open, setDetailGame])

  return (
    <GameDetailModal
      gameId={detailGameId}
      open={open}
      onClose={() => setDetailGame(null)}
    />
  )
}

function GameDetailModal({
  gameId,
  open,
  onClose,
}: {
  gameId: string | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useT()
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const launchingGameId = useStore((s) => s.launchingGameId)

  // `null` keys while shut: SWR fetches nothing, so a station parked on the
  // library all evening is not polling three endpoints nobody is looking at.
  const detail = useApi(gameId ? ['game/detail', gameId] : null, () =>
    fetchGameDetail(gameId as string),
  )
  const stats = useApi(gameId ? ['game/stats', gameId] : null, () =>
    fetchGameStats(gameId as string),
  )
  // Refreshed on the hall's own cadence — the same interval the library grid and
  // the "Club now" card read presence with, because it is the same fact.
  const friends = useApi(
    gameId ? ['game/friends', gameId] : null,
    () => fetchFriendsInGame(gameId as string),
    { refreshInterval: FLOOR_REFRESH_MS },
  )

  // Anything already starting blocks this button: the machine takes one title,
  // and that answer belongs to the store rather than to a flag in this file.
  const blocked = launchingGameId !== null

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={<icons.games size={14} aria-hidden />}
      // The catalogue's own name, verbatim (F2.2). Until the payload lands the
      // dialog still needs an accessible name, so it opens with the generic one
      // rather than with an unnamed card.
      title={detail.data?.name ?? t('games.detailPending')}
      size="lg"
      footer={
        detail.data ? (
          <Button
            variant="primary"
            size="md"
            disabled={blocked}
            onClick={() => setLaunchGame(detail.data.id)}
            iconLeft={<icons.play aria-hidden />}
            // Sixty tiles and one dialog print the same two words, so the
            // accessible name carries which game is about to start.
            aria-label={`${t('games.launch')} ${detail.data.name}`}
          >
            {t('games.launch')}
          </Button>
        ) : undefined
      }
    >
      <DataBoundary
        state={detail}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-16" />
            <Skeleton className="h-28" />
          </div>
        }
      >
        {(data) => <DetailBody detail={data} stats={stats.data} friends={friends.data} />}
      </DataBoundary>
    </Modal>
  )
}

function DetailBody({
  detail,
  stats,
  friends,
}: {
  detail: GameDetail
  /** Undefined while the member's own read is in flight — the section waits. */
  stats: GameStats | undefined
  friends: FriendSummary[] | undefined
}) {
  const { t, tp, formatNumber } = useT()
  const fit = FIT[detail.fit]

  return (
    <div className="flex flex-col gap-6">
      {/* ── The title, in one look ───────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <GameCover
          game={detail}
          className="aspect-video w-full rounded-lg"
          // The dialog header already prints the name in the display face; the
          // cover's own caption would print it a second time, two centimetres
          // below the first.
          hideTitle
          sizes="(min-width: 1024px) 640px, 100vw"
          priority
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" variant="soft" size="sm">
            {t(CATEGORY_KEYS[detail.category])}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-warning">
            <icons.rating size={13} fill="currentColor" aria-hidden />
            <span aria-hidden>
              {formatNumber(detail.rating, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="sr-only">
              {t('games.ratingOutOf', {
                v: formatNumber(detail.rating, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              })}
            </span>
          </span>
          {/* The launcher, as the brand's own mark where the registry has one and
              as the printed name where it does not — the tile's rule (C4.4), and
              product names never travel through the dictionaries (F2.2). */}
          <span
            className="flex items-center gap-1.5 text-text-medium"
            title={`${t('games.launcherLabel')}: ${detail.launcher}`}
          >
            {LAUNCHER_MARKS[detail.launcher] ? (
              <LauncherMark launcher={detail.launcher} size={14} />
            ) : (
              <span className="label-mono text-[9px] text-text-low">{detail.launcher}</span>
            )}
            <span className="sr-only">{`${t('games.launcherLabel')}: ${detail.launcher}`}</span>
          </span>
          {/* Stated here and not only in the launch dialog: whether a start needs
              one of the club's shared logins changes what the player is about to
              queue for (C4.7), and this is the screen where they decide. */}
          {detail.needsHouseAccount && (
            <Badge tone="info" variant="soft" size="sm">
              {t('games.detailHouseAccount')}
            </Badge>
          )}
        </div>
      </div>

      {/* ── The club's blurb, or the honest absence of one ───────────── */}
      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-[9px] text-text-low">{t('games.detailAbout')}</h3>
        {detail.description ? (
          // Admin-authored copy, printed as written (F2.2) — the panel frames it,
          // it does not rewrite it.
          <p className="text-pretty text-sm leading-relaxed text-text-medium">
            {detail.description}
          </p>
        ) : (
          <EmptyState
            bare
            size="sm"
            className="py-3"
            title={t('games.detailNoDescription')}
            description={t('games.detailNoDescriptionBody')}
          />
        )}
      </section>

      {/* ── What it asks for, against what this seat has ─────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="label-mono text-[9px] text-text-low">
            {t('games.detailRequirements')}
          </h3>
          <span className="label-mono text-[9px] text-text-low">
            {t('games.detailSeat', { seat: detail.fitSeatLabel })}
          </span>
        </div>

        {/* The verdict, first: it is the one line a player standing at the seat
            actually needs, and the four rows below are the evidence for it. */}
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-md border px-3 py-2.5',
            fit.tone === 'warning'
              ? 'border-warning/40 bg-warning/10'
              : 'border-success/40 bg-success/10',
          )}
        >
          {fit.tone === 'warning' ? (
            <icons.warning size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          ) : (
            <icons.check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p
              className={cn(
                'text-pretty text-sm font-semibold leading-snug',
                fit.tone === 'warning' ? 'text-warning' : 'text-success',
              )}
            >
              {t(fit.key)}
            </p>
            {fit.body && (
              <p className="text-pretty text-xs leading-relaxed text-text-medium">
                {t(fit.body)}
              </p>
            )}
          </div>
        </div>

        {/* Two values per row rather than two columns of a table: on a 390 px
            phone a real table either scrolls sideways or truncates the GPU
            strings, which are the longest copy in the panel and the whole reason
            the block exists. */}
        <dl className="grid gap-2 sm:grid-cols-2">
          <ReqRow
            icon={<icons.hardware size={13} aria-hidden />}
            label={t('games.detailReqCpu')}
            asks={detail.requirements.cpu}
            has={detail.seatSpecs.cpu}
          />
          <ReqRow
            icon={<icons.performance size={13} aria-hidden />}
            label={t('games.detailReqGpu')}
            asks={detail.requirements.gpu}
            has={detail.seatSpecs.gpu}
          />
          <ReqRow
            icon={<icons.status size={13} aria-hidden />}
            label={t('games.detailReqRam')}
            asks={detail.requirements.ram}
            has={detail.seatSpecs.ram}
          />
          <ReqRow
            icon={<icons.save size={13} aria-hidden />}
            label={t('games.detailReqStorage')}
            // A number, so the unit is localised here rather than baked into the
            // seed the way the prose rows are.
            asks={t('games.detailGb', { n: formatNumber(detail.requirements.storageGb) })}
            // Free space on the seat is the station agent's answer, not the
            // club's, and this payload is the club's — so the row states what the
            // title asks for and claims nothing about the disk.
            has={null}
          />
        </dl>
      </section>

      {/* ── The member's own history with it ─────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-[9px] text-text-low">{t('games.detailStats')}</h3>
        {stats === undefined ? (
          <Skeleton className="h-20" />
        ) : stats.launches === 0 ? (
          // "You have not played this here" is an answer, not an error — the
          // endpoint returns zeroes rather than a 404 for exactly this block.
          <EmptyState
            bare
            size="sm"
            className="py-3"
            icon={icons.games}
            title={t('games.detailNeverPlayed')}
            description={t('games.detailNeverPlayedBody')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <PlaytimeTile seconds={stats.seconds} />
            <StatTile
              size="sm"
              mono
              icon={<icons.play size={14} aria-hidden />}
              label={t('games.detailStatLaunches')}
              value={formatNumber(stats.launches)}
            />
            <StatTile
              size="sm"
              icon={<icons.calendar size={14} aria-hidden />}
              label={t('games.detailStatLast')}
              value={<LastPlayed at={stats.lastPlayedAt} />}
            />
          </div>
        )}
      </section>

      {/* ── Who is in it right now ───────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-[9px] text-text-low">{t('games.detailFriends')}</h3>
        {friends === undefined ? (
          <Skeleton className="h-14" />
        ) : friends.length === 0 ? (
          // One quiet line, not a 56 px illustration: on sixty of sixty-seven
          // titles this is the normal state, and it must not be the tallest
          // thing in the panel.
          <p className="text-pretty text-xs leading-relaxed text-text-low">
            {t('games.detailFriendsEmpty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((friend) => (
              <li
                key={friend.userId}
                className="well-shallow flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <Avatar name={friend.nickname} size="sm" level={friend.level} status="online" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-semibold leading-snug text-text-high">
                    {friend.nickname}
                  </p>
                  {/* The club's own seat label, so the line works for a hall
                      numbered any way the club likes — and it is the only fact
                      here a player can act on: they can walk over. */}
                  <p className="label-mono flex items-center gap-1 text-[9px] tabular-nums text-text-low">
                    <icons.display size={11} aria-hidden />
                    {t('games.detailFriendSeat', { seat: friend.machineLabel ?? '' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* No gallery: `screenshots` is empty for every title the club ships today
          (see `GameDetail.screenshots`), and a framed row of placeholders would
          claim art that does not exist. The block returns with the asset run in
          C4.1. */}
    </div>
  )
}

/**
 * One requirement, with what the seat has under it.
 *
 * `has === null` is a row about something this payload cannot answer for the
 * machine (free disk space is the station agent's fact, not the club's), and then
 * the second line is absent rather than dashed — an em dash next to "120 GB"
 * reads as "the seat has none".
 */
function ReqRow({
  icon,
  label,
  asks,
  has,
}: {
  icon: React.ReactNode
  label: string
  asks: string
  has: string | null
}) {
  const { t } = useT()

  return (
    <div className="well-shallow flex flex-col gap-1 rounded-md border border-border px-3 py-2">
      <dt className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
        <span className="text-text-medium">{icon}</span>
        {label}
      </dt>
      <dd className="flex min-w-0 flex-col gap-0.5">
        <span className="text-pretty text-xs font-medium leading-snug text-text-high">{asks}</span>
        {has !== null && (
          <span className="text-pretty text-[11px] leading-snug text-text-low">
            {t('games.detailSeatHas', { v: has })}
          </span>
        )}
      </dd>
    </div>
  )
}

/**
 * Total playtime in whole units.
 *
 * Split out because it is the one tile whose *unit* changes with the value, and
 * both halves come from the dictionaries' plural forms rather than from a
 * hardcoded "h"/"min" — Russian and Lithuanian inflect both nouns.
 */
function PlaytimeTile({ seconds }: { seconds: number }) {
  const { t, tp } = useT()
  const { hours, minutes } = formatDurationParts(seconds)

  return (
    <StatTile
      size="sm"
      mono
      icon={<icons.timer size={14} aria-hidden />}
      label={t('games.detailStatPlaytime')}
      value={hours > 0 ? tp('common.hours', hours) : tp('common.minutes', minutes)}
      hint={hours > 0 && minutes > 0 ? tp('common.minutes', minutes) : undefined}
    />
  )
}

/** The most recent start, as a date and time the club's locale writes. */
function LastPlayed({ at }: { at: string | null }) {
  const { locale } = useT()
  return <>{formatDateTime(at, locale)}</>
}
