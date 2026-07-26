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

/** Layer stack — only the topmost overlay reacts to Escape. */
const stack: symbol[] = []

interface Options {
  open: boolean
  onClose: () => void
  /** Close when Escape is pressed. Default true. */
  closeOnEscape?: boolean
  /** Trap Tab focus inside the panel. Default true. */
  trapFocus?: boolean
  /** Lock body scroll while open. Default true. */
  lockScroll?: boolean
}

/**
 * Shared behavioural core for every overlay surface (Modal F1.8, Drawer F1.9).
 *
 * Handles: Escape on the topmost layer only, focus trap with restore, body
 * scroll lock, and initial focus. Returns the ref to attach to the panel.
 */
export function useDismissableLayer({
  open,
  onClose,
  closeOnEscape = true,
  trapFocus = true,
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

  // --- focus trap + restore ---
  useEffect(() => {
    if (!open || !trapFocus) return
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (!panel) return

    // Focus the first control, or the panel itself if it has none.
    const first = panel.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel).focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
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
    return () => {
      panel.removeEventListener('keydown', onKeyDown)
      previous?.focus?.({ preventScroll: true })
    }
  }, [open, trapFocus])

  return panelRef
}
