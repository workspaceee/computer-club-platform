'use client'

/**
 * "My session" on the home screen — the HUD plate, opened out (C3.3).
 *
 * The top bar states the remainder in six digits and names the pocket it comes
 * out of. That is the right size for a always-on-screen capsule and the wrong
 * size for the two questions a player actually acts on: *how much of this visit
 * is already gone*, and *what do I press to get more*. The plate cannot answer
 * either — it has no room for a bar and it is not a place to put a button, since
 * every pixel of it is already the door to the panel.
 *
 * So this card is the same fact at the size where it can be acted on: the clock,
 * the arc of the visit behind it, and the grant button — on the first screen of
 * the launcher, where a player looks before the clock is low enough to raise a
 * warning.
 *
 * Three rules, two of them inherited:
 *
 *  1. **The digits are not a third clock.** `sessionSeconds` / `sessionPlayedSeconds`
 *     are read straight from the store — the two values the single interval in
 *     `session-manager.tsx` derives from the server's anchors (F6.3). The card
 *     runs no timer of its own, so it cannot disagree with the plate two
 *     centimetres above it.
 *  2. **The bar is built from those same two values**, not from the payload's
 *     `secondsGranted` / `secondsUsed`. Those are a snapshot: honest when it
 *     lands, stale a minute later, and visibly at odds with the ticking clock
 *     beside them. Played-plus-remaining is the whole arc of the visit, live, and
 *     it behaves correctly when time is granted — the fill *recedes*, because the
 *     visit just got longer, which is exactly what the player bought.
 *  3. **The extend is the panel's extend.** Same `useExtendTime()` hook, same
 *     steps, same offline gate — the card is a second mount of one sequence, not
 *     a second implementation of it (C2.3, C3.2).
 *
 * It replaces the "Time balance" stat tile that used to sit in the row below.
 * That tile showed the same number with no bar, no source and nothing to press,
 * so leaving it in place would have put the same reading on one screen twice.
 */

import { motion } from 'framer-motion'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Countdown, countdownLevel } from '@/components/ui/countdown'
import { Money } from '@/components/ui/money'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/skeleton'
import { useApi } from '@/hooks/use-api'
import { useExtendTime } from '@/hooks/use-extend-time'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { fetchSessionDetail } from '@/lib/mock/api'
import { SOURCE_LABEL } from '@/lib/session-labels'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { sumCents } from '@/lib/money'
import { formatCountdown } from '@/lib/time'

