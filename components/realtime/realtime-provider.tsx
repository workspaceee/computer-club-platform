'use client'

/**
 * The one mount point of the realtime layer (F4.3 / F4.5).
 *
 * Wrapping the app in this provider is what makes "admin did something → the
 * player sees it immediately" true everywhere at once:
 *
 *   • `useRealtimeChannel()` — a single stream with backoff reconnect,
 *   • `useRealtimeRevalidation()` — pushes invalidate the SWR keys they made stale,
 *   • the toast bridge — one line per event, translated, no per-screen wiring,
 *   • `<OfflineBanner />` — the sustained-outage strip,
 *   • the money bridge and the resync — C2.12, below.
 *
 * Mount it **once**, above the screens. Any component can read the connection
 * state with `useRealtimeStatus()` (e.g. to dim a "call staff" button) without
 * opening a second stream.
 *
 * Stage 4 changes nothing here: the transport swap happens inside
 * `hooks/use-realtime.ts`.
 */

import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { OfflineBanner } from '@/components/realtime/offline-banner'
import { reportNow } from '@/hooks/use-heartbeat'
import {
  useRealtimeAny,
  useRealtimeChannel,
  useRealtimeEvent,
  useRealtimeRevalidation,
  type RealtimeChannelState,
} from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import { fetchCurrentSession, onPurchaseRefused, setTransportOffline } from '@/lib/mock/api'
import { realtimeToast } from '@/lib/realtime/copy'
import { useStore } from '@/lib/store'

const RealtimeContext = createContext<RealtimeChannelState | null>(null)

/** Connection state for any screen that wants to reflect it. */
export function useRealtimeStatus(): RealtimeChannelState {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtimeStatus() must be used inside <RealtimeProvider>')
  return ctx
}

/**
 * Turns incoming frames into toasts, using the copy map so payload → sentence
 * lives in exactly one place. `broadcast` is special-cased: the server decides
 * toast vs modal (`presentation`), the client only obeys.
 */
function useToastBridge(): void {
  const { t } = useT()
  const toast = useStore((s) => s.toast)

  useRealtimeAny(
    useCallback(
      (event) => {
        if (event.type === 'broadcast') {
          const { level, title, body, presentation, durationMs } = event.payload
          // Modal broadcasts are owned by the shell, not by a 6-second toast.
          if (presentation === 'modal') return
          toast(level === 'critical' ? 'error' : level === 'warning' ? 'warning' : 'info', body, {
            title,
            duration: durationMs,
          })
          return
        }

        const line = realtimeToast(event)
        if (!line) return
        toast(line.kind, t(line.key, line.vars), { duration: line.durationMs })
      },
      [t, toast],
    ),
  )
}

/**
 * Friend requests and party invites also land in the `social` slice (F6.1), not
 * only in a toast: a six-second toast is not a place to keep an invite, and
 * before this bridge existed a missed toast lost the payload for good. The
 * screen that renders the inbox is `C9`.
 */
function useSocialBridge(): void {
  const receiveFriendRequest = useStore((s) => s.receiveFriendRequest)
  const receivePartyInvite = useStore((s) => s.receivePartyInvite)

  // One subscription per event type: a shared handler would receive the union
  // of both payloads and force a cast, which is exactly the kind of "trust me"
  // the typed bus exists to avoid.
  useRealtimeEvent(
    'friend.request',
    useCallback((event) => receiveFriendRequest(event.payload), [receiveFriendRequest]),
  )

  useRealtimeEvent(
    'party.invite',
    useCallback((event) => receivePartyInvite(event.payload), [receivePartyInvite]),
  )
}

/**
 * Tells the transport when money must not move, and says so if one gets through
 * anyway (C2.12).
 *
 * Two directions, one outage:
 *
 *  1. **Down** — the banner's `offline` is pushed into `setTransportOffline()`, so
 *     `mutate()` refuses a purchase before it leaves the station. The *delayed*
 *     flag is deliberately the one that travels: the transport then refuses only
 *     during the window the player can see a banner explaining why, and a 300 ms
 *     blink never kills a checkout that would have gone through. It is pushed
 *     rather than read because `lib/realtime/mock-bus.ts` imports `serverTime()`
 *     from the client, and the reverse import would be a cycle.
 *
 *  2. **Up** — a refusal comes back as an endpoint name and a `kind`, and *this* is
 *     where it becomes a sentence. The mock API never produces prose (`client.ts`
 *     rule 2), so the copy stays in the dictionaries and stays translated. The
 *     `kind` picks between the only two things a refused write can be about:
 *     `realtime.salesRefused` says **nothing was charged** (the only fact a player
 *     needs when a payment they pressed did not happen), and
 *     `auth.offlineEntryRefused` says the door needs the club (C2.13). Before the
 *     split, a sign-in refused offline was told nothing had been charged — money
 *     talk over a door that never asked for a card.
 *
 * Reaching (2) at all means a click beat a re-render, or a dialog was already
 * open: every one of these buttons is disabled by `useSalesGate()` or replaced by
 * `useEntryGate()`. It is the backstop, not the first line, which is why it is an
 * `error` toast and not a banner — there is nothing to fix and nothing to retry.
 */
function useMoneyBridge(offline: boolean): void {
  const { t } = useT()
  const toast = useStore((s) => s.toast)

  useEffect(() => {
    setTransportOffline(offline)
  }, [offline])

  // Unmounting must clear the flag, or a torn-down provider would leave the
  // transport refusing purchases with no banner left on screen to explain it.
  useEffect(() => () => setTransportOffline(false), [])

  useEffect(
    () =>
      onPurchaseRefused((_endpoint, kind) =>
        toast('error', t(kind === 'entry' ? 'auth.offlineEntryRefused' : 'realtime.salesRefused')),
      ),
    [t, toast],
  )
}

