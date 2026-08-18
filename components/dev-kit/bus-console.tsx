'use client'

/**
 * Admin-action emulator (F4.4). MOCK ONLY — goes away with `lib/mock/*` in Stage 4.
 *
 * The left column is the *staff* side: every button calls `admin-sim`, which
 * writes the mock db and publishes the matching frame, exactly like the real
 * server will. The right column is the *client* side: the raw frame log plus a
 * live session readout fed only by pushes.
 *
 * That split is the whole point — it lets the entire reactive surface of the
 * launcher be verified before a single line of the admin app exists, including
 * the F4.5 outage story via "Cut the link".
 */

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { useRealtimeStatus } from '@/components/realtime/realtime-provider'
import { useRealtimeAny } from '@/hooks/use-realtime'
import { setScrimPeek } from '@/lib/dev-flags'
import * as admin from '@/lib/realtime/admin-sim'
import { mockBus, type BusLogEntry } from '@/lib/realtime/mock-bus'
import type { AnyRealtimeEvent, RealtimeStatus } from '@/lib/realtime/events'
import { fetchCurrentSession, heartbeat } from '@/lib/mock/api/session'
import type { SessionReport, SessionSnapshot } from '@/lib/types/session'
import type { ID } from '@/lib/types/common'
import { formatCountdown } from '@/lib/time'
import { useStore } from '@/lib/store'

/* ------------------------------------------------------------------ *
 * Action catalogue
 * ------------------------------------------------------------------ */

interface Action {
  label: string
  /** Returns `null` when the fixture has nothing to act on. */
  run: () => unknown
  tone?: 'primary' | 'secondary' | 'danger' | 'success'
}

interface ActionGroup {
  id: string
  title: string
  note: string
  actions: Action[]
}

