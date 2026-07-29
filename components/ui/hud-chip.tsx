import { cn } from '@/lib/utils'

/**
 * `default` / `accent` are the original pair. `warning`, `danger` and `muted`
 * arrived with the station panel (C1.6): the first chip states the seat's
 * status, and "occupied", "booked from 22:30" and "offline" cannot all be green.
 * They live here rather than as class overrides on the screens, because the strip
 * is the seam between the login and idle screens and it drifted once already
 * (docs/DESIGN.md §5.3): extending the chip is allowed, re-typing it is not.
 */
export type Tone = 'default' | 'accent' | 'warning' | 'danger' | 'muted'

/** Tone → the colour it paints the icon, the value and the status dot. */
const TONE_TEXT: Record<Tone, string> = {
  default: 'text-text-high',
  accent: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-text-low',
}

/**
 * Exported so the seat badge in the lock screen's card header can paint its own
 * dot the same colour as the strip's: the two state the same seat status a screen
 * apart, and a green dot over an amber chip is the kind of drift §5.3 is about.
 */
export const TONE_DOT: Record<Tone, string> = {
  default: 'bg-success',
  accent: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  muted: 'bg-text-low',
}

interface HudChipProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Tracked micro-label, e.g. "PING". Rendered uppercase by the chip. */
  label: React.ReactNode
  /** The reading itself, e.g. "4 ms". Numbers stay tabular. */
  value: React.ReactNode
  /** Optional lucide icon element, sized 13 px by the caller (§5.3). */
  icon?: React.ReactNode
  /** Pulsing 2 px status dot before the label — the station chip wears it. */
  dot?: boolean
  /** `accent` paints icon **and** value in `--success` (§5.3). */
  tone?: Tone
  /**
   * `metric` — label above-the-fold small, value emphasised (Ping/Display/GPU).
   * `station` — the identifier chip: name in display face, value as a tracked
   *   micro-status. Both screens use it for `PC #17`.
   */
  variant?: 'metric' | 'station'
}

/**
 * HUD telemetry chip (F1.23).
 *
 * The row `PC #17 · Ping · Display · GPU · Status` is the seam that stitches the
 * login and idle screens into one product (docs/DESIGN.md §5.3), so it lives in
 * exactly one file: hand-copied twins had already drifted (`px-3` vs `px-3.5`,
 * accent colouring the icon on one screen and icon + value on the other).
 *
 * Always **T2** (§4.2): the neon tube is frozen, never travelling. Each screen
 * spends its single animated ring on the one thing you can act on, and a row of
 * five runners would make the accent mean nothing.
 */
export function HudChip({
  label,
  value,
  icon,
  dot,
  tone = 'default',
  variant = 'metric',
  className,
  ...props
}: HudChipProps) {
  // The station variant has always painted its status green, so `default` keeps
  // meaning "success" there: the identifier chip has no neutral reading — either
  // the seat is fine or the tone says what is wrong with it.
  const stationTone: Tone = variant === 'station' && tone === 'default' ? 'accent' : tone
  const iconTone = stationTone === 'default' ? 'text-primary' : TONE_TEXT[stationTone]

  return (
    <span
      data-slot="hud-chip"
      className={cn(
        'glass neon-ring-static flex items-center gap-2 rounded-full px-3.5 py-1.5',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-2 w-2 shrink-0 animate-pulse rounded-full', TONE_DOT[stationTone])}
          aria-hidden
        />
      )}
      {icon && (
        <span className={cn('shrink-0', iconTone)} aria-hidden>
          {icon}
        </span>
      )}
      {variant === 'station' ? (
        <>
          <span className="font-display text-sm font-bold tracking-wide text-text-high">{label}</span>
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-widest',
              TONE_TEXT[stationTone],
            )}
          >
            {value}
          </span>
        </>
      ) : (
        <>
          <span className="text-[10px] uppercase tracking-widest text-text-low">{label}</span>
          <span className={cn('text-xs font-semibold tabular-nums', TONE_TEXT[stationTone])}>
            {value}
          </span>
        </>
      )}
    </span>
  )
}