/**
 * What has to happen the moment the link comes back (C2.12).
 *
 * An outage is not just missing frames — it is a *backlog* of them. The bus
 * replays what it queued, but anything the admin changed while we were away and
 * did not push (a price, a balance, the state of an order) is still on screen as
 * the stale copy SWR fetched before the drop. So on the `offline → online` edge:
 *
 *   • **the catch-up reading is reported first** (C2.16). The heartbeat stayed
 *     quiet through the outage — nothing was queued, because the reading is
 *     derived from the anchor and kept growing on its own — so the station is
 *     holding the only account of the minutes the club never heard about. It has
 *     to leave *before* the refetch below, which would otherwise re-anchor us to
 *     the server's pre-outage belief and forgive the whole outage: unbilled for
 *     the club, and free minutes appearing on the player's countdown.
 *   • **every SWR key is revalidated**, in the background. `mutate(() => true)`
 *     keeps the data on screen while it refetches, so the shop does not blank out
 *     into skeletons for a player who never asked for a reload.
 *   • **the session snapshot is refetched** and adopted through `applySnapshot()`,
 *     the same door the heartbeat and `time.added` use. This is the one that has
 *     to be right: the clock is *derived* from `expiresAt`, never counted, so
 *     adopting a fresh deadline cannot make the countdown jump — it re-reads the
 *     same instant with a corrected skew. A player who watched the timer through
 *     the whole outage sees it continue, not lurch.
 *
 *     Only when a clock is actually running. The provider sits in the root layout,
 *     so this hook is alive on the attract screen and the login form too, where
 *     `fetchCurrentSession()` answers `sessionExpired` because there is no visit to
 *     describe — asking would be a guaranteed-failing request on every reconnect,
 *     and a snapshot adopted there would put a stranger's remainder behind a login
 *     form.
 *   • **one toast**, "Connection restored", and exactly one.
 *
 * The dedup is what the ref is for. `offline` can settle through more than one
 * render as `status` and `attempt` land separately, and each of them would
 * otherwise be a fresh "Connection restored" — three of them stacked, which is
 * the whole toast queue (`MAX_TOASTS`) spent saying one thing and evicting
 * everything the backlog just delivered. The edge is tracked explicitly: the
 * toast fires only on a `true → false` transition, so a first mount that was
 * never offline stays silent.
 *
 * Failures here are swallowed on purpose. This runs uninvited, and the link is
 * demonstrably flaky at exactly this moment; a refetch that loses the race is
 * retried by the next heartbeat, and there is nothing for the player to do about
 * it in the meantime.
 */
function useReconnectResync(offline: boolean): void {
  const { t } = useT()
  const { mutate } = useSWRConfig()
  const toast = useStore((s) => s.toast)
  const applySnapshot = useStore((s) => s.applySnapshot)
  const timerRunning = useStore((s) => s.timerRunning)

  const wasOffline = useRef(false)
  // Read inside the effect rather than listed as a dependency: this must fire on
  // the *connection* edge only. As a dependency, a session starting or pausing
  // while the link was down would re-run the whole resync — and re-toast.
  const running = useRef(timerRunning)
  running.current = timerRunning

  useEffect(() => {
    if (offline) {
      wasOffline.current = true
      return
    }
    if (!wasOffline.current) return
    wasOffline.current = false

    let cancelled = false

    // Speak before listening (C2.16). The station is the only party that knows how
    // long the outage lasted, and everything below this line replaces what it
    // knows with what the server last heard — which is the reading from before the
    // drop. Refetch first and the outage is both unbilled *and* handed back to the
    // player as minutes on the countdown; report first and the answers that follow
    // already include it.
    void (async () => {
      await reportNow()
      if (cancelled) return

      // `revalidate: true`, `populateCache` left alone: refetch everything, but
      // keep rendering what we have until the answers arrive.
      void mutate(() => true)

      if (!running.current) return
      try {
        const snapshot = await fetchCurrentSession()
        if (!cancelled) applySnapshot(snapshot)
      } catch {
        // The link dropped again mid-resync, or the visit ended while we were
        // away. The channel is already retrying and the banner is already back
        // up; the next heartbeat settles either case.
      }
    })()

    // Not inside the chain above: the toast is about the *link*, which is back,
    // and it would be a lie by omission to delay it behind a report that may lose
    // the race.
    toast('success', t('realtime.restored'))

    return () => {
      cancelled = true
    }
  }, [offline, mutate, applySnapshot, toast, t])
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const channel = useRealtimeChannel()
  useRealtimeRevalidation()
  useToastBridge()
  useSocialBridge()
  useMoneyBridge(channel.offline)
  useReconnectResync(channel.offline)

  return (
    <RealtimeContext.Provider value={channel}>
      {/* The banner is fixed, so without this offset it would sit on top of the
          first thing on the page — a header, or worse, a running countdown.
          Padding animates instead of snapping so the shift reads as the strip
          pushing the page down rather than the layout breaking. */}
      <div
        className={`transition-[padding-top] duration-240 ease-out ${
          channel.offline ? 'pt-22' : 'pt-0'
        }`}
      >
        {children}
      </div>
      <OfflineBanner {...channel} />
    </RealtimeContext.Provider>
  )
}
