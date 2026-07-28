'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  /** Tracked micro-label above the control. */
  label?: string
  /** Leading icon inside the frame (16px lucide icon). */
  icon?: React.ReactNode
  /** Trailing slot inside the frame — reveal toggle, unit, action. */
  trailing?: React.ReactNode
  /** Validation message. Turns the frame red and is announced to readers. */
  error?: string
  /** Helper text shown when there is no error. */
  hint?: string
  /** Convenience callback with the raw string value. */
  onValueChange?: (value: string) => void
}

/**
 * The single text input of the product (F1.5).
 *
 * Extracted from `lock-screen.tsx`. Every form in the launcher, the guest flow
 * and the admin panel uses this — no screen defines its own input frame.
 * Error state is wired to `aria-invalid` + `aria-describedby` so screen readers
 * get the message, not just a red border.
 */
export function Field({
  label,
  icon,
  trailing,
  error,
  hint,
  onValueChange,
  onChange,
  className,
  id,
  ...props
}: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`
  const message = error ?? hint

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="label-mono text-[10px] text-text-low">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md border bg-black/40 px-3.5 transition-all',
          'focus-within:border-primary focus-within:bg-black/60',
          'focus-within:shadow-[0_0_0_3px_rgba(229,53,43,0.14),0_0_24px_-6px_rgba(229,53,43,0.35)]',
          error ? 'border-danger' : 'border-border',
          props.disabled && 'opacity-50',
        )}
      >
        {icon && (
          <span className="shrink-0 text-text-low" aria-hidden>
            {icon}
          </span>
        )}

        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(e) => {
            onChange?.(e)
            onValueChange?.(e.target.value)
          }}
          className={cn(
            'w-full bg-transparent py-2.5 text-sm text-text-high outline-none',
            'placeholder:text-text-low disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />

        {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
      </div>

      {message && (
        <span
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-xs', error ? 'text-danger' : 'text-text-low')}
        >
          {message}
        </span>
      )}
    </div>
  )
}
