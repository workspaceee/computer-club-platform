'use client'

/**
 * "My session" — the panel behind the HUD (C2.3).
 *
 * The top bar states two numbers and one word: what is left, and which pocket it
 * is coming out of. This is where the rest of the visit lives — the seat, the
 * zone, when it started, what the source *means*, every extension so far, and the
 * two actions a player takes when the clock is running low.
 *
 * Three rules shape the file:
 *
 *  1. **The digits keep coming from the store.** `fetchSessionDetail` carries a
 *     snapshot so the panel is honest the moment it opens, but the clock on
 *     screen is `sessionSeconds` — the value the one interval of
 *     `session-manager.tsx` derives (F6.3). A second countdown ticking off a
 *     fetched payload is exactly the drift that rule exists to prevent, and it
 *     would show a *different* remainder from the top bar two centimetres above.
 *  2. **Everything else comes from one read.** Seat, zone, start, grants and the
 *     banked pass minutes live in four different places server-side; fetching
 *     them separately would render a seat from one instant beside a history from
 *     another.
 *  3. **The panel never decides what it cannot know.** Which button it offers
 *     comes from `minutesBanked` and the billing mode in the payload, not from
 *     the client's own wallet — offering an extend the endpoint then refuses with
 *     `insufficientFunds` is worse than sending the player to the shop.
 */

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { DataBoundary } from '@/components/data-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Money } from '@/components/ui/money'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { icons } from '@/lib/icons'
import {
  callStaff,
  extendSession,
  fetchSessionDetail,
  toApiError,
  type SessionDetail,
  type SessionGrant,
  type SessionGrantSource,
} from '@/lib/mock/api'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { sumCents } from '@/lib/money'
import { formatDateTime, formatTimeOfDay, secondsToMinutes } from '@/lib/time'
import type { TimeSource } from '@/lib/types/session'
import { cn } from '@/lib/utils'

/**
 * What the source *costs*, in a sentence. Keyed off the closed server type like
 * `SESSION_LABEL` in the HUD, so adding a `TimeSource` stops the build here
 * rather than rendering a blank paragraph under a heading that promised one.
 */
const SPENDING_BODY: Record<TimeSource, TKey> = {
  pass: 'session.spendingPass',
  wallet: 'session.spendingWallet',
  staff: 'session.spendingStaff',
  postpaid: 'session.spendingPostpaid',
}

const SOURCE_LABEL: Record<TimeSource, TKey> = {
  pass: 'session.sourcePass',
  wallet: 'session.sourceWallet',
  staff: 'session.sourceStaff',
  postpaid: 'session.sourcePostpaid',
}

/** Which act a history row records — the line, not the pocket. */
const GRANT_LABEL: Record<SessionGrantSource, TKey> = {
  extend: 'session.historyExtend',
  staff: 'session.historyStaff',
  correction: 'session.historyCorrection',
}

/**
 * Minute steps the extend offers.
 *
 * Fixed rather than free entry: the club sells time in blocks, and a text field
 * would let a player ask for 7 minutes and be refused by a validation error that
 * explains nothing. Each chip is filtered against what is actually banked below,
 * so nothing on screen can fail for lack of minutes.
 */
const EXTEND_STEPS = [15, 30, 60] as const

export function SessionDetailModal() {
  const open = useStore((s) => s.sessionPanelOpen)
  const setOpen = useStore((s) => s.setSessionPanelOpen)

  return <SessionDetailPanel open={open} onClose={() => setOpen(false)} />
}

function SessionDetailPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()

  // `null` key while closed: SWR does not fetch, so opening the panel is what
  // asks the club — and a station sitting on the launcher all evening is not
  // polling a detail endpoint nobody is looking at.
  const detail = useApi(open ? 'session/detail' : null, () => fetchSessionDetail())

  /**
   * Realtime, on top of the global invalidation.
   *
   * `useRealtimeRevalidation` already refreshes every `session/*` key on
   * `time.added`, `session.paused` and friends (`EVENT_INVALIDATES`), so this
   * subscription is *not* a second fetch path — it exists to be suspended.
   * `enabled: open` keeps a closed panel from re-rendering on every frame the
   * club pushes, and re-arms the moment it opens.
   */
  useRealtimeEvent(
    ['time.added', 'session.paused', 'session.resumed', 'session.moved'],
    () => {
      void detail.mutate()
    },
    open,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={<icons.timer size={14} aria-hidden />}
      title={t('session.mine')}
      size="md"
      // The two actions ride in the modal's own pinned footer rather than at the
      // end of the scroll body. A player opens this panel *because* the clock is
      // low, and a long grant history would push "Extend" and "Call the admin"
      // under the fold — the one place in the panel where being one scroll away
      // costs minutes. Rendered only once the payload has landed, because which
      // action is honest depends on `minutesBanked` and the billing mode.
      footer={
        detail.data ? <SessionActions detail={detail.data} onRefresh={detail.mutate} /> : undefined
      }
    >
      <DataBoundary
        state={detail}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        }
      >
        {(data) => <SessionDetailBody detail={data} onRefresh={detail.mutate} />}
      </DataBoundary>
    </Modal>
  )
}

