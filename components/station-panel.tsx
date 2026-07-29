'use client'

import { HudChip } from '@/components/ui/hud-chip'
import { Skeleton } from '@/components/skeleton'
import { useAgent, useAgentTelemetry } from '@/hooks/use-agent'
import { useApi } from '@/hooks/use-api'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import { fetchStation, type StationInfo } from '@/lib/mock/api'
import { cn } from '@/lib/utils'

/**
 * Station information panel (C1.6).
 *
 * The strip along the bottom of the lock and idle screens used to be a prop:
 * `PC #17`, `4 ms`, `240 Hz`, `RTX 4080`, `Optimal` — five hardcoded strings on a
 * screen whose whole job is to tell a player, from across the room, whether this
 * seat is theirs to take. It said "Ready" on a machine under maintenance and
 * "4 ms" on a station with no network stack answering.
 *
 * What it says now comes from the two sources that actually know:
 *
 *  - **The club** (`GET /api/club/station`) owns identity and availability: the
 *    seat's label, its zone, its status and the next reservation on it. Which is
 *    why the third state is `booked from HH:MM` and not a colour — a seat that is
 *    free at 21:40 and taken at 22:00 has to say the time, or the walk-in who
 *    takes it gets thrown off it twenty minutes later.
 *  - **The agent** (`AgentBridge.getTelemetry`) owns the live readings. Nothing
 *    is polled unless the handshake succeeded *and* the seat reports telemetry,
 *    and a failed read blanks the number instead of freezing the last one: a
 *    stale ping is worse than a dash, because a dash cannot be believed (F5.4).
 *
 * Hardware facts (panel, GPU) stay on the club's side of that line. They are
 * catalogue data, so a seat whose agent is dead still says what it is instead of
 * going blank — the honest thing to lose is the *reading*, not the machine.
 */
interface StationPanelProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * `full` — the whole strip: seat, zone, ping, panel, GPU, health.
   * `compact` — the seat chip alone, for the mobile row under the card where six
   *   chips would wrap into three lines of noise.
   */
  variant?: 'full' | 'compact'
}

