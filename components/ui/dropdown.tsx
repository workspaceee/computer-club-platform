'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { icons } from '@/lib/icons'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export interface DropdownOption {
  value: string
  label: string
  /** Second line under the label — the reason to pick this one, not a repeat of it. */
  hint?: string
  disabled?: boolean
}

interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  /** Accessible name. Rendered as a visible caption only when `showLabel`. */
  label: string
  showLabel?: boolean
  /** Leading glyph on the trigger, for a control whose label is short. */
  icon?: React.ReactNode
  /** Aligns the panel to the trigger's right edge — for a control near the viewport edge. */
  align?: 'start' | 'end'
  disabled?: boolean
  className?: string
  /** Panel width. `trigger` matches the button, `auto` fits the longest option. */
  panelWidth?: 'trigger' | 'auto'
}

/**
 * The product's own dropdown (C4.2).
 *
 * The reason this exists next to `ui/select.tsx` is a seam the native control
 * cannot close: a `<select>` renders its *open* list with the operating system,
 * so on the library screen the trigger was a matte glass plate in the project's
 * skin and the list that dropped out of it was a Windows combo box — grey, its
 * own font, its own blue selection, the caret in the wrong place. On a club
 * station running in kiosk mode that panel is the single widest break in the
 * frame, and it appears at the exact moment the player is looking at it.
 *
 * So the trigger stays the same plate, and the panel is built here out of the
 * same `glass-strong` the avatar menu drops (F6.7): same hairline, same blur,
 * same 8px radius, same `label-mono` option text, and the chosen row marked in
 * the brand red exactly like an applied filter chip — the two controls sit two
 * centimetres apart on this screen and had to agree.
 *
 * `ui/select.tsx` is *not* replaced and should not be. Its docblock makes the
 * case for the native control on purpose: inside Settings a native dropdown is
 * the faster, more device-agnostic answer, and a settings row is not a surface
 * anyone is admiring. This is for the controls that sit in a composed frame.
 *
 * Behaviour is the ARIA listbox pattern rather than a menu, because that is what
 * the control is — one value out of several, not a list of commands:
 *   • `role="combobox"` trigger + `role="listbox"` panel + `role="option"` rows
 *   • `aria-activedescendant` is deliberately avoided: real focus moves onto the
 *     option, which is what `useRovingFocus` already implements for the nav, the
 *     filter rows and the library grid — one keyboard model for the screen.
 *   • Escape and outside-press dismiss through the shared layer stack, so the
 *     shell's digit shortcuts know the keyboard is busy and Escape peels this
 *     panel *before* it starts closing the section behind it.
 */
