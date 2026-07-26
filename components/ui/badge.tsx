import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Status badge (F1.10).
 *
 * `tone` carries the meaning, `variant` carries the weight. Zone tones use the
 * loyalty/zone tokens added in F1.1 so a VIP chip always reads gold and a PS5
 * chip always reads blue across client and admin.
 */
const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 font-display font-semibold uppercase leading-none tracking-widest [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        success: '',
        warning: '',
        danger: '',
        info: '',
        neutral: '',
        vip: '',
        ps5: '',
      },
      variant: {
        solid: 'border border-transparent',
        soft: 'border',
        outline: 'border bg-transparent',
      },
      size: {
        sm: 'rounded-sm px-1.5 py-0.5 text-[9px]',
        md: 'rounded-sm px-2.5 py-1 text-[10px]',
      },
      round: { true: 'rounded-full', false: '' },
    },
    compoundVariants: [
      // --- solid ---
      { tone: 'success', variant: 'solid', class: 'bg-success text-background' },
      { tone: 'warning', variant: 'solid', class: 'bg-warning text-background' },
      { tone: 'danger', variant: 'solid', class: 'bg-danger text-primary-foreground' },
      { tone: 'info', variant: 'solid', class: 'bg-info text-background' },
      { tone: 'neutral', variant: 'solid', class: 'bg-steel text-background' },
      { tone: 'vip', variant: 'solid', class: 'bg-zone-vip text-background' },
      { tone: 'ps5', variant: 'solid', class: 'bg-zone-ps5 text-background' },
      // --- soft ---
      { tone: 'success', variant: 'soft', class: 'border-success/30 bg-success/15 text-success' },
      { tone: 'warning', variant: 'soft', class: 'border-warning/30 bg-warning/15 text-warning' },
      { tone: 'danger', variant: 'soft', class: 'border-danger/30 bg-danger/15 text-danger' },
      { tone: 'info', variant: 'soft', class: 'border-info/30 bg-info/15 text-info' },
      { tone: 'neutral', variant: 'soft', class: 'border-border bg-white/[0.06] text-text-medium' },
      { tone: 'vip', variant: 'soft', class: 'border-zone-vip/30 bg-zone-vip/15 text-zone-vip' },
      { tone: 'ps5', variant: 'soft', class: 'border-zone-ps5/30 bg-zone-ps5/15 text-zone-ps5' },
      // --- outline ---
      { tone: 'success', variant: 'outline', class: 'border-success/50 text-success' },
      { tone: 'warning', variant: 'outline', class: 'border-warning/50 text-warning' },
      { tone: 'danger', variant: 'outline', class: 'border-danger/50 text-danger' },
      { tone: 'info', variant: 'outline', class: 'border-info/50 text-info' },
      { tone: 'neutral', variant: 'outline', class: 'border-border-strong text-text-medium' },
      { tone: 'vip', variant: 'outline', class: 'border-zone-vip/50 text-zone-vip' },
      { tone: 'ps5', variant: 'outline', class: 'border-zone-ps5/50 text-zone-ps5' },
    ],
    defaultVariants: { tone: 'neutral', variant: 'soft', size: 'md', round: false },
  },
)

interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  /** Leading status dot. Pulses when `pulse` is set (live states). */
  dot?: boolean
  pulse?: boolean
}

export function Badge({
  className,
  tone,
  variant,
  size,
  round,
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant, size, round }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 rounded-full bg-current', pulse && 'animate-pulse')}
        />
      )}
      {children}
    </span>
  )
}

export { badgeVariants }
