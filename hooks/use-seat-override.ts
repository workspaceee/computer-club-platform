'use client'

/**
 * `?seat=pause` — hand the launcher a paused seat at boot (C3.3).
 *
 * Mounted by `Launcher`, which is the whole reason it exists: the state under
 * review is "clock stopped, launcher still up", and the only moment it can be
 * created is *after* a sign-in, from inside the tab the launcher is running in.
 * See `lib/dev-flags.ts` for why neither the bus console nor the URL alone could
 * get there.
 *
 * What it does not do is fake anything. It calls the same `admin-sim` action the
 * console's button calls, so the frame is published on the real bus with the real
 * seat scope, `SessionManager` adopts the snapshot it carries, and the clock stops
 * because the product stopped it. The only deviation is the lifted scrim
 * (`setScrimPeek`), which is the review affordance itself.
 *
 * Two details that are load-bearing:
 *
 *   • **It waits for the channel.** A frame published before the handshake is
 *     queued by the bus and replayed on connect, which is correct but arrives at
 *     a launcher that has already painted a running clock. Firing on the first
 *     `connected` keeps the pause a live push, and `?seat=pause&link=cut` then
 *     behaves exactly as the product would: nothing until the cable is back.
 *
 *   • **`admin-sim` is imported dynamically.** It is mock-only staff tooling
 *     (`lib/mock/*`, gone in Stage 4); a static import here would pull the whole
 *     admin emulator into the launcher's chunk even though `DEV_SHORTCUTS` drops
 *     the call. The `import()` sits behind the flag, so a production build has no
 *     reason to fetch it.
 */

import { useEffect, useRef } from 'react'
import { useRealtimeStatus } from '@/components/realtime/realtime-provider'
import { DEV_SHORTCUTS, readSeatOverride, setScrimPeek } from '@/lib/dev-flags'

export function useSeatOverride(): void {
  const { connected } = useRealtimeStatus()

  // Once per mounted launcher. Without it a reconnect — or a Fast Refresh — would
  // pause a seat the reviewer had just resumed from the console.
  const fired = useRef(false)

  useEffect(() => {
    if (!DEV_SHORTCUTS) return
    if (fired.current || !connected) return
    if (readSeatOverride() !== 'pause') return

    fired.current = true
    // Armed before the frame is raised: the overlay decides on the push, and a
    // peek that lost the race would flash the scrim it is meant to lift.
    setScrimPeek(true)

    void import('@/lib/realtime/admin-sim').then((admin) => {
      try {
        admin.pauseSession('staff')
      } catch {
        // No live session in the fixture (a guest surface with nothing seated).
        // Nothing to pause and nothing to say — the switch is a review tool, not
        // a feature that gets to interrupt the screen with an error.
        setScrimPeek(false)
      }
    })
  }, [connected])
}
