'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * The single button of the product (F1.4).
 *
 * Variants map onto the tactical palette from docs/DESIGN.md §1 — one red
 * accent, three status colours, everything else steel. Every variant carries a
 * mandatory focus ring so the launcher stays fully keyboard operable.
 */
const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2',
    'font-display font-bold uppercase tracking-[0.14em] whitespace-nowrap',
    'border transition-all duration-200 outline-none',
    // Mandatory, always-visible focus ring (§0.4 accessibility rule).
    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-primary text-primary-foreground shadow-[0_0_24px_-4px_rgba(229,53,43,0.45)] hover:bg-primary-hover hover:shadow-[0_0_36px_-4px_rgba(229,53,43,0.65)]',
        secondary:
          'border-border bg-white/[0.04] text-text-high hover:border-primary/55 hover:bg-primary/10 hover:text-text-high hover:shadow-[0_0_20px_-6px_rgba(229,53,43,0.45)]',
        ghost:
          'border-transparent bg-transparent text-text-medium hover:bg-white/[0.06] hover:text-text-high',
        danger:
          'border-danger/40 bg-danger/15 text-danger hover:border-danger/70 hover:bg-danger/25 hover:text-text-high focus-visible:ring-danger/70',
        success:
          'border-success/40 bg-success/15 text-success hover:border-success/70 hover:bg-success/25 focus-visible:ring-success/70',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-[11px] [&_svg]:size-3.5',
        md: 'h-10 rounded-md px-4 text-xs [&_svg]:size-4',
        lg: 'h-12 rounded-md px-5 text-sm [&_svg]:size-[18px]',
        xl: 'h-14 rounded-lg px-7 text-base [&_svg]:size-5',
      },
      /** Full-width block button (forms, drawers). */
      block: { true: 'w-full', false: '' },
      /**
       * Signature bevelled corner + sheen. Reserved for the ONE primary action
       * on a screen — docs/DESIGN.md §4 forbids this shape anywhere else.
       */
      cut: { true: 'cut-corner overflow-hidden', false: '' },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
      cut: false,
    },
  },
)

type ButtonProps = Omit<React.ComponentProps<'button'>, 'children'> &
  VariantProps<typeof buttonVariants> & {
    /** Swaps content for a spinner and blocks interaction. */
    loading?: boolean
    /** Icon before the label. */
    iconLeft?: React.ReactNode
    /** Icon after the label. */
    iconRight?: React.ReactNode
    children?: React.ReactNode
  }

export function Button({
  className,
  variant,
  size,
  block,
  cut,
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, block, cut }), className)}
      {...props}
    >
      {/* Sheen sweep — only meaningful on the bevelled CTA. */}
      {cut && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/button:translate-x-full"
        />
      )}

      {loading ? (
        <>
          <icons.pending className="animate-spin" aria-hidden />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  )
}

/**
 * Compact square button for icon-only actions (close, back, stepper).
 * Keeps an accessible name mandatory via the required `label` prop.
 */
export function IconButton({
  label,
  className,
  variant = 'ghost',
  size = 'md',
  children,
  ...props
}: Omit<ButtonProps, 'iconLeft' | 'iconRight' | 'block' | 'cut'> & { label: string }) {
  const box = { sm: 'size-8', md: 'size-10', lg: 'size-12', xl: 'size-14' }[size ?? 'md']
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      className={cn('px-0', box, className)}
      {...props}
    >
      {children}
    </Button>
  )
}

export { buttonVariants }
