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
 *   • `<OfflineBanner />` — the sustained-outage strip.
 *
 * Mount it **once**, above the screens. Any component can read the connection
 * state with `useRealtimeStatus()` (e.g. to dim a "call staff" button) without
 * opening a second stream.
 *
 * Stage 4 changes nothing here: the transport swap happens inside
 * `hooks/use-realtime.ts`.
 */

import { createContext, useCallback, useContext } from 'react'
import { OfflineBanner } from '@/components/realtime/offline-banner'
import {
  useRealtimeAny,
  useRealtimeChannel,
  useRealtimeEvent,
  useRealtimeRevalidation,
  type RealtimeChannelState,
} from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
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

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const channel = useRealtimeChannel()
  useRealtimeRevalidation()
  useToastBridge()
  useSocialBridge()

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