export function SessionCard() {
  const { t } = useT()

  // The clock, from the one place that owns it (F6.3).
  const seconds = useStore((s) => s.sessionSeconds)
  const played = useStore((s) => s.sessionPlayedSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const timeSource = useStore((s) => s.timeSource)
  const timerRunning = useStore((s) => s.timerRunning)
  const sessionExpired = useStore((s) => s.sessionExpired)
  const cart = useStore((s) => s.cart)
  const setSessionPanelOpen = useStore((s) => s.setSessionPanelOpen)

  /**
   * The **same SWR key** the panel uses, so the two share one entry: the card
   * warms the cache the panel opens into, `time.added` invalidates both at once
   * (`EVENT_INVALIDATES`), and a grant made here updates the history there
   * without a second request.
   */
  const detail = useApi('session/detail', () => fetchSessionDetail())
  const refresh = useCallback(() => void detail.mutate(), [detail])
  const extendCtl = useExtendTime(detail.data, refresh)

  const postpaid = billingMode === 'postpaid'
  const openPanel = useCallback(() => setSessionPanelOpen(true), [setSessionPanelOpen])

  // The tab a walk-in is running: the bar order **plus** the time on the seat,
  // both in cents (F7.2) — the same sum the guest HUD shows.
  const tabTotal = sumCents(cartTotalCents(cart), timeChargeCents(seconds))

  // Nothing to report on a finished visit: the expiry screen owns that moment,
  // and a card behind it would be stating a remainder of zero as information.
  if (sessionExpired) return null

  // A prepaid seat's whole arc: what has been played, plus what is still left.
  // Not `SESSION_LENGTH` — an extended visit is longer than the block it was
  // sold as, and a bar against a fixed two hours would read past 100 %.
  const total = played + seconds
  const level = countdownLevel(seconds)
  const barTone = level === 'danger' ? 'danger' : level === 'warning' ? 'warning' : 'primary'
  const sourceLabel = t(SOURCE_LABEL[timeSource])

  return (
    <section aria-labelledby="session-card-heading">
      <SectionHeader
        index="02"
        title={t('home.sessionTitle')}
        headingId="session-card-heading"
        // The card states the visit; the panel holds the rest of it — the seat,
        // the zone, every grant so far. One link rather than repeating any of it
        // here, so the card cannot become a worse copy of the panel.
        action={
          <Button variant="ghost" size="sm" voice="plain" onClick={openPanel}>
            {t('home.sessionDetails')}
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass tick-corners grid gap-5 rounded-xl p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8"
      >
        {/* ── The reading ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
                <icons.timer size={12} aria-hidden />
                {postpaid ? t('session.sessionTime') : t('session.timeLeft')}
                {/* The dot is decoration; the sentence a reader gets is spelled
                    out below, once, in `session.timeSource`. */}
                <span aria-hidden className="opacity-60">{`· ${sourceLabel}`}</span>
                <span className="sr-only normal-case">
                  {`. ${t('session.timeSource', { source: sourceLabel })}`}
                </span>
              </span>
              <Countdown
                seconds={seconds}
                size="xl"
                mode={postpaid ? 'elapsed' : 'remaining'}
                // The alarm belongs to the plate in the top bar, which stays on
                // screen at every scroll position. Two runners on one fact is the
                // spend §4.2 makes deliberately and never twice.
                noPulse
              />
            </div>

            {postpaid && (
              <div className="flex flex-col items-end gap-1">
                <span className="label-mono text-[9px] text-text-low">
                  {t('session.onTabNow')}
                </span>
                <Money value={tabTotal} fromCents size="md" />
              </div>
            )}
          </div>

          {postpaid ? (
            // A walk-in cannot run out, so there is no denominator and therefore
            // no bar: the tab above is the number that grows (F6.3).
            <p className="text-pretty text-xs leading-relaxed text-text-medium">
              {t('session.spendingPostpaid')}
            </p>
          ) : (
            <Progress
              value={played}
              max={total}
              tone={barTone}
              size="sm"
              showValue
              label={t('home.sessionSpentLabel')}
              format={(value, max) =>
                t('home.sessionSpentOf', {
                  spent: formatCountdown(value),
                  total: formatCountdown(max),
                })
              }
            />
          )}

          {/* A stopped clock is the one state where the digits above are true and
              misleading at once — nothing is being spent, and the card has the
              room to say so where the plate does not. */}
          {!timerRunning && (
            <p className="label-mono flex items-center gap-1.5 text-[9px] text-warning">
              <icons.lock size={11} aria-hidden />
              {t('home.sessionPaused')}
            </p>
          )}
        </div>

        {/* ── The action ────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center gap-2 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {detail.isLoading ? (
            // Only this column waits on the fetch. The clock and the bar come
            // from the store and are correct on the first frame, so a skeleton
            // over the whole card would hide readings that had already arrived.
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : detail.error || !detail.data ? (
            // The payload decides which action is honest, so without it the card
            // offers the panel — which states the failure properly and can retry
            // — instead of guessing at an extend the club might refuse.
            <Button
              variant="secondary"
              size="sm"
              onClick={openPanel}
              iconLeft={<icons.timer aria-hidden />}
              className="self-start"
            >
              {t('session.openMine')}
            </Button>
          ) : extendCtl.postpaid ? (
            <p className="text-pretty text-xs leading-relaxed text-text-medium">
              {t('session.postpaidNoExtend')}
            </p>
          ) : extendCtl.steps.length > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="label-mono text-[9px] text-text-low">{t('session.extend')}</span>
                <span className="font-display text-[11px] font-semibold tabular-nums text-text-medium">
                  {t('session.banked', { n: extendCtl.minutesBanked })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {extendCtl.steps.map((minutes) => (
                  <Button
                    key={minutes}
                    variant="secondary"
                    size="sm"
                    loading={extendCtl.extending === minutes}
                    disabled={extendCtl.busy || !extendCtl.sales.canSpend}
                    onClick={() => void extendCtl.extend(minutes)}
                    iconLeft={<icons.add aria-hidden />}
                  >
                    {t('session.extendBy', { n: minutes })}
                  </Button>
                ))}
              </div>
              {/* The banked total above still reads correctly — the minutes are
                  there, they just cannot be granted until the club confirms it.
                  One line, whichever pause is in force: `reason` is exclusive, so
                  a club that is both shut and unreachable gets the sentence with a
                  reopening time rather than two explanations for one dead button. */}
              {extendCtl.sales.reason === 'closed' && (
                <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
                  {t('session.extendClosedHint')}
                </p>
              )}
              {extendCtl.sales.reason === 'offline' && (
                <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
                  {`${t('realtime.salesTitle')} — ${t('realtime.salesHint')}`}
                </p>
              )}
            </>
          ) : (
            // Out of banked minutes, so the honest button is the shop rather than
            // an extend the endpoint would refuse.
            <>
              <p className="text-pretty text-xs leading-relaxed text-text-medium">
                {t('session.buyTimeHint')}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={extendCtl.buyTime}
                iconLeft={<icons.shop aria-hidden />}
                className="self-start"
              >
                {t('session.buyTime')}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </section>
  )
}