const GROUPS: ActionGroup[] = [
  {
    id: 'time',
    title: 'Time & session',
    note: 'The headline rows of MVP §7 — the launcher must react in under a second.',
    actions: [
      { label: '+15 min', run: () => admin.grantTime(15), tone: 'success' },
      { label: '+60 min', run: () => admin.grantTime(60), tone: 'success' },
      { label: '−10 min', run: () => admin.deductTime(10) },
      { label: 'Warn: 10 min left', run: () => admin.warnLowTime(10) },
      { label: 'Warn: 2 min left', run: () => admin.warnLowTime(2) },
      {
        // A pause raised from here lands *before* a sign-in, so the station
        // answers it with `SessionPaused` on the lock screen (C1.10) — which is
        // correct, and which means this button cannot show the paused *launcher*.
        // That state has its own switch: `/?seat=pause` (C3.3, `lib/dev-flags.ts`).
        label: 'Pause seat',
        run: () => {
          // Any peek armed by that switch is disarmed here: a pause pressed on
          // this page is the product's, scrim included.
          setScrimPeek(false)
          return admin.pauseSession('staff')
        },
      },
      {
        label: 'Resume seat',
        run: () => {
          // Back to the product's behaviour, so the next pause covers the screen
          // like a real one — a peek left armed would be a silent lie about which
          // overlays this build shows.
          setScrimPeek(false)
          return admin.resumeSession()
        },
        tone: 'success',
      },
      { label: 'Move to free seat', run: () => admin.moveSession() },
      // The seed of C1.12, and the only button here that is not a staff action:
      // it relocates the fixture's own live row to PC #05 and frees this chair,
      // which is the state a second station would have left behind. Sign in on
      // the lock screen afterwards and the refusal is `activeElsewhere` rather
      // than "the seat is taken" — the transfer card carries its own
      // "Approve as admin" next to the request it raised.
      { label: 'Seed DemoPlayer on PC-05', run: () => admin.seatSessionElsewhere('pc-05') },
      { label: 'End session', run: () => admin.endSession('staff'), tone: 'danger' },
    ],
  },
  {
    id: 'bar',
    title: 'Bar & tab',
    note: 'Order flow is new → accepted → preparing → delivering → delivered.',
    actions: [
      { label: 'Advance order', run: () => admin.advanceOrder() },
      { label: 'Cancel: out of stock', run: () => admin.cancelOrder('outOfStock'), tone: 'danger' },
      { label: 'Add Red Bull to tab', run: () => admin.addTabItem() },
      { label: 'Settle tab', run: () => admin.settleTab(), tone: 'success' },
    ],
  },
  {
    id: 'money',
    title: 'Wallet & passes',
    note: 'Money is cents, pass minutes are banked — never poured into the session.',
    actions: [
      { label: 'Top up €10', run: () => admin.topUpWallet(1000), tone: 'success' },
      { label: 'Gift 250 coins', run: () => admin.grantCoins(250), tone: 'success' },
      { label: 'Grant a pass', run: () => admin.grantPass() },
    ],
  },
  {
    id: 'messages',
    title: 'Messages',
    note: 'Critical broadcasts open a modal; everything else is a toast.',
    actions: [
      { label: 'Staff reply', run: () => admin.staffMessage() },
      { label: 'Broadcast: info', run: () => admin.broadcast('info') },
      {
        label: 'Broadcast: critical',
        run: () => admin.broadcast('critical', 'Evacuation drill', 'Please leave your station.'),
        tone: 'danger',
      },
    ],
  },
  {
    id: 'phone',
    title: 'Companion app',
    note:
      'The other actor, not staff (C1.5). These publish real login.qr.confirmed frames so the payload and the scope can be read in the log — but they cannot sign anyone in from here: the bus is in-memory per tab and the lock screen is another route, so no live challenge exists on this page. Expect "nothing in the fixture" and drive the actual flow from the QR dialog, which carries the same button next to the code it owns.',
    actions: [
      { label: 'Confirm QR login', run: () => admin.confirmQrLogin(), tone: 'success' },
      // A different player on the phone: proves the station signs in whoever the
      // frame names, rather than defaulting to the demo account the way the old
      // fake dialog did.
      { label: 'Confirm as ClutchQueen', run: () => admin.confirmQrLogin('u-clutch') },
      // A code that was never on this screen. The frame is published, the dialog
      // drops it: "a QR confirmation arrived" ≠ "this square was approved".
      { label: 'Confirm a stale code', run: () => admin.confirmQrLogin('u-demo', 'XXX-XXX') },
    ],
  },
  {
    id: 'meta',
    title: 'Loyalty, events, social',
    note: 'Everything that pays out or calls the player somewhere.',
    actions: [
      { label: 'Complete quest', run: () => admin.completeQuest(), tone: 'success' },
      { label: 'Unlock BP tier', run: () => admin.unlockBattlePassTier(), tone: 'success' },
      { label: 'Call to match', run: () => admin.callToTournament('matchReady') },
      { label: 'Booking reminder', run: () => admin.remindBooking() },
      { label: 'Friend request', run: () => admin.friendRequest() },
      { label: 'Party invite', run: () => admin.partyInvite() },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * Small pieces
 * ------------------------------------------------------------------ */

const STATUS_TONE: Record<RealtimeStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  idle: 'neutral',
  connecting: 'warning',
  open: 'success',
  offline: 'danger',
}

const OUTCOME_TONE = {
  delivered: 'success',
  queued: 'warning',
  dropped: 'neutral',
} as const

function clockOf(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour12: false })
}

/**
 * The last body sent by the "Report" group, kept **outside** React on purpose.
 *
 * "Re-send the same report" has to send the very same object — including an
 * anchor the server has already rotated away from — and a state update would
 * re-render this page between the two presses, which is exactly the retry the
 * contract is supposed to survive. A module variable is the closest thing to a
 * client that kept a report in flight across a lost reply.
 */
let lastReport: SessionReport | null = null

/* ------------------------------------------------------------------ *
 * Console
 * ------------------------------------------------------------------ */

