'use client'

import { useId, useImperativeHandle, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * The one thing a parent needs to *do* to this control: put the caret back.
 *
 * A rejected code is cleared by the parent, and the row it was typed into was
 * disabled while the request was in flight — which blurs it. Without a way to
 * refocus, the player has to aim at a 56 px box with a mouse before they can
 * retype six digits they already have in front of them.
 */
export interface CodeInputHandle {
  /** Focus and select a cell; defaults to the first. */
  focus: (index?: number) => void
}

interface CodeInputProps {
  /** Digits entered so far, `''` … `'123456'`. Shorter than `length` is normal. */
  value: string
  onValueChange: (value: string) => void
  /** How many cells. Server-driven in C1.3, 4 for the PIN of C1.11. */
  length?: number
  /** Fired once the last cell is filled — usually "submit". */
  onComplete?: (value: string) => void
  /** Tracked micro-label above the cells, like `Field`. */
  label?: string
  /** Validation message. Turns every cell red and is announced to readers. */
  error?: string
  /** Helper text shown when there is no error. */
  hint?: string
  disabled?: boolean
  autoFocus?: boolean
  /** Hides the digits (PIN on a shared station). */
  mask?: boolean
  /** React 19 passes refs as a plain prop — no `forwardRef` wrapper needed. */
  ref?: React.Ref<CodeInputHandle>
  className?: string
}

const DIGITS = /\d/g

/**
 * One-time-code entry (C1.3).
 *
 * A primitive rather than a lock-screen local, because three planned features
 * type a short code into boxes: the email OTP of password recovery, the
 * registration confirmation of `C1.4` and the 4-digit PIN of `C1.11`. Its job is
 * the part everyone gets wrong on a kiosk:
 *
 *  - **paste works.** `Ctrl+V` of "123 456" from the mail app fills the row,
 *    non-digits stripped — a per-cell `maxLength=1` input would otherwise
 *    swallow the paste and keep the first character.
 *  - **the code is one value, not six.** The parent holds a string, so a
 *    submit handler never has to join an array, and clearing on error is one
 *    `onValueChange('')`.
 *  - **it is one form control to assistive tech.** The cells are decorative
 *    detail; the row carries `role="group"` with the label, and each cell is
 *    labelled with its position instead of six anonymous text boxes.
 *  - **autofill from SMS/mail is not blocked** — `autoComplete="one-time-code"`
 *    is on the first cell, where the browser looks for it.
 *
 * Focus follows typing: filling a cell advances, `Backspace` on an empty cell
 * steps back and deletes, arrows move without editing.
 */
export function CodeInput({
  value,
  onValueChange,
  length = 6,
  onComplete,
  label,
  error,
  hint,
  disabled,
  autoFocus,
  mask,
  ref,
  className,
}: CodeInputProps) {
  const groupId = useId()
  const messageId = `${groupId}-message`
  const message = error ?? hint
  const cells = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.replace(/\D/g, '').slice(0, length)

  const focusCell = (index: number) => {
    const target = cells.current[Math.max(0, Math.min(length - 1, index))]
    target?.focus()
    target?.select()
  }

  useImperativeHandle(ref, () => ({ focus: (index = 0) => focusCell(index) }))

  /** Writes `next`, reports it, and moves the caret where a human expects it. */
  const commit = (next: string, caret: number) => {
    const clean = next.slice(0, length)
    onValueChange(clean)
    focusCell(caret)
    if (clean.length === length) onComplete?.(clean)
  }

  const handleInput = (index: number, raw: string) => {
    const typed = raw.match(DIGITS)?.join('') ?? ''
    if (!typed) return
    // A single character replaces its own cell; several (paste, or a fast
    // autofill) spill forward from here.
    const head = digits.slice(0, index)
    const next = (head + typed + digits.slice(index + typed.length)).slice(0, length)
    commit(next, index + typed.length)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        commit(digits.slice(0, index) + digits.slice(index + 1), index)
        return
      }
      commit(digits.slice(0, Math.max(0, index - 1)) + digits.slice(index), index - 1)
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusCell(index - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusCell(index + 1)
    }
  }

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <span id={`${groupId}-label`} className="label-mono text-[10px] text-text-low">
          {label}
        </span>
      )}

      <div
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={message ? messageId : undefined}
        className="flex items-center gap-2"
      >
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              cells.current[i] = el
            }}
            // `text`, not `number`: a number input brings spinners, accepts
            // `e` and `-`, and drops the leading zero of "012345".
            type={mask ? 'password' : 'text'}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`${label ?? ''} ${i + 1}/${length}`.trim()}
            aria-invalid={error ? true : undefined}
            maxLength={length}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            value={digits[i] ?? ''}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              // Same recess, radius and focus signature as `Field` (F1.5) — the
              // cells are that input cut into pieces, not a new frame.
              'well h-14 min-w-0 flex-1 rounded-lg border text-center transition-all',
              'font-clock text-2xl font-semibold tabular-nums text-text-high outline-none',
              'focus:border-primary focus:well-deep',
              'focus:shadow-[0_0_0_3px_rgba(229,53,43,0.14),0_0_24px_-6px_rgba(229,53,43,0.35)]',
              error ? 'border-danger' : 'border-border',
              disabled && 'opacity-50',
            )}
          />
        ))}
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
