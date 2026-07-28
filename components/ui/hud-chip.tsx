import { cn } from '@/lib/utils'

type Tone = 'default' | 'accent'

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
  const accent = tone === 'accent'

  return (
    <span
      data-slot="hud-chip"
      className={cn(
        'glass neon-ring-static flex items-center gap-2 rounded-full px-3.5 py-1.5',
        className,
      )}
      {...props}
    >
      {dot && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />}
      {icon && (
        <span className={cn('shrink-0', accent ? 'text-success' : 'text-primary')} aria-hidden>
          {icon}
        </span>
      )}
      {variant === 'station' ? (
        <>
          <span className="font-display text-sm font-bold tracking-wide text-text-high">{label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-success">
            {value}
          </span>
        </>
      ) : (
        <>
          <span className="text-[10px] uppercase tracking-widest text-text-low">{label}</span>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              accent ? 'text-success' : 'text-text-high',
            )}
          >
            {value}
          </span>
        </>
      )}
    </span>
  )
}
