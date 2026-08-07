'use client'

/**
 * "The tournament" on the home screen (C3.8).
 *
 * One event, never a schedule: the card answers "is there something tonight, when
 * does it start, and am I in it" — and the whole list is its own screen (C10), so
 * the header's "All tournaments" is the door to everything this card refuses to
 * become.
 *
 * The decisions worth naming, each of them a bug the card would otherwise ship:
 *
 *  1. **The server picks the one, and the *action*.** `fetchNextTournament()`
 *     answers with the nearest bracket that has not started plus a single word for
 *     what this member may do about it (`register` / `check-in` / `checked-in` /
 *     `registered` / `full`) — the same conditions the two mutations refuse on.
 *     A card re-deriving that from `status`, `slotsFree`, `registered` and
 *     `checkedIn` would be a second definition of eligibility, and it would offer
 *     a button the endpoint is about to reject.
 *
 *  2. **"Can I afford it" is also the server's word.** The fee is two currencies
 *     (`feeCents` *and* `feeCoins`) and the refusal is two error codes, so
 *     `affordable` is computed where the charge happens. The alternative is wallet
 *     arithmetic on the home screen that disagrees with the endpoint the moment
 *     one of the two balances moves — and `wallet.updated` is wired to invalidate
 *     this key precisely because a balance change is what makes the button wrong
 *     (`EVENT_INVALIDATES`).
 *
 *  3. **The countdown starts no interval and reads no local clock.** It re-derives
 *     off `sessionSeconds` — the app's single heartbeat (F6.3) — against
 *     `serverNowMs()`, because `startsAt` was stamped on the server's timeline: a
 *     kiosk whose system clock is ten minutes fast must not promise the bracket
 *     starts ten minutes early. It is a separate component so one ticking readout
 *     does not re-render the facts and the button every second.
 *
 *  4. **Digits below a day, words above it.** A bracket 48 hours out does not need
 *     seconds, and "48:00:00" is a worse sentence than "2 days". Under a day the
 *     digits are the point of the card, so they are the largest thing on it — but
 *     they carry no neon: the running ring on this screen belongs to the session
 *     plate (§4.2), and a second one would spend the same attention twice.
 *
 * Not rendered for a walk-in, for the reason the dailies, the season card and "the
 * club now" are not (C3.4, C3.5, C3.7): an entry is keyed to an account, the fee
 * comes out of a wallet a guest does not have, and `registered` / `checkedIn`
 * would show the previous member's evening. Tournament names, prize lines and the
 * game's own title are admin-authored and printed exactly as the club wrote them
 * (F2.2); everything else here is the frame around them.
 */

