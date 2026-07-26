'use client'

import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.ComponentProps<'select'>, 'children' | 'onChange'> {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** `row` = bordered settings row with label on the left. `bare` = control only. */
  variant?: 'row' | 'bare'
  error?: string
}

/**
 * Native select in product skin (F1.7) — extracted from `settings-modal.tsx`.
 *
 * Deliberately native: on a club PC the OS dropdown is faster and works with
 * every input device, including touch kiosks. We only restyle the trigger.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  variant = 'row',
  error,
  className,
  id,
  disabled,
  ...props
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId

  const control = (
    <div className="relative flex items-center">
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-sm border bg-surface-2 py-1.5 pl-2.5 pr-8 text-sm text-text-high',
          'outline-none transition-colors focus:border-primary',
          'focus-visible:ring-2 focus-visible:ring-primary/50',
          error ? 'border-danger' : 'border-border',
          variant === 'bare' && 'w-full',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 text-text-low"
      />
    </div>
  )

  if (variant === 'bare') {
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="label-mono text-[10px] text-text-low">
            {label}
          </label>
        )}
        {control}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-3.5 py-2.5',
        disabled && 'opacity-50',
      )}
    >
      <label htmlFor={selectId} className="text-sm text-text-high">
        {label}
      </label>
      {control}
    </div>
  )
}
