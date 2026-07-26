import { cn } from '@/lib/utils'

interface SkeletonProps extends React.ComponentProps<'div'> {
  /** Corner radius, matched to the element being replaced. */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const RADIUS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const

/**
 * Loading placeholder (F1.16).
 *
 * One shimmer for the whole product. The presets below cover the four shapes
 * that actually repeat — card, row, tile, text — so no screen invents its own.
 */
export function Skeleton({ className, radius = 'lg', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn('animate-pulse bg-white/[0.06]', RADIUS[radius], className)}
      {...props}
    />
  )
}

/** Media card placeholder: cover + two text lines (game/product grids). */
export function SkeletonCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="h-3.5 w-3/4" radius="sm" />
      <Skeleton className="h-3 w-1/2" radius="sm" />
    </div>
  )
}

/** List row placeholder: avatar + two lines + trailing value. */
export function SkeletonRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <Skeleton className="size-10 shrink-0" radius="full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" radius="sm" />
        <Skeleton className="h-3 w-1/4" radius="sm" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" radius="sm" />
    </div>
  )
}

/** Stat tile placeholder — same box as `StatTile` (F1.11). */
export function SkeletonTile({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('glass flex flex-col justify-between gap-6 rounded-lg p-4', className)}
      {...props}
    >
      <Skeleton className="h-2.5 w-16" radius="sm" />
      <Skeleton className="h-6 w-24" radius="sm" />
    </div>
  )
}

/** Paragraph placeholder. The last line is deliberately short. */
export function SkeletonText({
  lines = 3,
  className,
  ...props
}: React.ComponentProps<'div'> & { lines?: number }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          radius="sm"
          className={cn('h-3', i === lines - 1 ? 'w-2/5' : 'w-full')}
        />
      ))}
    </div>
  )
}
