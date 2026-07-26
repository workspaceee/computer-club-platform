'use client'

import { cn } from '@/lib/utils'

/**
 * Chrome for the /_dev/kit showcase (F1.22).
 *
 * Deliberately plain: the page must not introduce styling of its own, otherwise
 * it stops being an honest mirror of the primitives it displays.
 */

interface SpecProps {
  /** Plan item id, e.g. "F1.10". */
  id: string
  /** Primitive name / file. */
  name: string
  /** One-line purpose. */
  note?: string
  children: React.ReactNode
}

export function Spec({ id, name, note, children }: SpecProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label-mono text-[10px] tabular-nums text-primary">{id}</span>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-text-high">
          {name}
        </h2>
        {note && <p className="text-sm text-text-medium">{note}</p>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

/** A labelled row of states for one primitive. */
export function Row({
  label,
  children,
  stack = false,
  className,
}: {
  label: string
  children: React.ReactNode
  /** Lay children out vertically instead of wrapping horizontally. */
  stack?: boolean
  className?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="label-mono text-[10px] text-text-low">{label}</p>
      <div
        className={cn(
          'rounded-lg border border-border bg-surface/40 p-4',
          stack ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-3',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Fixed-width column grid for tiles/cards. */
export function Grid({
  children,
  cols = 3,
}: {
  children: React.ReactNode
  cols?: 2 | 3 | 4
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 2 && 'sm:grid-cols-2',
        cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {children}
    </div>
  )
}
