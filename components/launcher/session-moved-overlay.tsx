'use client'

/**
 * "Your session has been moved to PC-24, VIP zone" (C2.8).
 *
 * The admin re-seats a visit mid-session — a broken headset, a booked chair, a
 * tournament pod being cleared — and the only thing that changes for the player
 * is *which keyboard they are sitting at*. The visit itself does not move: same
 * session id, same remainder, same tab. So this file is a message, not a state
 * machine, and the three decisions behind it are all about staying that way.
 *
 *  1. **It writes nothing.** No `applySnapshot`, no seat release, no clock
 *     change. `session.moved` carries no snapshot precisely because nothing
 *     about the visit changed, and the mock producer leaves the row on the old
 *     machine until the player actually arrives (`admin-sim.moveSession`). If
 *     this overlay ended the local session it would take the remainder away from
 *     someone who is still holding the mouse — and if it *adopted* the new seat
 *     it would claim a chair the player has not walked to yet.
 *
 *  2. **It only fires for moves away from *this* seat.** Two very different
 *     stories publish the same frame: staff sending this player elsewhere
 *     (`fromMachineId` is us) and an admin approving "bring my session here",
 *     which lands on the *destination* station and is owned by
 *     `ActiveElsewhere` on the lock screen (C1.12). Without the guard, the
 *     station a player just walked *to* would greet them with an overlay telling
 *     them to walk somewhere — and the mock bus replays its backlog on
 *     reconnect, so the frame arrives again after every hiccup.
 *
 *  3. **It is dismissible, and the pause overlay is not.** A pause is a state of
 *     the seat: clicking it away would leave the screen disagreeing with the
 *     club about whether the PC is usable. A move is an *instruction* — the
 *     player has to get up and carry it out — so the honest affordance is
 *     "Got it", which acknowledges the address and hands back the launcher
 *     (still running, still counting) for the seconds it takes to close a game
 *     and pick up a drink. The instruction is not lost when it is dismissed: the
 *     seat and zone are also the "My session" panel's job, and the club knows
 *     where the player is expected.
 *
 * The zone arrives as an id, so the name is resolved from the catalogue rather
 * than printed raw: "зона VIP" is the half of the address a player can actually
 * navigate by, and `zone-3` is not. When that read has not landed (or the zone
 * is unknown to this build), the copy drops the clause instead of the sentence —
 * a seat label alone is still a complete instruction.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/icon-tile'
import { Overlay } from '@/components/ui/overlay'
import { useApi } from '@/hooks/use-api'
import { useRealtimeEvent } from '@/hooks/use-realtime'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { db } from '@/lib/mock/db'
import { fetchZones } from '@/lib/mock/api'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import type { SessionMovedEvent } from '@/lib/realtime/events'
import { cn } from '@/lib/utils'

export function SessionMovedOverlay() {
  const { t, tp } = useT()

  /**
   * The move on screen, or `null` for "nothing to walk to". One piece of state
   * rather than an `open` flag beside a payload: an overlay that can be open
   * without an address is the "you have been moved — somewhere" screen this
   * feature exists to prevent.
   */
  const [move, setMove] = useState<SessionMovedEvent | null>(null)

  useRealtimeEvent('session.moved', (event) => {
    // See note 2: only a move *off this station* is this overlay's story.
    if (event.payload.fromMachineId !== db.currentMachineId) return
    setMove(event.payload)
  })

  /**
   * The zone name behind `toZoneId`. Cached under a stable key and shared with
   * every other zone reader, so the overlay costs no request in the common case
   * and never blocks on one: the card renders with the seat immediately and the
   * zone clause appears with the same paint or not at all.
   */
  const zones = useApi('club.zones', fetchZones, { revalidateIfStale: false })
  const zoneName = move ? zones.data?.find((zone) => zone.id === move.toZoneId)?.name : undefined

  const acknowledge = useCallback(() => setMove(null), [])

  const minutes = move ? Math.max(1, Math.round(move.moveWithinSeconds / 60)) : 0

  return (
    // `modal`, not `blocking`: this station still works, and the player may well
    // need it for a moment (quit a match, close a tab) before standing up. The
    // scrim closes it for the same reason the button does.
    <Overlay open={move !== null} layer="modal" blur="md" onDismiss={acknowledge}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-moved-title"
        aria-describedby="session-moved-body"
        className={cn(
          'panel-raised flex w-full max-w-md flex-col items-center gap-5 overflow-y-auto rounded-lg border border-border p-6 text-center',
          OVERLAY_MAX_H,
        )}
      >
        {/* Warning, not danger: being re-seated costs the player a walk, not a
            visit. `display` is the same icon C1.12 uses for "your session is on
            another PC" — the two screens are the same fact from either end. */}
        <IconTile icon={icons.display} variant="warning" size="lg" ticks />

        <div className="flex flex-col gap-2">
          <h2
            id="session-moved-title"
            className="font-display text-xl font-black uppercase text-balance text-text-high"
          >
            {t('session.movedTitle')}
          </h2>
          <p id="session-moved-body" className="text-pretty text-sm leading-relaxed text-text-medium">
            {/* The seat label and the zone are club-authored data, so they travel
                through the sentence untranslated — they are the strings the
                player reads out loud at the counter. */}
            {zoneName
              ? t('session.movedBody', { seat: move?.toMachineLabel ?? '', zone: zoneName })
              : t('session.movedBodyNoZone', { seat: move?.toMachineLabel ?? '' })}
          </p>
        </div>

        {/* The address as a plate, because it is the one thing on this overlay
            the player has to remember after they stop reading. Bigger and
            monospaced for the same reason a seat label is on the lock screen:
            it is an identifier, not prose. */}
        <div className="flex w-full items-stretch gap-3">
          <div className="flex flex-1 flex-col items-center gap-1 rounded-md border border-border bg-surface-sunken p-4">
            <span className="label-mono text-[9px] text-text-low">{t('session.movedSeatLabel')}</span>
            <span className="font-mono text-2xl font-black uppercase tracking-tight text-text-high">
              {move?.toMachineLabel}
            </span>
          </div>
          {/* Only when there is a name to show — a column reading "—" would make
              the club look like it does not know its own floor. */}
          {zoneName && (
            <div className="flex flex-1 flex-col items-center gap-1 rounded-md border border-border bg-surface-sunken p-4">
              <span className="label-mono text-[9px] text-text-low">{t('session.movedZoneLabel')}</span>
              <span className="font-display text-2xl font-black uppercase tracking-tight text-warning">
                {zoneName}
              </span>
            </div>
          )}
        </div>

        {/* The deadline stated as minutes, deliberately not a `Countdown`: the
            product has exactly one clock (`SessionManager`), and a second one
            ticking toward a staff intervention would turn a walk across the room
            into a race the player can lose by reading slowly. */}
        <p className="text-pretty text-sm leading-relaxed text-text-high">
          {tp('session.movedDeadline', minutes)}
        </p>

        <p className="text-pretty text-xs leading-relaxed text-text-medium">
          {t('session.movedHint')}
        </p>

        <Button variant="primary" size="lg" block cut onClick={acknowledge}>
          {t('session.movedAck')}
        </Button>
      </div>
    </Overlay>
  )
}
