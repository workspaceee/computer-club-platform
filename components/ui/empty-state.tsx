import type { LucideIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children'> {
  icon?: LucideIcon
  title: React.ReactNode
  /** One or two calm sentences: what is missing and what to do about it. */
  description?: React.ReactNode
  /** Primary call to action label. Requires `onAction`. */
  actionLabel?: React.ReactNode
  onAction?: () => void
  /** Secondary, quieter action. */
  secondaryLabel?: React.ReactNode
  onSecondary?: () => void
  size?: 'sm' | 'md'
  /** Drops the panel material — for empty states already inside a Panel. */
  bare?: boolean
}

/**
 * Empty state (F1.14).
 *
 * Every list in the product (cart, friends, notifications, tournaments,
 * transactions) renders this instead of a blank area — a hard requirement of the
 * Definition of Done in docs/PLAN.md §0.3.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  size = 'md',
  bare = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        !bare && 'glass rounded-lg',
        size === 'sm' ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
      {...props}
    >
      {Icon && (
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full border border-border bg-white/[0.04] text-text-low"
        >
          <Icon size={24} />
        </span>
      )}

      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-base font-bold uppercase tracking-tight text-text-high text-balance">
          {title}
        </h3>
        {description && (
          <p className="text-sm leading-relaxed text-text-medium text-pretty">{description}</p>
        )}
      </div>

      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button size="sm" variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