export function BusConsole() {
  const { status, offline, attempt, retryInSeconds, pending, reconnectNow } = useRealtimeStatus()
  const toast = useStore((s) => s.toast)

  const [entries, setEntries] = useState<BusLogEntry[]>([])
  const [linkUp, setLinkUp] = useState(true)

  // Mirror the bus log. Seeded once, then appended live.
  useEffect(() => {
    setEntries(mockBus.log(60))
    return mockBus.onLog((entry) => setEntries((list) => [entry, ...list].slice(0, 60)))
  }, [])

  // The client's own view of the session, built *only* from pushes — if this
  // disagrees with the log, the reactive path is broken.
  const [seen, setSeen] = useState<{ state: string; secondsLeft: number } | null>(null)
  useRealtimeAny(
    useCallback((event: AnyRealtimeEvent) => {
      if (
        event.type === 'time.added' ||
        event.type === 'session.paused' ||
        event.type === 'session.resumed'
      ) {
        const snap = event.payload.snapshot
        setSeen({ state: snap.state, secondsLeft: snap.secondsLeft })
      }
      if (event.type === 'session.ended') setSeen({ state: 'ended', secondsLeft: 0 })
    }, []),
  )

  const fire = useCallback(
    (action: Action) => {
      try {
        const result = action.run()
        if (result === null) {
          toast('warning', `${action.label}: nothing in the fixture to act on`)
        }
      } catch (error) {
        toast('error', error instanceof Error ? error.message : String(error))
      }
    },
    [toast],
  )

  /* ---- ledger reports (C2.14) ----------------------------------------- *
   * The heartbeat now has a periodic caller (`hooks/use-heartbeat.ts`, C2.15),
   * but it only ever sends *honest* readings: "the same report twice" and "a
   * report from a spent anchor" are exactly what it cannot produce, and
   * idempotency is only worth something if it can be seen. This route never
   * mounts the launcher, so these buttons are also the only reports that exist
   * here.
   */
  const [ledger, setLedger] = useState<SessionSnapshot | null>(null)

  const sendReport = useCallback(
    (build: (anchorId: ID) => SessionReport) => {
      const run = async () => {
        // The anchor comes from the freshest snapshot the page can get, not from
        // the store: this route never mounts the launcher, so nothing here has
        // applied a snapshot on its own.
        const anchorId = ledger?.anchorId ?? (await fetchCurrentSession()).anchorId
        const report = build(anchorId)
        lastReport = report
        setLedger(await heartbeat(report))
      }
      // `fire()` above only catches synchronous throws; an unwrapped rejection
      // here would leave the failure in the console instead of on screen.
      void run().catch((error: unknown) => {
        toast('error', error instanceof Error ? error.message : String(error))
      })
    },
    [ledger, toast],
  )

  const resendReport = useCallback(() => {
    if (!lastReport) {
      toast('warning', 'Nothing sent yet — press "Report +30 s" first')
      return
    }
    // Deliberately the same object, stale anchor and all.
    const report = lastReport
    void heartbeat(report)
      .then(setLedger)
      .catch((error: unknown) => {
        toast('error', error instanceof Error ? error.message : String(error))
      })
  }, [toast])

  const toggleLink = useCallback(() => {
    const next = !linkUp
    setLinkUp(next)
    mockBus.setLinkUp(next)
    // Coming back up is not automatic — the same manual retry a player has.
    if (next) reconnectNow()
  }, [linkUp, reconnectNow])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      {/* ---- staff side ------------------------------------------------ */}
      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <Panel key={group.id} eyebrow={group.id.toUpperCase()} title={group.title}>
            <p className="mb-4 text-xs leading-relaxed text-text-medium">{group.note}</p>
            <div className="flex flex-wrap gap-2">
              {group.actions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.tone ?? 'secondary'}
                  onClick={() => fire(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Panel>
        ))}

        <Panel eyebrow="REPORT" title="Ledger report">
          <p className="mb-4 text-xs leading-relaxed text-text-medium">
            {
              'The client states a reading ("since anchor A, 30 seconds") and the server takes the maximum, so a repeat costs nothing and a reading from a replaced anchor moves nothing. The periodic caller (C2.15) only ever sends honest readings, so these buttons are the only way to press the same report twice.'
            }
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => sendReport((anchorId) => ({ anchorId, elapsedSinceAnchor: 30 }))}
            >
              Report +30 s
            </Button>
            <Button size="sm" variant="secondary" onClick={resendReport}>
              Re-send the same report
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                sendReport(() => ({
                  anchorId: 'stale',
                  elapsedSinceAnchor: lastReport?.elapsedSinceAnchor ?? 30,
                }))
              }
            >
              Report with a stale anchor
            </Button>
          </div>
        </Panel>
      </div>

      {/* ---- client side ----------------------------------------------- */}
      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <Panel eyebrow="CHANNEL" title="Connection">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[status]} variant="soft">
              {status}
            </Badge>
            {offline && (
              <Badge tone="danger" variant="soft">
                banner up
              </Badge>
            )}
            {attempt > 0 && (
              <Badge tone="warning" variant="soft">
                attempt {attempt}
                {retryInSeconds > 0 ? ` · ${retryInSeconds}s` : ''}
              </Badge>
            )}
            {pending > 0 && (
              <Badge tone="info" variant="soft">
                {pending} queued
              </Badge>
            )}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-text-medium">
            {
              'Cut the link and the frames you publish are held, not lost: they replay in order on reconnect, while the countdown keeps running locally off the last expiresAt (F4.5).'
            }
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={linkUp ? 'danger' : 'success'} onClick={toggleLink}>
              {linkUp ? 'Cut the link' : 'Restore the link'}
            </Button>
            <Button size="sm" variant="secondary" onClick={reconnectNow} disabled={!linkUp}>
              Reconnect now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEntries([])}>
              Clear view
            </Button>
          </div>
        </Panel>

        <Panel eyebrow="CLIENT" title="Seen by the client">
          {seen ? (
            <dl className="flex gap-8">
              <div>
                <dt className="label-mono text-[10px] text-text-low">state</dt>
                <dd className="font-display text-lg font-bold text-text-high">{seen.state}</dd>
              </div>
              <div>
                <dt className="label-mono text-[10px] text-text-low">time left</dt>
                <dd className="font-clock text-lg tabular-nums text-text-high">
                  {formatCountdown(seen.secondsLeft)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs leading-relaxed text-text-medium">
              {'No session frame received yet — press "+15 min" or "Pause seat".'}
            </p>
          )}
        </Panel>

        <Panel eyebrow="LEDGER" title="Told to the club">
          {ledger ? (
            <>
              <dl className="flex gap-8">
                <div>
                  <dt className="label-mono text-[10px] text-text-low">used</dt>
                  <dd className="font-clock text-lg tabular-nums text-text-high">
                    {ledger.secondsUsed}s
                  </dd>
                </div>
                <div>
                  <dt className="label-mono text-[10px] text-text-low">debt</dt>
                  <dd className="font-clock text-lg tabular-nums text-text-high">
                    {ledger.debtSeconds}s
                  </dd>
                </div>
                <div>
                  <dt className="label-mono text-[10px] text-text-low">state</dt>
                  <dd className="font-display text-lg font-bold text-text-high">{ledger.state}</dd>
                </div>
              </dl>
              <p className="mt-4 truncate font-mono text-[11px] text-text-medium">
                anchor {ledger.anchorId}
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-text-medium">
              {'No report sent yet — press "Report +30 s".'}
            </p>
          )}
        </Panel>

        <Panel eyebrow="LOG" title="Frames" flush>
          <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
            {entries.length === 0 && (
              <li className="px-4 py-5 text-xs text-text-medium">Nothing published yet.</li>
            )}
            {entries.map((entry) => (
              <li key={`${entry.event.id}-${entry.loggedAtMs}`} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="label-mono text-[10px] tabular-nums text-text-low">
                    {clockOf(entry.loggedAtMs)}
                  </span>
                  <span className="label-mono text-[10px] text-primary">{entry.event.type}</span>
                  <Badge className="ml-auto" tone={OUTCOME_TONE[entry.outcome]} variant="soft" size="sm">
                    {entry.outcome}
                  </Badge>
                </div>
                {/* `block` matters: an inline <code> cannot be truncated and the
                    raw JSON would stretch the whole page sideways. */}
                <code className="block truncate text-[11px] leading-relaxed text-text-medium">
                  {JSON.stringify(entry.event.payload)}
                </code>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
