'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import type { LucideIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * One section of the rail. Deliberately not tied to `LauncherNavItem`: the
 * primitive knows nothing about the launcher's navigation table (§10.5), it just
 * renders labels the caller already resolved through `t()`.
 */
export interface NavRailItem<T extends string = string> {
  id: T
  /** Already-translated label. Doubles as the accessible name in `pill`. */
  label: string
  /** Two-digit section number — printed by `underline`, announced by both. */
  index?: string
  /** Section glyph from `lib/icons`. Sized by the variant, never by the caller. */
  icon?: LucideIcon
}

interface NavRailProps<T extends string> {
  items: NavRailItem<T>[]
  /** The open section. Anything not in `items` simply leaves the rail unmarked. */
  value: T
  onChange: (id: T) => void
  /**
   * `underline` — the desktop top bar: section number + word, with a 2 px neon
   *   rule that slides along the bottom edge of the bar.
   * `pill` — the thumb-reachable bottom bar: glyph over a micro-label, with a
   *   filled pill sliding behind the active slot.
   */
  variant?: 'underline' | 'pill'
  /** Landmark name — the rail is a `<nav>`, so this is required. */
  label: string
  /** Placement and material only (§10.5), never colour. */
  className?: string
}

/**
 * Navigation rail with the shared sliding indicator (C2.1).
 *
 * The launcher's two navigation bars — the desktop rail in `top-bar.tsx` and the
 * mobile bar in `mobile-nav.tsx` — were the same widget written twice: same
 * roving focus, same `aria-current`, same `aria-keyshortcuts`, same `layoutId`
 * spring, differing only in whether the marker is a rule or a pill. They had
 * already drifted once: the mobile bar dropped its `layoutId` under reduced
 * motion and the top bar did not, so the one setting that exists to stop things
 * flying across the screen was honoured by half the chrome.
 *
 * Not `Segmented` (§10.2), even though the pill mechanics are identical: that
 * primitive is a `radiogroup` of *values*, and this is a `nav` of *destinations*.
 * A screen reader must hear "Games, current page", not "Games, radio button,
 * selected" — and only one of the two may claim the navigation landmark.
 */
export function NavRail<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  label,
  className,
}: NavRailProps<T>) {
  // Unique per instance: the desktop rail and the mobile bar are mounted at the
  // same time (one is merely hidden by a breakpoint), and a shared `layoutId`
  // would make the marker try to travel between them.
  const layoutId = useId()
  const reduced = useReducedMotion()

  // The rail is a composite widget: one tab stop, arrows walk the sections
  // (F6.7). Entering it lands on the open section, because `aria-current` marks
  // the remembered stop. Hidden items are skipped by the hook, so the bar that
  // its breakpoint has switched off contributes zero tab stops rather than a row
  // of invisible ones.
  const navRef = useRovingFocus<HTMLElement>({ orientation: 'horizontal' })

  const isPill = variant === 'pill'

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn(
        'flex items-center',
        isPill ? 'justify-around' : 'gap-1',
        className,
      )}
    >
      {items.map(({ id, label: itemLabel, index, icon: Icon }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            // The glyph-only slot needs a name of its own; the desktop slot
            // already prints one, and labelling it twice would make the roving
            // focus announce "Games Games".
            aria-label={isPill ? itemLabel : undefined}
            aria-current={active ? 'page' : undefined}
            // The printed number is a real shortcut (`use-nav-shortcuts`), so it
            // is announced as one. `01` is typed as `1`.
            aria-keyshortcuts={index ? index.replace(/^0/, '') : undefined}
            data-roving-item
            className={cn(
              'relative flex items-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
              isPill
                ? 'flex-1 flex-col gap-1 rounded-md py-2.5 text-[10px] font-semibold'
                : 'gap-2 rounded-sm px-3.5 py-2',
              active
                ? isPill
                  ? 'text-primary'
                  : 'text-text-high'
                : isPill
                  ? 'text-text-low'
                  : 'text-text-low hover:text-text-medium',
            )}
          >
            {active && (
              <motion.span
                // Dropping the id under reduced motion is what turns the slide
                // into a cut: without a shared layout the marker is simply
                // re-rendered in its new slot.
                layoutId={reduced ? undefined : layoutId}
                aria-hidden
                className={
                  isPill
                    ? 'absolute inset-0 rounded-md border border-primary/35 bg-primary/12'
                    : // Hung off the bottom of the 64 px bar, not of the button:
                      // the rule belongs to the edge of the chrome, which is why
                      // it clears the button's own padding.
                      'absolute inset-x-2 -bottom-[21px] h-[2px] bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]'
                }
                transition={{ type: 'spring', stiffness: 400, damping: isPill ? 32 : 34 }}
              />
            )}
            {isPill ? (
              <>
                {Icon && <Icon aria-hidden className="relative h-5 w-5" strokeWidth={2} />}
                <span className="label-mono relative text-[8px]">{itemLabel}</span>
              </>
            ) : (
              <>
                {index && (
                  <span className="label-mono text-[9px] text-primary/70 tabular-nums">
                    {index}
                  </span>
                )}
                <span className="font-display text-sm font-semibold tracking-tight">
                  {itemLabel}
                </span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}
