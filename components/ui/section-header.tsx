import { cn } from '@/lib/utils'

interface SectionHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Two-digit section number, e.g. "01". Renders as a tracked red label. */
  index?: string
  /** Section title — always uppercase display type. */
  title: React.ReactNode
  /** Optional one-line description under the title. */
  subtitle?: React.ReactNode
  /** Right-aligned action slot (link, filter, "see all"). */
  action?: React.ReactNode
  /** Heading level for correct document outline. */
  as?: 'h1' | 'h2' | 'h3'
}

/**
 * Numbered section heading in the `01 / SESSION` style (F1.3).
 *
 * Extracted from `home-view.tsx` so every screen in the product numbers its
 * sections identically — one of the seams that makes the launcher read as a
 * single terminal rather than a stack of pages (docs/DESIGN.md §5.3).
 */
export function SectionHeader({
  index,
  title,
  subtitle,
  action,
  as: Heading = 'h2',
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-col gap-1.5', className)} {...props}>
      <div className="flex items-center gap-3">
        {index && (
          <>
            <span className="label-mono text-[10px] tabular-nums text-primary">{index}</span>
            <span className="h-3 w-px bg-border-strong" aria-hidden />
          </>
        )}
        <Heading className="font-display text-lg font-bold uppercase tracking-tight text-text-high text-balance">
          {title}
        </Heading>
        <span className="ml-1 h-px flex-1 bg-border" aria-hidden />
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {subtitle && (
        <p className={cn('text-sm leading-relaxed text-text-medium', index && 'pl-[38px]')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
