'use client'

/**
 * The club's opening hours, as a screen sees them (C2.11).
 *
 * Three things this hook is careful about, because each one is a bug the feature
 * would otherwise ship with.
 *
 *  1. **It starts no interval.** The product has exactly one (F6.3), in
 *     `session-manager.tsx`, and it writes `sessionSeconds` every second. This
 *     hook re-derives off that value, so "how long until the club closes" ticks on
 *     the same heartbeat as the session clock instead of adding a second timer per
 *     consumer — and a station that slept through the closing hour gets the right
 *     answer on the first tick after waking, because nothing here counts.
 *
 *  2. **Nothing is announced before the schedule has been read.** Until
 *     `/api/club/settings` answers, `open` is `true` and every remainder is
 *     `null`: an "unknown" that defaults to *closed* would flash the "Club closed"
 *     takeover across the launcher on every boot, which is the one lie this
 *     feature must not tell. `ready` is there for callers that need the
 *     difference.
 *
 *  3. **One SWR key, shared.** Every consumer — the closing watcher, the shop
 *     grid, the checkout — calls this hook and they all hit the same cache entry,
 *     so the settings are fetched once per station and the three surfaces cannot
 *     disagree about the same minute.
 *
 * The dev switch (`?club=close10`, see `lib/dev-flags.ts`) is applied here rather
 * than inside `clubHoursStatus()`: the pure function stays a function of the
 * clock, and the shift stays a property of *this build being a prototype*.
 */

import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { clubHoursStatus, type ClubHoursStatus } from '@/lib/club-hours'
import { readClubHoursOverride, type ClubHoursOverride } from '@/lib/dev-flags'
import { fetchClubSettings } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import type { OpenHours } from '@/lib/types/settings'

const MS_PER_MINUTE = 60_000

export interface ClubHours extends ClubHoursStatus {
  /** `false` until the club's schedule has actually been read. */
  ready: boolean
  /** Closing time as a `Date`, for `formatTime()`. `null` when nothing closes. */
  closesAt: Date | null
  /** Next opening as a `Date`. `null` while the club is open. */
  opensAt: Date | null
}

/** What every consumer sees until the settings land: open, and nothing to say. */
const UNKNOWN: ClubHours = {
  ready: false,
  open: true,
  minutesUntilClose: null,
  closesAtMs: null,
  minutesUntilOpen: null,
  opensAtMs: null,
  closesAt: null,
  opensAt: null,
}

/**
 * "Now", moved so the schedule answers the state we want to look at.
 *
 * Walks into the next open window first when the club happens to be shut, so
 * `?club=close10` works at four in the morning as well as at nine in the evening.
 * A schedule with no closing in it cannot be previewed at all — there is nothing
 * to stand ten minutes before — so the real clock is returned untouched.
 */
function overriddenNow(openHours: OpenHours, override: ClubHoursOverride): number {
  const nowMs = Date.now()
  let probe = clubHoursStatus(openHours, nowMs)
  if (!probe.open && probe.opensAtMs !== null) {
    probe = clubHoursStatus(openHours, probe.opensAtMs + MS_PER_MINUTE)
  }
  if (probe.closesAtMs === null) return nowMs
  return override.kind === 'closed'
    ? probe.closesAtMs + MS_PER_MINUTE
    : probe.closesAtMs - override.minutes * MS_PER_MINUTE
}

export function useClubHours(): ClubHours {
  const settings = useApi(['club', 'settings'], fetchClubSettings)
  const openHours = settings.data?.openHours

  // The app's one clock, used as a heartbeat only — the value itself is the
  // session's remainder and means nothing here.
  const tick = useStore((s) => s.sessionSeconds)

  // Read in an effect, never during render: `location` does not exist on the
  // server, so reading it while rendering would be a hydration mismatch.
  const [override, setOverride] = useState<ClubHoursOverride | null>(null)
  useEffect(() => setOverride(readClubHoursOverride()), [])

  return useMemo(() => {
    if (!openHours) return UNKNOWN
    const nowMs = override ? overriddenNow(openHours, override) : Date.now()
    const status = clubHoursStatus(openHours, nowMs)
    return {
      ...status,
      ready: true,
      closesAt: status.closesAtMs === null ? null : new Date(status.closesAtMs),
      opensAt: status.opensAtMs === null ? null : new Date(status.opensAtMs),
    }
    // `tick` is the dependency that makes this live. It is intentionally unused
    // inside the body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openHours, override, tick])
}
