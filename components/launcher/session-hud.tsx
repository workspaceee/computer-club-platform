'use client'

import { useEffect } from 'react'
import { Countdown, countdownLevel } from '@/components/ui/countdown'
import { HudPlate } from '@/components/ui/hud-plate'
import { icons } from '@/lib/icons'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import type { TimeSource } from '@/lib/types/session'
import { cn } from '@/lib/utils'

/**
 * How long the plate answers a warning for — three beats of `hud-alert-pulse`
 * (1.1 s each in `globals.css`) plus a little slack, so the flag outlives the
 * animation rather than cutting it off mid-ring.
 */
const HUD_PULSE_MS = 3 * 1100 + 200

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

  // The plate answers a warning by pulsing (C2.6). The key is the *timestamp* the
  // warning landed on, which is what makes a second mark restart the animation:
  // React tears the node down and builds it again, so a CSS animation with a
  // finite iteration count runs from zero. A class toggled on the same element
  // would do nothing the second time, because it was already on.
  const warningPulseAt = useStore((s) => s.warningPulseAt)
  const clearWarningPulse = useStore((s) => s.clearWarningPulse)

  // Three beats of `hud-alert-pulse`, then the flag is dropped. Cleared on a timer
  // rather than on `animationend` because the animation does not exist at all when
  // motion is damped — the event would never fire and the store would hold a stale
  // "a warning is showing" forever.
  useEffect(() => {
    if (warningPulseAt === null) return
    const timer = setTimeout(clearWarningPulse, HUD_PULSE_MS)
    return () => clearTimeout(timer)
  }, [warningPulseAt, clearWarningPulse])

  // Postpaid: `seconds` is time *used*, and it climbs into the open tab.
  const countsUp = billingMode === 'postpaid'

  // Thresholds come from the countdown primitive (F1.17) instead of a second
  // copy of "15 and 5 minutes" living in the chrome. On a rising clock there is
  // no threshold to cross, so the plate stays neutral and the digits keep still.
  const level = countsUp ? 'neutral' : countdownLevel(seconds)
  const timeTone = level === 'warning' ? 'warning' : level === 'neutral' ? 'default' : 'danger'

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
          // Remounted on every warning (C2.6) so the finite pulse runs again.
          key={warningPulseAt ?? 'idle'}
          // `text-warning` / `text-danger` is only here to feed the ring its
          // `currentColor`: the plate's own tone already paints its edge, label
          // and icon, and each of those sets its own colour, so nothing inherits
          // this. It means one keyframe serves both marks instead of two rules
          // that could drift apart from the thresholds they belong to.
          className={cn(
            warningPulseAt !== null && 'hud-alert-pulse',
            warningPulseAt !== null &&
              (timeTone === 'warning' ? 'text-warning' : 'text-danger'),
          )}
          // The label of this plate is the longest in the bar — "TIME LEFT ·
          // WALLET" against an `01:23:58` — so it is printed only from `xl`,
          // where the six-section rail no longer competes for the row. It is
          // spoken at every width, and the spoken sentence below is what carries
          // the source when the printed label is gone (C2.4).
          labelAt="xl"
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
