'use client'

import { useId } from 'react'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Clickable label. Rich content is allowed — it is a `<label>`, not a string. */
  label: React.ReactNode
  /** Secondary line under the label. */
  description?: React.ReactNode
  /** Validation message. Turns the box red and is announced to readers. */
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Consent checkbox (F1.24) — the club-rules box of `C1.4`, and the walk-in
 * consent of `G1.5` after it.
 *
 * Not a `Toggle` (F1.7): a switch is a *setting* that takes effect the moment it
 * moves, and a promise ("I accept the rules") is neither. Two players and one
 * regulator have to be able to tell those apart, so the two controls stay two
 * controls, with the right ARIA role each.
 *
 * The control is a real `<input type="checkbox">`, hidden with `sr-only` and
 * drawn by the box next to it. That is deliberate rather than a `<button
 * role="checkbox">`: form submission, `:checked`, the native label association
 * and the focus ring all come for free, and the browser keeps announcing it as
 * a checkbox even if the visual box is ever restyled away.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  error,
  disabled,
  className,
}: CheckboxProps) {
  const id = useId()
  const messageId = `${id}-message`
  const descriptionId = `${id}-desc`

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {/* The input sits *inside* the label and before the box, so `peer-*` can
          reach the box (a sibling) — a focus ring driven from a wrapper outside
          would never match. */}
      <label
        htmlFor={id}
        className={cn(
          'flex items-start gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? messageId : null, description ? descriptionId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(e) => onChange(e.target.checked)}
        />

        <span
          aria-hidden
          className={cn(
            // Same recess, radius language and focus signature as `Field`
            // (F1.5): the box is that frame at 18 px, not a new material.
            'well mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all',
            'peer-focus-visible:shadow-[0_0_0_3px_rgba(229,53,43,0.14)]',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : error
                ? 'border-danger'
                : 'border-border peer-focus-visible:border-primary',
          )}
        >
          <icons.check size={13} strokeWidth={3} className={checked ? 'opacity-100' : 'opacity-0'} />
        </span>

        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-pretty text-xs leading-relaxed text-text-medium">{label}</span>
          {description && (
            <span id={descriptionId} className="text-pretty text-[11px] leading-relaxed text-text-low">
              {description}
            </span>
          )}
        </span>
      </label>

      {error && (
        <span id={messageId} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
