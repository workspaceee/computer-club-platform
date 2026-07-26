'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children'> {
  title?: React.ReactNode
  /** Human explanation. Never dump raw stack traces at a club guest. */
  description?: React.ReactNode
  /** Technical detail, shown small and muted (request id, error code). */
  detail?: React.ReactNode
  /** Retry handler — the whole point of this component. */
  onRetry?: () => void
  retryLabel?: React.ReactNode
  /** Shows the spinner on the retry button while the refetch runs. */
  retrying?: boolean
  /** Secondary escape hatch, e.g. "Call admin". */
  secondaryLabel?: React.ReactNode
  onSecondary?: () => void
  size?: 'sm' | 'md'
  bare?: boolean
}

/**
 * Error state with retry (F1.15).
 *
 * Mock API calls can fail on purpose (F3.4), so every data surface must be able
 * to render this and recover without a page reload.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this section. Check the connection and try again.',
  detail,
  onRetry,
  retryLabel = 'Retry',
  retrying = false,
  secondaryLabel,
  onSecondary,
  size = 'md',
  bare = false,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        !bare && 'glass rounded-lg border-danger/25',
        size === 'sm' ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger"
      >
        <AlertTriangle size={24} />
      </span>

      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-base font-bold uppercase tracking-tight text-text-high text-balance">
          {title}
        </h3>
        {description && (
          <p className="text-sm leading-relaxed text-text-medium text-pretty">{description}</p>
        )}
        {detail && (
          <p className="label-mono mt-1 text-[9px] break-all text-text-low">{detail}</p>
        )}
      </div>

      {(onRetry || onSecondary) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button
              size="sm"
              variant="secondary"
              loading={retrying}
              onClick={onRetry}
              iconLeft={<RotateCcw aria-hidden />}
            >
              {retryLabel}
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
