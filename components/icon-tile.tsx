import type { LucideIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'primary' | 'muted' | 'warning' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, { box: string; icon: number; radius: string }> = {
  sm: { box: 'h-9 w-9', icon: 16, radius: 'rounded-md' },
  md: { box: 'h-11 w-11', icon: 20, radius: 'rounded-md' },
  lg: { box: 'h-14 w-14', icon: 24, radius: 'rounded-lg' },
  xl: { box: 'h-16 w-16', icon: 28, radius: 'rounded-lg' },
}

const VARIANTS: Record<Variant, string> = {
  default: 'bg-white/[0.04] text-text-high border border-border',
  primary:
    'bg-primary/12 text-primary border border-primary/35 shadow-[inset_0_0_20px_-8px_rgba(229,53,43,0.6)]',
  muted: 'bg-white/[0.03] text-text-low border border-border',
  warning: 'bg-warning/12 text-warning border border-warning/30',
  success: 'bg-success/12 text-success border border-success/30',
}

interface IconTileProps {
  icon: LucideIcon
  variant?: Variant
  size?: Size
  className?: string
  /** show tactical HUD corner ticks */
  ticks?: boolean
  strokeWidth?: number
}

/**
 * Cohesive static icon tile — a framed lucide icon with optional HUD corner
 * ticks. Replaces the old glossy 3D raster icons with crisp line iconography.
 */
export function IconTile({
  icon: Icon,
  variant = 'default',
  size = 'md',
  className,
  ticks = false,
  strokeWidth = 2,
}: IconTileProps) {
  const s = SIZES[size]
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        s.box,
        s.radius,
        VARIANTS[variant],
        ticks && 'tick-corners',
        ticks && variant === 'primary' && 'tick-corners-primary',
        className,
      )}
    >
      <Icon size={s.icon} strokeWidth={strokeWidth} aria-hidden />
    </span>
  )
}
