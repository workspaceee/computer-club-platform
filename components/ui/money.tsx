import { formatEur, toCents } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Money display (F1.18).
 *
 * Never format currency inline again — prices, wallet balances and open tabs
 * all go through this primitive so the symbol, decimals and the sign rules stay
 * identical across launcher and admin. See docs/DESIGN.md §1.
 *
 * `tone="debt"` is the one semantic case: it forces an explicit minus sign and
 * the `--color-debt` red, because an open tab must never read like a credit.
 */
type Tone = 'default' | 'muted' | 'debt' | 'success' | 'coin' | 'primary'

const TONE: Record<Tone, string> = {
  default: 'text-text-high',
  muted: 'text-text-medium',
  debt: 'text-debt',
  success: 'text-success',
  coin: 'text-coin',
  primary: 'text-primary',
}

const SIZE = {
  xs: 'text-[11px]',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
} as const

interface MoneyProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Amount in euros (use `fromCents` when the source is minor units). */
  value: number
  /** Treat `value` as integer cents. */
  fromCents?: boolean
  tone?: Tone
  size?: keyof typeof SIZE
  /** Drop the decimals for compact chips (e.g. "€12"). */
  decimals?: 0 | 2
  /** Show a `+` in front of positive amounts (top-ups, deltas). */
  signed?: boolean
  /** Hide the € symbol — for tables that carry the unit in the column head. */
  hideSymbol?: boolean
  /** Tabular clock face so columns of numbers line up. */
  mono?: boolean
  /** Trailing unit, e.g. "/ hour". */
  suffix?: React.ReactNode
  /** Renders the whole amount at reduced emphasis (struck-through original price). */
  strike?: boolean
}

export function Money({
  value,
  fromCents = false,
  tone = 'default',
  size = 'md',
  decimals = 2,
  signed = false,
  hideSymbol = false,
  mono = true,
  suffix,
  strike = false,
  className,
  ...props
}: MoneyProps) {
  // Everything downstream is integer cents (F3.6); euros are a caller convenience.
  const cents = fromCents ? Math.round(value) : toCents(value)
  const isDebt = tone === 'debt'
  // A debt is always negative regardless of how the caller stores it.
  const negative = isDebt || cents < 0
  const sign = negative ? '−' : signed && cents > 0 ? '+' : ''
  const body = formatEur(cents, { decimals, symbol: !hideSymbol, absolute: true })

  return (
    <span
      data-slot="money"
      className={cn(
        'inline-flex items-baseline gap-1 whitespace-nowrap font-semibold tabular-nums',
        mono && 'font-clock tracking-tight',
        SIZE[size],
        TONE[tone],
        strike && 'text-text-low line-through decoration-text-low/60',
        className,
      )}
      {...props}
    >
      <span>
        {sign}
        {body}
      </span>
      {suffix && <span className="font-sans text-[0.7em] font-medium text-text-low">{suffix}</span>}
    </span>
  )
}
