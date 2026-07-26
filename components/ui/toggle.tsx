'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Visible label. Also becomes the switch's accessible name. */
  label?: string
  /** Secondary explanatory line under the label. */
  description?: string
  disabled?: boolean
  /** `row` renders a bordered settings row; `bare` renders the switch alone. */
  variant?: 'row' | 'bare'
  className?: string
}

/**
 * Switch control (F1.7) — extracted from `settings-modal.tsx`.
 *
 * Uses `role="switch"` + `aria-checked` so assistive tech announces state
 * rather than "button". The whole row is clickable in `row` mode.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  variant = 'row',
  className,
}: ToggleProps) {
  const id = useId()

  const knob = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-primary' : 'bg-white/15',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )

  if (variant === 'bare') return <div className={className}>{knob}</div>

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-3.5 py-3',
        disabled && 'opacity-50',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm text-text-high">
          {label}
        </label>
        {description && (
          <span id={`${id}-desc`} className="text-xs leading-relaxed text-text-low">
            {description}
          </span>
        )}
      </div>
      {knob}
    </div>
  )
}
