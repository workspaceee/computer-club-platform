'use client'

/**
 * Arrow-key navigation for a group of controls (F6.7).
 *
 * The reason this exists is a counting problem, not a purity one. A launcher
 * screen is mostly *grids*: the library renders every title the endpoint
 * returned, the bar renders every product. With plain `Tab`, reaching the top
 * bar from the middle of the library costs one keypress per remaining card —
 * on a 60-title library that is nobody's idea of "keyboard operable". The
 * composite-widget rule from WAI-ARIA fixes exactly this: **a group is one tab
 * stop, and the arrows move inside it.** `Tab` then walks between the four
 * regions of a screen (nav, filters, grid, chrome), which is what a player
 * actually wants to do.
 *
 * Two details that make it work on real screens rather than in a demo:
 *
 *   • **The tab stop is remembered, not reset.** Whichever item was focused
 *     last keeps `tabIndex=0`, so tabbing away to the search field and back
 *     returns to the card you were on. On first render the stop is the item the
 *     markup already calls current (`aria-current` / `aria-selected` /
 *     `aria-pressed`), so entering the nav lands on the open section rather
 *     than on "Home".
 *
 *   • **Rows are measured, not configured.** The grid is Tailwind-responsive
 *     (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), so a hardcoded column
 *     count would send ArrowDown to the wrong card at every breakpoint. Items
 *     are grouped by their rendered `offsetTop`, which is true at any width and
 *     also copes with a last row that is not full.
 *
 * The hook deliberately owns no state: `tabIndex` lives on the DOM nodes, so an
 * async grid that replaces all of its children (a new search query) needs no
 * co-ordination with React — the `MutationObserver` re-derives the single stop.
 */

import { useCallback, useEffect, useRef } from 'react'

/**
 * Items opt in with `data-roving-item`. Disabled and hidden controls are
 * skipped so the arrows never park focus somewhere unusable.
 */
const ITEM_SELECTOR = '[data-roving-item]:not([disabled]):not([aria-hidden="true"])'

/** Attributes that can change which item is "current" — never `tabindex`. */
const WATCHED_ATTRS = ['aria-current', 'aria-selected', 'aria-pressed', 'disabled', 'hidden']

type Orientation = 'horizontal' | 'vertical' | 'grid'

interface Options {
  /**
   * `horizontal` — left/right only (nav bars, filter chips).
   * `vertical` — up/down only (menus).
   * `grid` — left/right walk the flow, up/down jump a measured row.
   */
  orientation?: Orientation
  /** Wrap around at the ends. Default true — a kiosk player should not dead-end. */
  loop?: boolean
  enabled?: boolean
}

export function useRovingFocus<T extends HTMLElement = HTMLDivElement>({
  orientation = 'horizontal',
  loop = true,
  enabled = true,
}: Options = {}) {
  const containerRef = useRef<T>(null)

  const readItems = useCallback((): HTMLElement[] => {
    const root = containerRef.current
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      // `offsetParent === null` catches `display:none` branches (the mobile bar
      // on desktop, a collapsed menu) that would otherwise become tab stops.
      (el) => el.offsetParent !== null,
    )
  }, [])

  /** Exactly one item is reachable by Tab; the rest are `-1`. */
  const syncTabStops = useCallback(() => {
    const items = readItems()
    if (items.length === 0) return

    const focused = items.findIndex((el) => el === document.activeElement)
    const marked = items.findIndex(
      (el) =>
        el.hasAttribute('data-roving-active') ||
        el.hasAttribute('aria-current') ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('aria-pressed') === 'true',
    )
    const stop = focused >= 0 ? focused : marked >= 0 ? marked : 0

    items.forEach((el, i) => {
      el.tabIndex = i === stop ? 0 : -1
    })
  }, [readItems])

  useEffect(() => {
    const root = containerRef.current
    if (!enabled || !root) return

    syncTabStops()

    // Re-derive the stop when the group changes: a new search result set, a
    // different section becoming current, a chip turning disabled. `tabindex` is
    // absent from `WATCHED_ATTRS` on purpose — observing it would make this
    // effect feed itself.
    const observer = new MutationObserver(syncTabStops)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: WATCHED_ATTRS,
    })

    // Focus can also arrive by mouse. Following it keeps the "return to where I
    // was" promise regardless of which input device moved focus last.
    const onFocusIn = () => syncTabStops()
    root.addEventListener('focusin', onFocusIn)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return

      const items = readItems()
      const current = items.indexOf(document.activeElement as HTMLElement)
      // Focus is inside the group but not on an item — e.g. the search field of
      // the library. Home/End and the arrows belong to the text caret there.
      if (current < 0) return

      const horizontal = orientation !== 'vertical'
      const vertical = orientation !== 'horizontal'
      let next = -1

      switch (e.key) {
        case 'ArrowRight':
          if (horizontal) next = step(current, 1, items.length, loop)
          break
        case 'ArrowLeft':
          if (horizontal) next = step(current, -1, items.length, loop)
          break
        case 'ArrowDown':
          if (vertical) next = orientation === 'grid'
            ? rowStep(items, current, 1, loop)
            : step(current, 1, items.length, loop)
          break
        case 'ArrowUp':
          if (vertical) next = orientation === 'grid'
            ? rowStep(items, current, -1, loop)
            : step(current, -1, items.length, loop)
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = items.length - 1
          break
        default:
          return
      }

      if (next < 0) return
      // Claim the key even when the target is the current item (a clamped end):
      // otherwise ArrowDown at the bottom of a grid scrolls the page and the
      // group appears to lose focus.
      e.preventDefault()
      items[next]?.focus()
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled, loop, orientation, readItems, syncTabStops])

  return containerRef
}

function step(from: number, delta: number, length: number, loop: boolean): number {
  const next = from + delta
  if (next >= 0 && next < length) return next
  if (!loop) return from
  return (next + length) % length
}

/**
 * Move one visual row, in a grid whose column count is only known at runtime.
 *
 * Rows come from the rendered geometry: items sharing an `offsetTop` are a row.
 * The column is kept across the jump and clamped to the target row, so
 * ArrowDown from the third card of a full row lands on the third card below —
 * or on the last one when that row is short.
 */
function rowStep(items: HTMLElement[], current: number, dir: 1 | -1, loop: boolean): number {
  const rows: number[][] = []
  let lastTop: number | null = null
  for (let i = 0; i < items.length; i++) {
    // Round: sub-pixel layout and hover transforms (the cards lift on hover)
    // otherwise split one visual row into several.
    const top = Math.round(items[i].offsetTop)
    if (lastTop === null || Math.abs(top - lastTop) > 4) {
      rows.push([i])
      lastTop = top
    } else {
      rows[rows.length - 1].push(i)
    }
  }

  const rowIndex = rows.findIndex((row) => row.includes(current))
  if (rowIndex < 0) return -1
  const column = rows[rowIndex].indexOf(current)

  let targetRow = rowIndex + dir
  if (targetRow < 0 || targetRow >= rows.length) {
    if (!loop) return current
    targetRow = (targetRow + rows.length) % rows.length
  }

  const row = rows[targetRow]
  return row[Math.min(column, row.length - 1)]
}