export function Dropdown({
  value,
  onChange,
  options,
  label,
  showLabel = false,
  icon,
  align = 'end',
  disabled,
  className,
  panelWidth = 'auto',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const labelId = useId()
  const reduced = useReducedMotion()

  const selected = options.find((o) => o.value === value)

  // The wrapper is the layer, trigger included: if "outside" covered the
  // trigger, pointer-down would close the panel and the click that follows would
  // reopen it — the button would never toggle off (the same trap the avatar menu
  // documents).
  const layerRef = useDismissableLayer({
    open,
    onClose: () => setOpen(false),
    closeOnOutside: true,
    // A non-modal popover must let Tab leave; `closeOnOutside` then closes it, so
    // focus never lands behind an open panel.
    trapFocus: false,
    // Handled below — the first focusable node in the wrapper is the trigger, and
    // opening should land on the *selected* option instead.
    autoFocus: false,
    // No scroll lock: this panel hangs off a control inside a scrolling page, and
    // locking the body would shift the row it is anchored to.
    lockScroll: false,
  })

  const listRef = useRovingFocus<HTMLDivElement>({
    orientation: 'vertical',
    enabled: open,
  })

  // Opening moves focus onto the row that is already applied — `aria-selected`
  // is what tells the roving hook which one that is, so entering the list starts
  // from "По популярности" rather than from the top of the list every time.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const target =
      list.querySelector<HTMLElement>('[data-roving-item][aria-selected="true"]') ??
      list.querySelector<HTMLElement>('[data-roving-item]')
    target?.focus({ preventScroll: true })
  }, [open, listRef])

  const commit = (next: string) => {
    onChange(next)
    setOpen(false)
    // The layer restores focus on unmount, but only to whatever held it when the
    // panel opened. That is the trigger here, and returning to it is the whole
    // point: the player picked a sort and should still be on the sort control.
    triggerRef.current?.focus({ preventScroll: true })
  }

  return (
    <div ref={layerRef} className={cn('relative', className)}>
      {showLabel && (
        <span id={labelId} className="label-mono mb-1.5 block text-[10px] text-text-low">
          {label}
        </span>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        // `combobox` + `listbox`, not `button` + `menu`: this picks a value.
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        // The caption names it when there is one, otherwise the prop does — a
        // control that only ever says "По популярности" needs to announce what
        // that number *is*.
        {...(showLabel ? { 'aria-labelledby': labelId } : { 'aria-label': label })}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          // Opening with the arrows is part of the pattern, and it is how a
          // keyboard player reaches a closed list without guessing at Enter.
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'glass flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
          disabled
            ? 'cursor-not-allowed text-text-low opacity-50'
            : 'text-text-high hover:border-border-strong',
          // Open is a T3 state: border and tint, no halo. This screen's T1 belongs
          // to the launch button, and an accent in two places is an accent in
          // neither (§4.2).
          open && 'border-primary/60',
        )}
      >
        {icon && (
          <span aria-hidden className="flex shrink-0 items-center text-text-low">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">
          {selected?.label ?? label}
        </span>
        <icons.expand
          size={14}
          aria-hidden
          className={cn(
            'shrink-0 text-text-low transition-transform',
            open && 'rotate-180 text-primary',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            {...(showLabel ? { 'aria-labelledby': labelId } : { 'aria-label': label })}
            // Same entrance as the avatar menu, and cut to a plain fade when the
            // player asked for less motion.
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={cn(
              'glass-strong absolute z-50 mt-1.5 overflow-hidden rounded-lg p-1.5',
              // The clamp is the phone case: this control sits at the right edge
              // of the filter row, so an unclamped panel of long Lithuanian
              // labels would run off the viewport and take the last option with
              // it.
              'max-h-[min(20rem,60vh)] overflow-y-auto max-w-[calc(100vw-1.5rem)]',
              align === 'end' ? 'right-0' : 'left-0',
              panelWidth === 'trigger' ? 'w-full' : 'w-max min-w-full',
            )}
          >
            {options.map((option) => {
              const active = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  // One tab stop for the list, arrows walk the rows (F6.7).
                  data-roving-item
                  onClick={() => commit(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                    option.disabled
                      ? 'cursor-not-allowed text-text-low opacity-50'
                      : active
                        ? 'bg-primary/15 text-primary'
                        : 'text-text-high hover:bg-white/5',
                  )}
                >
                  {/* The tick keeps its column whether or not it is drawn, so the
                      labels do not shift sideways as the choice moves down the
                      list. `icons.check` is the product's "this one is chosen" —
                      the same glyph the state filter chips use. */}
                  <span aria-hidden className="flex w-3.5 shrink-0 items-center justify-center">
                    {active && <icons.check size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* No `truncate` on the option itself: the row is the place
                        the label must be readable in full, and the panel is
                        sized (`w-max`) to let it be. Clipping here is what turned
                        five Russian sort names into three ellipses. It wraps
                        instead if the viewport clamp ever forces the issue. */}
                    <span className="block text-sm">{option.label}</span>
                    {option.hint && (
                      <span className="mt-0.5 block text-xs leading-snug text-text-low">
                        {option.hint}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
