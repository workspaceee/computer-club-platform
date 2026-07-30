'use client'

import { Countdown, countdownLevel } from '@/components/ui/countdown'
import { HudPlate } from '@/components/ui/hud-plate'
import { Money } from '@/components/ui/money'
import { icons } from '@/lib/icons'
import { formatCoins, sumCents } from '@/lib/money'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import type { LauncherSurface } from '@/lib/launcher-nav'
import type { TimeSource } from '@/lib/types/session'

/**
 * The pocket the running minutes come out of, named (C2.2).
 *
 * A table rather than a conditional, because the set is closed by the server type:
 * add a source to `TimeSource` and this stops compiling until the label exists in
 * every language, which is the only place the omission could otherwise surface —
 * as a blank micro-label in the top bar.
 */
const SOURCE_LABEL: Record<TimeSource, TKey> = {
  pass: 'session.sourcePass',
  wallet: 'session.sourceWallet',
  staff: 'session.sourceStaff',
  postpaid: 'session.sourcePostpaid',
}

/**
 * The seat reading of the top bar (C2.1): what is left of the visit, and which
 * pocket it is coming out of.
 *
 * One plate. The money readings beside it — balance, coins, open tab — moved to
 * `WalletHud` when C2.4 added the euro balance: they change when *money* moves,
 * this one changes every second, and keeping them in one component made the
 * whole block re-render on the tick.
 *
 * The plate reads the *billing mode*, not the surface. That distinction is the
 * one the top bar used to get wrong by proxy: it asked "is this the guest skin?"
 * to decide whether the clock counts down, when the answer belongs to the visit —
 * a postpaid seat is postpaid whoever is sitting on it (F6.3).
 */
export function SessionHud() {
  const { t } = useT()

  const seconds = useStore((s) => s.sessionSeconds)
  const billingMode = useStore((s) => s.billingMode)
  const timeSource = useStore((s) => s.timeSource)
  const setSessionPanelOpen = useStore((s) => s.setSessionPanelOpen)

  // Postpaid: `seconds` is time *used*, and it climbs into the open tab.
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

  // The source rides *in* the time plate rather than on a plate of its own: it is
  // not a second reading, it is what the first one means. A fourth capsule in the
  // bar would also be the one that gets dropped at 360 px, taking the label with
  // it while the ambiguous number stayed.
  const sourceLabel = t(SOURCE_LABEL[timeSource])

  return (
    <>
      {/* The plate is the door to "My session" (C2.3).
          A `button` wrapping the plate rather than an `onClick` on the plate
          itself: `HudPlate` is a `div`, and a clickable div is unreachable by
          keyboard and unannounced as an action. The plate keeps its own border
          and tone, so the button contributes nothing but the hit area, the focus
          ring and the accessible name — `openMine` ("Session details") says what
          *opens*, because the readings inside already say what they are. */}
      <button
        type="button"
        onClick={() => setSessionPanelOpen(true)}
        aria-label={t('session.openMine')}
        aria-haspopup="dialog"
        className="rounded-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      >
        <HudPlate
          tone={timeTone}
          icon={<icons.timer size={14} />}
          // The label has to say which way the number moves: a guest reading
          // "TIME LEFT" next to a rising clock would be told a lie. And it has to
          // say where the minutes came from, because the same `01:23` is a paid-for
          // remainder, money still being spent, or a favour from the admin — three
          // different reasons to act when it runs low (C2.2).
          label={
            <>
              {countsUp ? t('session.sessionTime') : t('session.timeLeft')}
              {/* The dot is decoration: to a screen reader it would read as part of
                  a word, so the source is spelled out once, below, as a sentence. */}
              <span aria-hidden className="opacity-60">{` · ${sourceLabel}`}</span>
              {/* `normal-case`, because the plate's micro-label is tracked caps and a
                  screen reader handed "ИСТОЧНИК ВРЕМЕНИ" may spell it out letter by
                  letter. The sentence is only there to be heard, so it opts out.
                  Hidden from the button's own name too: `aria-label` on the wrapper
                  already replaces this subtree, so the sentence is here for the
                  plate, not for the trigger. */}
              <span className="sr-only normal-case">
                {`. ${t('session.timeSource', { source: sourceLabel })}`}
              </span>
            </>
          }
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
      </button>
    </>
  )
}
