'use client'

import { useEffect, useRef } from 'react'

/** Elements that can receive focus inside an overlay. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Visible, keyboard-reachable controls inside a panel.
 *
 * `tabIndex >= 0` is not redundant with the selector: a `<button>` matches
 * `button:not([disabled])` even when a roving group has parked it at
 * `tabindex="-1"` (F6.7). Without this filter a focus trap around a grid would
 * cycle through every card instead of the group's single stop.
 */
const focusableIn = (panel: HTMLElement): HTMLElement[] =>
  Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && el.tabIndex >= 0,
  )

/**
 * Layer stack — only the topmost dismissable surface reacts to Escape.
 *
 * Every dismissable surface registers here, not just the modal ones (F6.7). The
 * avatar menu used to bind its own `document` keydown for Escape, which meant
 * the product had two independent answers to one key and neither knew about the
 * other. Sharing the stack is what makes "Escape peels exactly one layer" a
 * property of the shell instead of a coincidence of render order.
 */
const stack: symbol[] = []

/**
 * Is anything dismissable currently open?
 *
 * Global keyboard shortcuts ask this before acting: a digit that jumps to a
 * section must not fire while a checkout dialog is up (F6.7).
 */
export const isLayerOpen = (): boolean => stack.length > 0

interface Options {
  open: boolean
  onClose: () => void
  /** Close when Escape is pressed. Default true. */
  closeOnEscape?: boolean
  /**
   * Close when focus or a pointer lands outside the panel. For non-modal
   * surfaces (menus, popovers) — a modal is covered by its own scrim instead.
   * Default false.
   */
  closeOnOutside?: boolean
  /** Trap Tab focus inside the panel. Default true. */
  trapFocus?: boolean
  /** Move focus into the panel when it opens. Defaults to `trapFocus`. */
  autoFocus?: boolean
  /** Return focus to whatever was focused before opening. Default true. */
  restoreFocus?: boolean
  /** Lock body scroll while open. Default true. */
  lockScroll?: boolean
}

/**
 * Shared behavioural core for every dismissable surface — Modal (F1.8), Drawer
 * (F1.9), ConfirmDialog, and the non-modal avatar menu (F6.7).
 *
 * Handles: Escape on the topmost layer only, outside dismissal, focus trap,
 * initial focus, focus restore, and body scroll lock. Returns the ref to attach
 * to the panel.
 *
 * The options are split rather than bundled because a menu needs three of these
 * five behaviours and would be wrong with the other two: trapping Tab inside a
 * non-modal popover strands the keyboard, and locking body scroll for a
 * dropdown shifts the page it is anchored to.
 */
export function useDismissableLayer({
  open,
  onClose,
  closeOnEscape = true,
  closeOnOutside = false,
  trapFocus = true,
  autoFocus = trapFocus,
  restoreFocus = true,
  lockScroll = true,
}: Options) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Keep the latest onClose without re-running the effect on every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // --- layer registration + Escape ---
  useEffect(() => {
    if (!open) return
    const id = Symbol('layer')
    stack.push(id)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !closeOnEscape) return
      // Only the top layer closes, so Esc peels overlays one at a time.
      if (stack[stack.length - 1] !== id) return
      e.stopPropagation()
      onCloseRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const i = stack.indexOf(id)
      if (i > -1) stack.splice(i, 1)
    }
  }, [open, closeOnEscape])

  // --- outside dismissal (non-modal surfaces) ---
  useEffect(() => {
    if (!open || !closeOnOutside) return

    const isOutside = (target: EventTarget | null) => {
      const panel = panelRef.current
      return !!panel && target instanceof Node && !panel.contains(target)
    }

    // `pointerdown`, not `click`: a menu must be gone before the click lands on
    // whatever is underneath, otherwise the item and the thing behind it both
    // react to one press.
    const onPointerDown = (e: PointerEvent) => {
      if (isOutside(e.target)) onCloseRef.current()
    }
    // `focusin` is the keyboard half of the same rule: tabbing past the last
    // item leaves a non-modal menu hanging open behind the focus ring.
    const onFocusIn = (e: FocusEvent) => {
      if (isOutside(e.target)) onCloseRef.current()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open, closeOnOutside])

  // --- body scroll lock ---
  useEffect(() => {
    if (!open || !lockScroll) return
    const { overflow, paddingRight } = document.body.style
    // Compensate for the disappearing scrollbar so the layout doesn't jump.
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [open, lockScroll])

  // --- initial focus + restore ---
  // Separate from the trap: a menu wants focus moved in and handed back, but
  // must not hold Tab captive.
  useEffect(() => {
    if (!open || (!autoFocus && !restoreFocus)) return
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current

    if (autoFocus && panel) {
      // Focus the first control, or the panel itself if it has none.
      const [first] = focusableIn(panel)
      ;(first ?? panel).focus({ preventScroll: true })
    }

    return () => {
      // `preventScroll` matters on the way back too: without it the browser
      // scrolls the page to the restored element, which after a tall dialog
      // means the section jumps under the player.
      if (restoreFocus) previous?.focus?.({ preventScroll: true })
    }
  }, [open, autoFocus, restoreFocus])

  // --- focus trap ---
  useEffect(() => {
    if (!open || !trapFocus) return
    const panel = panelRef.current
    if (!panel) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusableIn(panel)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [open, trapFocus])

  return panelRef
}
