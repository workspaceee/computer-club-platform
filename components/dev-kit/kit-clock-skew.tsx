'use client'

/**
 * The kiosk clock being wrong, on the /dev/kit page (C2.18).
 *
 * The one condition in this block that a browser cannot be walked into: a page
 * cannot set the machine's system time, and waiting for an admin to fix a date
 * mid-session is not a test. So the panel does the only faithful thing available
 * — it replaces `Date.now` with a shifted one for this tab — and shows, live, what
 * each reading does about it.
 *
 * Three numbers per mode, because the point is a comparison and not a value:
 *
 *  - **screen** — what the player sees. Must keep showing the time that was sold.
 *  - **report** — what the club is told (`unreportedSeconds`). Must keep rising by
 *    one second per second, whatever the date says.
 *  - **wall clock** — the same span measured the old way, `Date.now()` minus the
 *    instant the anchor landed. This is the bug, kept on screen deliberately: shift
 *    backwards and it collapses to zero (every minute since the last snapshot lost
 *    to the club), forwards and it jumps an hour (an hour billed to a player who
 *    was not here for it).
 *
 * Replacing `Date.now` is global to the tab, so it moves every other panel on this
 * page too, and it is restored on unmount and whenever the shift returns to zero.
 * That is acceptable here and nowhere else — this route 404s in production.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Row, Spec } from '@/components/dev-kit/kit-shell'
import { Button } from '@/components/ui/button'
import { unreportedSeconds } from '@/lib/store'
import { formatDuration, markSnapshotObserved, remainingSeconds, secondsSince } from '@/lib/time'
import type { ISODateTime } from '@/lib/types/common'

/** The seat this panel anchors: half an hour, prepaid, plus a walk-in tab. */
const SOLD_SECONDS = 30 * 60

interface Anchor {
  serverTime: ISODateTime
  expiresAt: ISODateTime
  runningSince: ISODateTime
  /** The wall-clock instant the anchor landed — only the "old way" column uses it. */
  wallAt: number
}

const HOUR_MS = 60 * 60 * 1000

export function KitClockSkew() {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [shiftHours, setShiftHours] = useState(0)
  const [, setTick] = useState(0)
  // The real `Date.now`, captured once. Read from a ref rather than closed over,
  // so a second shift never stacks on top of an already-shifted clock.
  const realNow = useRef<() => number>(Date.now.bind(Date))

  const reAnchor = useCallback(() => {
    const nowMs = realNow.current()
    const now = new Date(nowMs).toISOString()
    // The same call `applySnapshot` makes: this snapshot is being adopted *now*,
    // on both clocks.
    markSnapshotObserved(now, nowMs)
    setAnchor({
      serverTime: now,
      expiresAt: new Date(nowMs + SOLD_SECONDS * 1000).toISOString(),
      runningSince: now,
      wallAt: nowMs,
    })
  }, [])

  // Anchored in an effect, not in state initialisation: the stamp must be the
  // client's instant, and a server render has no business minting one.
  useEffect(() => {
    reAnchor()
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [reAnchor])

  useEffect(() => {
    const real = realNow.current
    if (shiftHours === 0) {
      Date.now = real
      return
    }
    const offset = shiftHours * HOUR_MS
    Date.now = () => real() + offset
    return () => {
      Date.now = real
    }
  }, [shiftHours])

  if (!anchor) return null

  const base = {
    timerRunning: true as const,
    expiresAt: anchor.expiresAt,
    serverTime: anchor.serverTime,
    runningSince: anchor.runningSince,
    bankedSeconds: 0,
  }
  const wallSpan = Math.max(0, Math.floor((Date.now() - anchor.wallAt) / 1000))

  const prepaid = {
    screen: remainingSeconds({ expiresAt: anchor.expiresAt, serverTime: anchor.serverTime }),
    report: unreportedSeconds({ ...base, billingMode: 'prepaid' }),
    wall: Math.min(SOLD_SECONDS, wallSpan),
  }
  const postpaid = {
    screen: unreportedSeconds({ ...base, billingMode: 'postpaid', expiresAt: null }),
    report: unreportedSeconds({ ...base, billingMode: 'postpaid', expiresAt: null }),
    wall: secondsSince(anchor.runningSince),
  }

  return (
    <Spec
      id="C2.18"
      name="Clock skew"
      note="the report is monotonic; the screen still agrees with the deadline the club sent"
    >
      <Row label="system clock for this tab">
        {([-1, 0, 1] as const).map((hours) => (
          <Button
            key={hours}
            variant={shiftHours === hours ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShiftHours(hours)}
          >
            {hours === 0 ? 'correct' : hours < 0 ? '−1 hour' : '+1 hour'}
          </Button>
        ))}
        <span className="label-mono text-[10px] tabular-nums text-text-low">
          {new Date(Date.now()).toISOString().slice(11, 19)} UTC
        </span>
        <Button variant="ghost" size="sm" onClick={reAnchor}>
          Re-anchor
        </Button>
      </Row>

      <Row label={`prepaid — sold ${SOLD_SECONDS / 60} min`} stack>
        <Readings
          rows={[
            ['screen (remaining)', prepaid.screen],
            ['report (unreported)', prepaid.report],
            ['the old way (Date.now)', prepaid.wall],
          ]}
        />
      </Row>

      <Row label="postpaid — a walk-in tab counting up" stack>
        <Readings
          rows={[
            ['screen (tab length)', postpaid.screen],
            ['report (unreported)', postpaid.report],
            ['the old way (Date.now)', postpaid.wall],
          ]}
        />
      </Row>
    </Spec>
  )
}

function Readings({ rows }: { rows: [string, number][] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-3">
      {rows.map(([label, seconds]) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="label-mono text-[10px] text-text-low">{label}</dt>
          <dd className="font-display text-xl tabular-nums text-text-high">
            {formatDuration(seconds)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