export function StationPanel({ variant = 'full', className, ...props }: StationPanelProps) {
  const { t } = useT()
  const station = useApi(['catalog', 'station'], () => fetchStation(), {
    // An idle kiosk is left on this screen for hours: without a refresh the
    // status chip would still be advertising a free seat long after somebody
    // took it. Pushes invalidate the `catalog` prefix too (F4.3); this is the
    // floor under them, not a replacement.
    refreshInterval: 30_000,
  })
  const { telemetry, live } = useAgentTelemetry()
  const { status: agentStatus } = useAgent()

  const seat = station.data
  const seatStatus = useSeatStatus(seat)

  // The seat chip is the one thing on this strip that must never be guessed, so
  // until the club answers it is a skeleton the width of a chip, not `PC #--`.
  if (!seat) {
    return (
      <div
        className={cn('flex flex-wrap items-center gap-3', className)}
        aria-busy
        aria-label={t('auth.stationPanel')}
        {...props}
      >
        <Skeleton className="h-8 w-36" radius="full" />
        {variant === 'full' && (
          <>
            <Skeleton className="h-8 w-28" radius="full" />
            <Skeleton className="h-8 w-24" radius="full" />
            <Skeleton className="h-8 w-24" radius="full" />
            <Skeleton className="h-8 w-32" radius="full" />
          </>
        )}
      </div>
    )
  }

  const dash = '—'

  return (
    <div
      // The strip is a readout, not a control: naming it lets a screen reader
      // reach the seat's status without the chips pretending to be a list.
      role="group"
      aria-label={t('auth.stationPanel')}
      className={cn('flex flex-wrap items-center gap-3', className)}
      {...props}
    >
      <HudChip
        dot
        variant="station"
        label={seat.label}
        value={seatStatus.text}
        tone={seatStatus.tone}
      />

      {variant === 'full' && (
        <>
          {/* Zone, unabbreviated: "Main Hall" and "VIP" are how the club's own
              signage names the rooms, and a player asked to move to `zone-main`
              would have to translate it. No icon — the club has one glyph per
              meaning (`icons:verify`), and a zone is a place, not a device. */}
          <HudChip label={t('auth.zone')} value={seat.zoneName} />
          <HudChip
            icon={<icons.network size={13} />}
            label={t('auth.ping')}
            value={telemetry ? `${telemetry.pingMs} ms` : dash}
            tone={telemetry ? 'default' : 'muted'}
          />
          {/* Refresh rate and GPU come from the seat's specs, not from the
              agent: they are true whether or not it answered. */}
          <HudChip
            icon={<icons.display size={13} />}
            label={t('auth.display')}
            value={`${seat.specs.refreshHz} Hz`}
          />
          <HudChip
            icon={<icons.hardware size={13} />}
            label={t('auth.gpu')}
            value={shortGpu(seat.specs.gpu)}
          />
          <HealthChip
            agentStatus={agentStatus}
            live={live}
            gpuTempC={telemetry?.gpuTempC ?? null}
          />
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Seat status
 * ------------------------------------------------------------------ */

type ChipTone = 'default' | 'accent' | 'warning' | 'danger' | 'muted'

export interface SeatStatus {
  text: string
  tone: ChipTone
}

/**
 * `machines.status` plus the next reservation, turned into one localized line.
 *
 * Exported because the card header on the lock screen states the same fact in
 * plain text: two places reading the same rule is fine, two places *deciding*
 * the rule is how a header ends up saying "online" over a chip saying
 * "maintenance".
 */
export function useSeatStatus(seat: StationInfo | undefined): SeatStatus {
  const { t, formatTime } = useT()
  if (!seat) return { text: t('common.loading'), tone: 'muted' }

  const bookedAt = seat.nextBookingAt ? formatTime(new Date(seat.nextBookingAt)) : null

  switch (seat.status) {
    case 'offline':
      // The agent never checked in. Not "free": the club cannot promise a seat
      // it is not talking to (F5.4).
      return { text: t('auth.stationOffline'), tone: 'danger' }
    case 'maintenance':
      return { text: t('auth.stationMaintenance'), tone: 'danger' }
    case 'occupied':
      return { text: t('auth.stationOccupied'), tone: 'warning' }
    case 'reserved':
      return {
        text: bookedAt
          ? t('auth.stationBookedFrom', { time: bookedAt })
          : t('auth.stationBooked'),
        tone: 'warning',
      }
    default:
      // Free — and the interesting half of "free" is when it stops. A seat with
      // a booking on it in the next hours is still takeable, but only until then,
      // so the chip names the deadline instead of a flat green "Free".
      return bookedAt
        ? { text: t('auth.stationFreeUntil', { time: bookedAt }), tone: 'default' }
        : { text: t('auth.stationFree'), tone: 'accent' }
  }
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

/** GPU package temperature that turns the summary chip from green to amber. */
const HOT_GPU_C = 84

/**
 * Summary of the seat's own health, and the one chip that is allowed to say the
 * agent is missing: the row otherwise reads as club data, and a station with no
 * agent still has a label, a zone and a panel.
 */
function HealthChip({
  agentStatus,
  live,
  gpuTempC,
}: {
  agentStatus: 'checking' | 'ready' | 'unavailable'
  live: boolean
  gpuTempC: number | null
}) {
  const { t } = useT()

  if (agentStatus === 'checking') {
    return (
      <HudChip
        icon={<icons.status size={13} />}
        label={t('auth.status')}
        value={t('common.loading')}
        tone="muted"
      />
    )
  }

  if (agentStatus === 'unavailable') {
    return (
      <HudChip
        icon={<icons.agentOffline size={13} />}
        label={t('auth.status')}
        value={t('auth.agentOffline')}
        tone="danger"
      />
    )
  }

  // Ready, but nothing has been read yet (or the last read failed): the seat is
  // reachable and its condition is unknown, which is neither green nor red.
  if (!live || gpuTempC === null) {
    return (
      <HudChip
        icon={<icons.status size={13} />}
        label={t('auth.status')}
        value={t('auth.telemetryOff')}
        tone="muted"
      />
    )
  }

  const hot = gpuTempC >= HOT_GPU_C
  return (
    <HudChip
      icon={<icons.status size={13} />}
      label={t('auth.status')}
      value={hot ? t('auth.stationHot') : t('auth.optimal')}
      tone={hot ? 'warning' : 'accent'}
    />
  )
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/**
 * `NVIDIA RTX 4080 16GB` → `RTX 4080`.
 *
 * The chip has room for the model, not for the vendor and the VRAM, and the full
 * string belongs on the seat picker where a player is comparing machines. The
 * vendor prefix is dropped rather than truncated: `NVIDIA RTX 40…` names nothing.
 */
function shortGpu(gpu: string): string {
  return (
    gpu
      .replace(/^(NVIDIA|AMD|Intel)\s+/i, '')
      .replace(/\s+\d+\s?GB\b/i, '')
      .trim() || gpu
  )
}
