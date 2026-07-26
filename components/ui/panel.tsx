import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Base surface of the product (F1.2).
 *
 * Three materials from docs/DESIGN.md §4:
 *  - `glass`  — light frosted plate: chips, secondary panels
 *  - `strong` — heavier frosted plate: modals, important overlays
 *  - `flat`   — solid opaque panel: dense cards, long lists (no blur cost)
 */
const panelVariants = cva('relative', {
  variants: {
    variant: {
      glass: 'glass',
      strong: 'glass-strong',
      flat: 'panel',
    },
    radius: {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
    },
    /** Tactical HUD corner ticks. */
    ticks: { true: 'tick-corners', false: '' },
  },
  defaultVariants: { variant: 'glass', radius: 'lg', ticks: false },
})

interface PanelProps
  extends React.ComponentProps<'section'>,
    VariantProps<typeof panelVariants> {
  /** Optional panel title, rendered in the header strip. */
  title?: React.ReactNode
  /** Small tracked label above the title (e.g. "SESSION"). */
  eyebrow?: React.ReactNode
  /** Right-aligned actions slot in the header strip. */
  actions?: React.ReactNode
  /** Removes the default inner padding — for edge-to-edge lists and media. */
  flush?: boolean
}

export function Panel({
  className,
  variant,
  radius,
  ticks,
  title,
  eyebrow,
  actions,
  flush = false,
  children,
  ...props
}: PanelProps) {
  const hasHeader = Boolean(title || eyebrow || actions)

  return (
    <section
      data-slot="panel"
      className={cn(panelVariants({ variant, radius, ticks }), 'overflow-hidden', className)}
      {...props}
    >
      {hasHeader && (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow && (
              <span className="label-mono text-[9px] text-primary">{eyebrow}</span>
            )}
            {title && (
              <h2 className="truncate font-display text-base font-bold uppercase tracking-tight text-text-high">
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className={cn(!flush && 'p-5')}>{children}</div>
    </section>
  )
}

export { panelVariants }
