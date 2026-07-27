import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'coin' | 'xp'

const ACCENT: Record<Tone, string> = {
  default: 'text-steel',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  coin: 'text-coin',
  xp: 'text-xp',
}

interface StatTileProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Tracked micro-label above the value, e.g. "BALANCE". */
  label: React.ReactNode
  /** The metric itself. Numbers should already be formatted (lib/format.ts). */
  value: React.ReactNode
  /** Optional lucide icon element, sized by the tile. */
  icon?: React.ReactNode
  /** Small note under the value ("this month", "PC-12 · VIP"). */
  hint?: React.ReactNode
  /** Signed change. Positive renders success + up arrow, negative danger + down. */
  delta?: number
  /** Suffix for the delta value, e.g. "%" or "min". */
  deltaSuffix?: string
  tone?: Tone
  /** Digits face: clock font for time/money, display font for counts. */
  mono?: boolean
  size?: 'sm' | 'md'
}

/**
 * Metric tile (F1.11).
 *
 * The atom every dashboard-ish surface is built from — wallet balance, coins,
 * minutes played, active PCs. `tone` only ever colours the icon and the delta,
 * never the surface, so a row of tiles stays visually calm (docs/DESIGN.md §5).
 */
export function StatTile({
  label,
  value,
  icon,
  hint,
  delta,
  deltaSuffix = '',
  tone = 'default',
  mono = false,
  size = 'md',
  className,
  ...props
}: StatTileProps) {
  const hasDelta = typeof delta === 'number' && delta !== 0
  const up = (delta ?? 0) > 0

  return (
    <div
      data-slot="stat-tile"
      className={cn(
        'glass flex flex-col justify-between gap-3 rounded-lg',
        size === 'sm' ? 'p-3' : 'p-4',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="label-mono text-[9px] text-text-low">{label}</span>
        {icon && (
          <span className={cn('shrink-0', ACCENT[tone], '[&_svg]:size-4')} aria-hidden>
            {icon}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-bold leading-none tabular-nums text-text-high',
              mono ? 'font-clock' : 'font-display',
              size === 'sm' ? 'text-xl' : 'text-2xl',
            )}
          >
            {value}
          </span>
          {hasDelta && (
            <span
              className={cn(
                'flex items-center gap-0.5 font-display text-[11px] font-semibold tabular-nums',
                up ? 'text-success' : 'text-danger',
              )}
            >
              {up ? <icons.deltaUp size={12} aria-hidden /> : <icons.deltaDown size={12} aria-hidden />}
              {up ? '+' : ''}
              {delta}
              {deltaSuffix}
            </span>
          )}
        </div>
        {hint && <p className="text-xs leading-relaxed text-text-low">{hint}</p>}
      </div>
    </div>
  )
}