function SessionDetailBody({
  detail,
  onRefresh,
}: {
  detail: SessionDetail
  onRefresh: () => void
}) {
  const { t, tp, locale } = useT()

  // The clock, from the one place that owns it (F6.3). `billingMode` comes from
  // the payload rather than the store for the same reason the label does: this
  // panel describes the *visit* the server just reported.
  const seconds = useStore((s) => s.sessionSeconds)
  const cart = useStore((s) => s.cart)

  const { snapshot, grants } = detail
  const postpaid = snapshot.billingMode === 'postpaid'
  const source = snapshot.timeSource

  // Same sum the HUD shows a walk-in: the bar order **plus** the time on the
  // seat, both in cents (F7.2). A tab that left the time term out would quietly
  // understate the bill on the one screen that explains the bill.
  const tabTotal = useMemo(
    () => sumCents(cartTotalCents(cart), timeChargeCents(seconds)),
    [cart, seconds],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* ── The visit, as four facts ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label-mono text-[9px] text-text-low">
            {postpaid ? t('session.sessionTime') : t('session.timeLeft')}
          </span>
          <Countdown
            seconds={seconds}
            size="xl"
            mode={postpaid ? 'elapsed' : 'remaining'}
            // The panel is a card, not a takeover: the pulse belongs to the HUD
            // plate that stays visible behind it, and two runners on one fact is
            // the spend §4.2 forbids.
            noPulse
          />
        </div>
        {postpaid && (
          <div className="flex flex-col items-end gap-1">
            <span className="label-mono text-[9px] text-text-low">{t('session.onTabNow')}</span>
            <Money value={tabTotal} fromCents size="md" />
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact
          icon={<icons.display size={14} aria-hidden />}
          label={t('session.seat')}
          value={detail.machineLabel}
          hint={detail.zoneName || undefined}
        />
        <Fact
          icon={<icons.clock size={14} aria-hidden />}
          label={t('session.startedAt')}
          value={formatTimeOfDay(detail.startedAt, locale)}
        />
        <Fact
          icon={<icons.timer size={14} aria-hidden />}
          label={t('session.playedSoFar')}
          value={tp('common.minutes', secondsToMinutes(detail.secondsUsed))}
        />
      </dl>

      {/* ── What is being spent ──────────────────────────────────────── */}
      <section className="well-shallow flex flex-col gap-2 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <SourceIcon source={source} />
          <h3 className="label-mono text-[9px] text-text-low">{t('session.spending')}</h3>
          <span className="font-display text-[11px] font-bold uppercase tracking-wide text-text-high">
            {t(SOURCE_LABEL[source])}
          </span>
        </div>
        <p className="text-pretty text-xs leading-relaxed text-text-medium">
          {t(SPENDING_BODY[source])}
        </p>
      </section>

      {/* ── History, out of the ledger ───────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-[9px] text-text-low">{t('session.history')}</h3>
        {grants.length === 0 ? (
          // `bare` and without the icon tile: the ledger is empty for most of a
          // visit, and a 56 px circle here made the *absence* of history the
          // tallest thing in the panel — taller than the clock it explains.
          <EmptyState
            bare
            size="sm"
            title={t('session.historyEmpty')}
            description={t('session.historyEmptyBody')}
            className="py-4"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {grants.map((grant) => (
              <GrantRow key={grant.id} grant={grant} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {/* The two actions are not here: they live in the modal's pinned footer
          (`SessionActions`), so a long history cannot push them out of reach. */}
    </div>
  )
}

/**
 * Extend, and call the admin — the panel's footer (C2.3).
 *
 * Separate from the body because it is mounted somewhere else in the modal, and
 * because it owns the only mutating state in the file: nothing here re-renders
 * when the clock ticks.
 */
function SessionActions({ detail, onRefresh }: { detail: SessionDetail; onRefresh: () => void }) {
  const { t } = useT()

  const toast = useStore((s) => s.toast)
  const setView = useStore((s) => s.setView)
  const setSessionPanelOpen = useStore((s) => s.setSessionPanelOpen)
  const applySnapshot = useStore((s) => s.applySnapshot)

  const [extending, setExtending] = useState<number | null>(null)
  const [calling, setCalling] = useState(false)
  const [called, setCalled] = useState(false)

  const { minutesBanked } = detail
  const postpaid = detail.snapshot.billingMode === 'postpaid'

  const steps = useMemo(
    () => EXTEND_STEPS.filter((minutes) => minutes <= minutesBanked),
    [minutesBanked],
  )

  const extend = useCallback(
    async (minutes: number) => {
      setExtending(minutes)
      try {
        // The response is a snapshot, so the deadline moves through the one write
        // path the clock has (`applySnapshot`) — there is no counter to patch and
        // no way for the grant to be lost or applied twice.
        const next = await extendSession(minutes)
        applySnapshot(next)
        onRefresh()
        toast('success', t('session.extendedToast', { n: minutes }))
      } catch (error) {
        toast('error', t(`errors.${toApiError(error).code}` as TKey))
      } finally {
        setExtending(null)
      }
    },
    [applySnapshot, onRefresh, t, toast],
  )

  const call = useCallback(async () => {
    setCalling(true)
    try {
      await callStaff({ category: 'other' })
      setCalled(true)
      toast('info', t('session.callAdminSent'))
    } catch (error) {
      toast('error', t(`errors.${toApiError(error).code}` as TKey))
    } finally {
      setCalling(false)
    }
  }, [t, toast])

  const buyTime = useCallback(() => {
    setSessionPanelOpen(false)
    setView('shop')
  }, [setSessionPanelOpen, setView])

  return (
    // `w-full`: the modal's footer is a `justify-end` row, and this is a column
    // that has to span it.
    <div className="flex w-full flex-col gap-3">
      {postpaid ? (
        // Nothing to extend *to*: a walk-in's clock counts up into the tab, so
        // an "Extend" here would offer to buy time the seat never sold (F6.3).
        <p className="text-pretty text-xs leading-relaxed text-text-medium">
          {t('session.postpaidNoExtend')}
        </p>
      ) : steps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-mono text-[9px] text-text-low">{t('session.extend')}</span>
            <span className="font-display text-[11px] font-semibold tabular-nums text-text-medium">
              {t('session.banked', { n: minutesBanked })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {steps.map((minutes) => (
              <Button
                key={minutes}
                variant="secondary"
                size="sm"
                loading={extending === minutes}
                disabled={extending !== null}
                onClick={() => void extend(minutes)}
                iconLeft={<icons.add aria-hidden />}
              >
                {t('session.extendBy', { n: minutes })}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        // No banked minutes, so the honest button is the shop rather than an
        // extend the endpoint would refuse.
        <div className="flex flex-col gap-2">
          <p className="text-pretty text-xs leading-relaxed text-text-medium">
            {t('session.buyTimeHint')}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={buyTime}
            iconLeft={<icons.shop aria-hidden />}
            className="self-start"
          >
            {t('session.buyTime')}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          voice="plain"
          loading={calling}
          // Already called: the button stays on screen and stops being an
          // action. Hiding it would leave the player wondering whether the tap
          // registered at all, and a second call collapses into the same open
          // thread server-side anyway.
          disabled={called || calling}
          onClick={() => void call()}
          iconLeft={<icons.support aria-hidden />}
          className="self-start"
        >
          {called ? t('session.callAdminAgain') : t('session.callAdmin')}
        </Button>
        {called && (
          // Announced, not just drawn: the player who pressed the button may
          // not be looking at the row that changed.
          <p role="status" className="text-xs leading-relaxed text-success">
            {t('session.callAdminSent')}
          </p>
        )}
      </div>
    </div>
  )
}

/** One labelled fact of the visit. `dl` semantics, so it reads as a pair. */
function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 label-mono text-[9px] text-text-low">
        <span className="text-text-medium">{icon}</span>
        {label}
      </dt>
      <dd className="flex flex-col">
        <span className="font-display text-sm font-bold tabular-nums text-text-high">{value}</span>
        {hint && <span className="text-xs text-text-low">{hint}</span>}
      </dd>
    </div>
  )
}

function SourceIcon({ source }: { source: TimeSource }) {
  const Icon =
    source === 'pass'
      ? icons.season
      : source === 'wallet'
        ? icons.wallet
        : source === 'staff'
          ? icons.staff
          : icons.bill
  return <Icon size={14} className="shrink-0 text-primary" aria-hidden />
}

/**
 * One movement of time.
 *
 * The sign lives in the copy (`historyMinutes` / `historyMinutesNegative`) rather
 * than in a concatenation here: a minus printed by `+${n}` on a negative number
 * reads "+-30 min", and on an admin correction the direction is the whole
 * meaning.
 */
function GrantRow({ grant, locale }: { grant: SessionGrant; locale: string }) {
  const { t } = useT()
  const negative = grant.seconds < 0
  const minutes = secondsToMinutes(Math.abs(grant.seconds))

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs font-medium text-text-high">
          {t(GRANT_LABEL[grant.source])}
        </span>
        <span className="text-[11px] tabular-nums text-text-low">
          {formatDateTime(grant.at, locale)}
          {grant.note ? ` · ${grant.note}` : ''}
        </span>
      </div>
      <span
        className={cn(
          'shrink-0 font-display text-xs font-bold tabular-nums',
          negative ? 'text-danger' : 'text-success',
        )}
      >
        {negative
          ? t('session.historyMinutesNegative', { n: minutes })
          : t('session.historyMinutes', { n: minutes })}
      </span>
    </li>
  )
}
