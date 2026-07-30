'use client'

import { Countdown, countdownLevel } from '@/components/ui/countdown'
import { HudPlate } from '@/components/ui/hud-plate'
import { Money } from '@/components/ui/money'
import { icons } from '@/lib/icons'
import { formatCoins, sumCents } from '@/lib/money'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { useT } from '@/lib/i18n/provider'
import type { LauncherSurface } from '@/lib/launcher-nav'

/**
 * The right-hand readings of the top bar (C2.1): what is left of the seat, and
 * what the visit is worth so far.
 *
 * Two plates, and which second one you get is the whole difference between the
 * surfaces: a member sees a coin balance, a walk-in sees the open tab. A guest
 * never earns coins, so a zero coin balance on that surface would be a lie
 * (F6.2), and a member has no tab to run.
 *
 * The time plate reads the *billing mode*, not the surface. That distinction is
 * the one the top bar used to get wrong by proxy: it asked "is this the guest
 * skin?" to decide whether the clock counts down, when the answer belongs to the
 * visit — a postpaid seat is postpaid whoever is sitting on it (F6.3).
 */
export function SessionHud({ surface }: { surface: LauncherSurface }) {
  const { t } = useT()

  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const coins = useStore((s) => s.coins)
  const cart = useStore((s) => s.cart)

  const isGuest = surface === 'guest'
  // Postpaid: `seconds` is time *used*, and it climbs into the tab below.
  const countsUp = billingMode === 'postpaid'

  // Thresholds come from the countdown primitive (F1.17) instead of a second
  // copy of "15 and 5 minutes" living in the chrome. On a rising clock there is
  // no threshold to cross, so the plate stays neutral and the digits keep still.
  const level = countsUp ? 'neutral' : countdownLevel(seconds)
  const timeTone = level === 'warning' ? 'warning' : level === 'neutral' ? 'default' : 'danger'

  // What the walk-in owes so far: the bar order **plus** the time on the seat.
  // The counter bills used time by the minute, so leaving that term out would
  // show a tab that quietly understates the bill (F6.3). Both terms are cents,
  // so this is a plain sum — no float round-trip (F7.2).
  const tabTotal = sumCents(cartTotalCents(cart), timeChargeCents(seconds))

  return (
    <>
      <HudPlate
        tone={timeTone}
        icon={<icons.timer size={14} />}
        // The label has to say which way the number moves: a guest reading
        // "TIME LEFT" next to a rising clock would be told a lie.
        label={countsUp ? t('session.sessionTime') : t('session.timeLeft')}
        value={
          <Countdown
            seconds={seconds}
            size="sm"
            mode={countsUp ? 'elapsed' : 'remaining'}
            // The plate itself no longer pulses. It used to scale the whole
            // capsule *and* let the digits pulse — two runners on different
            // periods for one fact, which §4.2 spends deliberately and never
            // twice. The digits keep the alarm because they are the fact.
          />
        }
      />

      {isGuest ? (
        <HudPlate
          icon={<icons.bill size={14} />}
          label={t('guest.tab')}
          value={<Money value={tabTotal} fromCents size="sm" />}
        />
      ) : (
        <HudPlate
          tone="coin"
          icon={<icons.coins size={14} />}
          label={t('wallet.coinBalance')}
          value={formatCoins(coins)}
        />
      )}
    </>
  )
}
