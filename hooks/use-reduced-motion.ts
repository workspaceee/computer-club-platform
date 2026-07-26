'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

/**
 * Single source of truth for "should we animate?".
 *
 * Combines the launcher setting ("Reduce animations", C5.11) with the OS-level
 * `prefers-reduced-motion` preference. Primitives use this to drop *decorative*
 * motion while keeping functional transitions (see docs/DESIGN.md §6).
 */
export function useReducedMotion(): boolean {
  const setting = useStore((s) => s.settings.reduceAnimations)
  const [system, setSystem] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystem(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystem(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return setting || system
}

/**
 * Mirrors the reduced-motion decision onto `<html data-reduce-motion>` so pure
 * CSS animations (neon ring, shimmer, marquee) can be damped too.
 */
export function useReducedMotionAttribute(): void {
  const reduced = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduced)
  }, [reduced])
}

/**
 * Convenience: returns `0` duration when motion is reduced, so callers can pass
 * `transition={{ duration: d(0.25) }}` without branching.
 */
export function useMotionDuration(): (seconds: number) => number {
  const reduced = useReducedMotion()
  return (seconds: number) => (reduced ? 0 : seconds)
}