import { motion } from 'framer-motion'
import { useCallback, useMemo, useRef, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { countdownLevel, type CountdownLevel } from '@/components/ui/countdown'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { useApi, useInvalidate } from '@/hooks/use-api'
import { useSalesGate } from '@/hooks/use-sales-gate'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import {
  checkInToTournament,
  fetchNextTournament,
  registerForTournament,
  toApiError,
  type NextTournamentBoard,
} from '@/lib/mock/api'
import { formatCoins, formatEur } from '@/lib/money'
import { useStore } from '@/lib/store'
import {
  formatCountdown,
  formatTimeOfDay,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  secondsUntil,
  serverNowMs,
} from '@/lib/time'
import type { ISODateTime } from '@/lib/types/common'
import type { TournamentFormat } from '@/lib/types/tournament'
import { cn } from '@/lib/utils'

/**
 * Slots fill because *other* people register, and no push carries that to this
 * client. So the card polls, at the cadence "the club now" reads the floor with —
 * and the same poll is what turns `announced` into `check-in` on screen without a
 * reload.
 */
const TOURNAMENT_REFRESH_MS = 30_000

const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24

/**
 * Format names, keyed on the enum rather than on the club's own label: the format
 * is *our* vocabulary (a Swiss bracket is a Swiss bracket in three languages), so
 * it is the one line on this card the dictionaries own (F2.2).
 */
/**
 * The countdown's colour, by the product's own urgency bands (F1.17).
 *
 * `Countdown` keeps this map private because its own digits are the session's;
 * this card cannot use that component — a bracket days away is spoken in words,
 * not in `HH:MM:SS` — but it must not invent a second opinion about when a clock
 * turns amber. So the thresholds are imported and only the paint lives here.
 */
const LEVEL_COLOR: Record<CountdownLevel, string> = {
  neutral: 'text-text-high',
  warning: 'text-warning',
  danger: 'text-danger',
  expired: 'text-danger',
}

const FORMAT_KEY: Record<TournamentFormat, TKey> = {
  'single-elim': 'home.tournamentFormatSingleElim',
  'double-elim': 'home.tournamentFormatDoubleElim',
  'round-robin': 'home.tournamentFormatRoundRobin',
  swiss: 'home.tournamentFormatSwiss',
}

export function TournamentCard() {
  const { t, tp } = useT()
  const user = useStore((s) => s.user)
  const toast = useStore((s) => s.toast)
  const setCoins = useStore((s) => s.setCoins)
  const setView = useStore((s) => s.setView)

  // Keyed by the member, so a sign-out cannot leave the next player looking at
  // someone else's entry. The `tournaments` head is what makes a pushed
  // `tournament.call` — or a `wallet.updated` that changes what this player can
  // afford — land here without a subscription of its own (`EVENT_INVALIDATES`).
  const board = useApi(user ? ['tournaments/next', user.email] : null, fetchNextTournament, {
    refreshInterval: TOURNAMENT_REFRESH_MS,
  })
  const invalidate = useInvalidate()

  // Both writes on this card move a seat in a bracket, so one flag covers them:
  // the button is the only control here, and it can be in flight once.
  const [busy, setBusy] = useState(false)
  // The ref beside the state, for the reason the quests card keeps one: a double
  // click arrives before React has re-rendered, and the closure would still see
  // `false` and post the registration twice — at twice the fee.
  const inFlight = useRef(false)

  const sales = useSalesGate()

  const act = useCallback(
    async (data: NextTournamentBoard) => {
      const tournament = data.tournament
      if (!tournament || inFlight.current) return
      inFlight.current = true
      setBusy(true)
      try {
        if (data.action === 'check-in') {
          await checkInToTournament(tournament.id)
          // Only the bracket moved — no money, so nothing else to re-read.
          await invalidate('tournaments')
          toast('success', t('home.tournamentCheckedInToast', { name: tournament.name }))
        } else {
          const result = await registerForTournament(tournament.id)
          // The club's balance, written rather than decremented: a stale card and
          // an arriving `wallet.updated` must not between them charge the fee
          // twice on screen.
          setCoins(result.wallet.coins)
          // `wallet` as well as `tournaments`: the fee left the wallet, and the
          // plate, the ledger and this card's own `affordable` all read that
          // number from the server rather than patching a copy of it.
          await invalidate('tournaments', 'wallet')
          toast('success', t('home.tournamentJoinedToast', { name: tournament.name }))
        }
      } catch (error) {
        // The API answers with a code; the sentence is ours (F2.2).
        toast('error', t(`errors.${toApiError(error).code}` as TKey))
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [invalidate, setCoins, t, toast],
  )

  if (!user) return null

  return (
    <section aria-labelledby="tournament-heading">
      <SectionHeader
        index="08"
        title={t('home.tournamentTitle')}
        headingId="tournament-heading"
        subtitle={t('home.tournamentSubtitle')}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('tournaments')}
            iconLeft={<icons.tournament aria-hidden />}
            // Two words on screen; the reader is told which section they open.
            aria-label={t('home.tournamentAllLabel')}
          >
            {t('home.tournamentAll')}
          </Button>
        }
      />

      {/* No padding on the surface: the poster is a *poster*, so it runs to the
          card's own edge and the frame belongs to the card rather than to a
          thumbnail floating inside it. Every state below therefore carries its
          own padding. */}
      <div className="glass tick-corners overflow-hidden rounded-xl">
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          errorClassName="p-4"
          loading={
            // The final geometry of the poster and of the right-hand column, so
            // the surface does not resize when the bracket lands (C3.11).
            <div className="grid p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-5">
              <Skeleton className="h-[212px] w-full" radius="md" />
              <div className="flex flex-col gap-4 pt-4 lg:pt-1">
                <Skeleton className="h-[60px] w-44" />
                <Skeleton className="h-9 w-full" radius="md" />
                <Skeleton className="h-[52px] w-full" radius="md" />
                <Skeleton className="h-10 w-40" radius="md" />
              </div>
            </div>
          }
          // Nothing announced that has not already started. A bracket in progress
          // is deliberately not shown here: it has no start left to count down to.
          isEmpty={(data) => data.tournament === null}
          empty={
            <div className="p-4">
              <EmptyState
                bare
                size="sm"
                icon={icons.tournament}
                title={t('home.tournamentEmpty')}
                description={t('home.tournamentEmptyBody')}
              />
            </div>
          }
        >
          {(data) => {
            const tournament = data.tournament
            if (!tournament) return null

            const paid = tournament.feeCents > 0 || tournament.feeCoins > 0
            // The fee, in whichever currencies the club charges. Money keeps its
            // own formatter and coins keep theirs, and a bracket charging both
            // states both rather than picking one to hide.
            const fee = !paid
              ? t('home.tournamentFree')
              : [
                  tournament.feeCents > 0 ? formatEur(tournament.feeCents) : null,
                  tournament.feeCoins > 0
                    ? tp('common.coins', tournament.feeCoins, {
                        n: formatCoins(tournament.feeCoins),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' + ')

            // A free bracket is not a sale, so the money gate does not touch it:
            // a closed or unreachable club cannot take €5, but it also has no
            // reason to refuse a sign-up that costs nothing.
            const gated = paid && !sales.canSpend
            const joinable = data.action === 'register'
            const affordable = data.affordable

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"
              >
                {/* ── What is on, and on what ───────────────────────────── */}
                {/* A poster, not a thumbnail: it runs to the card's own edges and
                    is separated from the readout by the card's hairline rather
                    than by a margin. It carries identity and price only — the
                    club's name for the evening, the title it is played on, and
                    what admission costs, printed in the corner the way a real
                    poster prints it. */}
                <div className="relative min-h-[196px] overflow-hidden border-b border-border lg:min-h-[248px] lg:border-b-0 lg:border-r">
                  {data.game ? (
                    <>
                      {/* `hideTitle`: the club's *tournament* name is the headline
                          here, so the cover must not anchor the game's name to the
                          same bottom edge. */}
                      <GameCover
                        game={data.game}
                        hideTitle
                        className="h-full w-full"
                        sizes="(min-width: 1024px) 300px, 100vw"
                      />
                      <div aria-hidden className="veil-cover-title absolute inset-0" />
                    </>
                  ) : (
                    // The library lost the title the bracket is played on — the
                    // event is still real, so the card keeps its frame instead of
                    // collapsing.
                    <div className="well-shallow flex h-full w-full items-center justify-center">
                      <IconTile icon={icons.tournament} size="lg" variant="primary" ticks />
                    </div>
                  )}

                  {/* The price of entry, as a tag on the artwork. A number alone
                      in a poster's corner reads as a price without a caption, so
                      the caption is given to assistive tech only — and a free
                      bracket says so in words instead of showing "€0.00". */}
                  <div className="absolute inset-x-0 top-0 flex justify-end p-3">
                    <span
                      className={cn(
                        'pill-deep label-mono rounded-sm border px-2 py-1 text-[9px] backdrop-blur-sm',
                        paid ? 'border-border/80 text-text-high' : 'border-success/40 text-success',
                      )}
                    >
                      <span className="sr-only">{`${t('home.tournamentEntry')}: `}</span>
                      {fee}
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
                    {/* Club copy, printed as the club wrote it (F2.2). */}
                    <p className="text-balance font-display text-xl font-bold uppercase leading-[1.05] tracking-tight text-text-high">
                      {tournament.name}
                    </p>
                    <p className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
                      <icons.games size={11} aria-hidden />
                      <span className="truncate normal-case">{tournament.gameName}</span>
                    </p>
                  </div>
                </div>

                {/* ── When, who is in, what it pays, and the one thing to press ── */}
                <div className="flex flex-col gap-4 p-4 lg:p-5">
                  <StartsIn
                    startsAt={tournament.startsAt}
                    format={t(FORMAT_KEY[tournament.format])}
                    formatLabel={t('home.tournamentFormat')}
                  />

                  {/* The bracket drawn as what it is: a fixed number of seats,
                      filling up. A count in a box states the same fact and lets a
                      player read "4" as roomy; sixteen pips with twelve of them
                      already dark do not. */}
                  <SeatMeter
                    label={t('home.tournamentSeats')}
                    slots={tournament.slots}
                    slotsFree={tournament.slotsFree}
                    // The club's own plural already contains the noun ("4 of 16
                    // slots left"), so nothing above it repeats the word.
                    caption={
                      tournament.slotsFree > 0
                        ? tp('home.tournamentSlots', tournament.slotsFree, {
                            total: tournament.slots,
                          })
                        : t('home.tournamentNoSlots')
                    }
                  />

                  {tournament.prizes[0] && (
                    // What the evening pays, given a row of its own: it is the
                    // reason to enter, and it was the fourth grey box in a grid of
                    // four before this.
                    <div className="well-shallow flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                      <IconTile icon={icons.gift} size="sm" variant="primary" />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="label-mono text-[9px] text-text-low">
                          {t('home.tournamentPrize')}
                        </p>
                        {/* The club promises the prize in its own words. */}
                        <p className="text-pretty text-sm font-semibold leading-snug text-text-high">
                          {tournament.prizes[0].label}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* One slot, five mutually exclusive outcomes — join it, confirm
                      the seat, it is confirmed, it is held, or there is no seat to
                      take. The last two are badges rather than dead buttons:
                      there is nothing to try.

                      `mt-auto` on the group: the action and its one explanation sit
                      on the column's bottom edge, so the button lands level with
                      the poster's foot instead of floating in the middle of
                      whatever height the prize line happens to take. */}
                  <div className="mt-auto flex flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {joinable ? (
                      <Button
                        variant="primary"
                        size="md"
                        loading={busy}
                        // Off rather than posting a registration the endpoint
                        // would refuse: either the wallet does not cover the fee
                        // or the club cannot take money at all. Both reasons are
                        // stated in words below.
                        disabled={!affordable || gated}
                        onClick={() => void act(data)}
                        iconLeft={<icons.tournament aria-hidden />}
                        // One word on screen, so the accessible name carries the
                        // event being joined.
                        aria-label={t('home.tournamentJoinLabel', { name: tournament.name })}
                      >
                        {t('home.tournamentJoin')}
                      </Button>
                    ) : data.action === 'check-in' ? (
                      <Button
                        variant="primary"
                        size="md"
                        loading={busy}
                        onClick={() => void act(data)}
                        iconLeft={<icons.check aria-hidden />}
                        aria-label={t('home.tournamentCheckInLabel', { name: tournament.name })}
                      >
                        {t('home.tournamentCheckIn')}
                      </Button>
                    ) : data.action === 'checked-in' ? (
                      <Badge tone="success" variant="soft" size="sm">
                        {t('home.tournamentCheckedIn')}
                      </Badge>
                    ) : data.action === 'registered' ? (
                      <Badge tone="info" variant="soft" size="sm">
                        {t('home.tournamentRegistered')}
                      </Badge>
                    ) : (
                      <Badge tone="neutral" variant="soft" size="sm">
                        {t('home.tournamentFull')}
                      </Badge>
                    )}
                  </div>

                  {/* Why the button is off — one line, and only while it is off.
                      The wallet comes first: it is the reason the player can act
                      on, and `reason` from the gate is already exclusive so a club
                      that is both shut and unreachable never collects two
                      sentences (C2.11, C2.12). */}
                  {joinable && !affordable && (
                    <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
                      {t('home.tournamentCantAfford')}
                    </p>
                  )}
                  {joinable && affordable && gated && sales.reason === 'closed' && (
                    <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
                      {t('home.tournamentClosedHint')}
                    </p>
                  )}
                  {joinable && affordable && gated && sales.reason === 'offline' && (
                    <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
                      {`${t('realtime.salesTitle')} — ${t('realtime.salesHint')}`}
                    </p>
                  )}
                  </div>
                </div>
              </motion.div>
            )
          }}
        </DataBoundary>
      </div>
    </section>
  )
}

/**
 * The number the card exists for: how long until the bracket starts.
 *
 * Its own component so the heartbeat it subscribes to re-renders a readout rather
 * than the facts and the button beside it, and so the arithmetic sits next to the
 * reason for it: `startsAt` is a **server** stamp, so it is measured against
 * `serverNowMs()`.
 *
 * The digits are `aria-hidden` on purpose. A screen reader walking a clock that
 * changes every second reads noise, and the two lines that carry the same fact
 * statically — the wall-clock start below, and one coarse sentence for assistive
 * tech — say it once and correctly.
 */
function StartsIn({
  startsAt,
  format,
  formatLabel,
}: {
  startsAt: ISODateTime
  /** Named format of the bracket — metadata, so it rides beside the clock. */
  format: string
  formatLabel: string
}) {
  const { t, tp, locale } = useT()
  // The app's one clock, used here as a heartbeat only (F6.3): the value is the
  // session's remainder and means nothing on this card.
  const tick = useStore((s) => s.sessionSeconds)

  const view = useMemo(() => {
    const seconds = secondsUntil(startsAt, serverNowMs())
    // The clock has run out but the club has not started the bracket yet — a real
    // minute in the life of an event, and not the same thing as "under way".
    if (seconds <= 0)
      return { display: null, level: 'danger' as const, spoken: t('home.tournamentStartingNow') }

    // Above a day, words: seconds are noise at that distance, and "48:00:00" is a
    // worse sentence than "2 days".
    if (seconds >= SECONDS_PER_DAY) {
      const days = Math.floor(seconds / SECONDS_PER_DAY)
      const label = tp('common.days', days)
      return {
        display: label,
        level: 'neutral' as const,
        spoken: `${t('home.tournamentStartsIn')} ${label}`,
      }
    }

    const hours = Math.floor(seconds / SECONDS_PER_HOUR)
    const coarse =
      hours > 0 ? tp('common.hours', hours) : tp('common.minutes', Math.floor(seconds / SECONDS_PER_MINUTE))
    return {
      display: formatCountdown(seconds),
      // The product's one definition of "how urgent is this clock" (F1.17),
      // borrowed rather than re-thresholded here: a bracket fifteen minutes out
      // and a session fifteen minutes from ending mean the same thing to a player
      // walking past the screen.
      level: countdownLevel(seconds),
      spoken: `${t('home.tournamentStartsIn')} ${coarse}`,
    }
    // `tick` is what makes this live; it is intentionally unused in the body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt, t, tp, tick])

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span aria-hidden className="label-mono text-[9px] text-text-low">
          {t('home.tournamentStartsIn')}
        </span>
        {/* `font-clock`, and colour at the thresholds — but no pulse: the one
            running, glowing thing on this screen is the session plate (§4.2), and
            a second one would spend the same attention twice. */}
        {view.display ? (
          <span
            aria-hidden
            className={cn(
              'font-clock text-5xl font-semibold leading-[0.85] tabular-nums',
              LEVEL_COLOR[view.level],
            )}
          >
            {view.display}
          </span>
        ) : (
          <span
            aria-hidden
            className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-primary"
          >
            {t('home.tournamentStartingNow')}
          </span>
        )}
        {/* The same fact, once, for assistive tech — no `aria-live`, so it is read
            on demand rather than announced every second. */}
        <span className="sr-only">{view.spoken}</span>
      </div>

      {/* The two static facts about the start, right-aligned against the digits:
          when it actually begins, and what is being played. A duration is not a
          plan; a time of day is — 24-hour in all three locales (F3.7). */}
      <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
        <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-medium tabular-nums">
          <icons.timer size={11} aria-hidden />
          {t('home.tournamentStartsAt', { time: formatTimeOfDay(startsAt, locale) })}
        </span>
        <span className="label-mono text-[9px] text-text-low">
          <span className="sr-only">{`${formatLabel}: `}</span>
          {format}
        </span>
      </div>
    </div>
  )
}

/**
 * The bracket as seats: one pip per slot, the taken ones dark, the free ones lit.
 *
 * The card's one piece of drawn information, and it earns the space — "4 of 16
 * left" is a sentence a player skims past, while four lit pips against twelve
 * dark ones is a shape they read without counting. The pips flex, so a bracket of
 * eight and a bracket of sixty-four both fill the same strip.
 *
 * Decorative by design: the strip is `aria-hidden` and the same fact is spoken by
 * the club's own plural in the caption beside it.
 */
function SeatMeter({
  label,
  caption,
  slots,
  slotsFree,
}: {
  label: string
  caption: string
  slots: number
  slotsFree: number
}) {
  const total = Math.max(slots, 0)
  const free = Math.min(Math.max(slotsFree, 0), total)
  const taken = total - free

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-mono text-[9px] text-text-low">{label}</span>
        <span
          className={cn(
            'text-xs font-semibold leading-none',
            free > 0 ? 'text-text-high' : 'text-text-low',
          )}
        >
          {caption}
        </span>
      </div>
      {total > 0 && (
        <div aria-hidden className="flex items-stretch gap-[3px]">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 min-w-[2px] flex-1 rounded-[1px]',
                i < taken ? 'bg-text-low/25' : 'bg-primary',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

