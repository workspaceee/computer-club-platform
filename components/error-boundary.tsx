'use client'

/**
 * The one ErrorBoundary of the product (F6.5).
 *
 * Two failure classes, two different answers:
 *
 * - **Data failure** — a request rejected. Already solved: `useApi` catches it,
 *   `DataBoundary` renders `ErrorState` with retry. Nothing here is involved.
 * - **Render failure** — a component threw while drawing. React unmounts the
 *   whole subtree, and without a boundary that means the entire client tree is
 *   discarded. On a kiosk there is no address bar to type into, so the player is
 *   left staring at a blank screen with no way out. This file is what stands
 *   between that and a product-styled recovery surface.
 *
 * Placement (see `components/launcher/launcher.tsx` and `app/page.tsx`):
 *
 *   page-level boundary   → the shell died: full-screen crash + reload
 *     └ view-level boundary → one section died: inline card, frame stays alive
 *
 * The nested one matters more than it looks: a throw in `ShopView` should not
 * take away the session clock, the lock button and the navigation the player
 * needs to get out. React always delegates to the *closest* boundary, so the
 * inner one absorbs section faults before the outer one ever sees them.
 *
 * Must stay a class component — `componentDidCatch` has no hook equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CrashScreen } from '@/components/crash-screen'

interface ErrorBoundaryProps {
  children: ReactNode
  /** `page` = full-screen crash, `section` = inline card inside a live shell. */
  variant?: 'page' | 'section'
  /**
   * Changing this value clears the error automatically. The launcher passes the
   * active view, so navigating away from a broken section recovers it without
   * the player having to press anything.
   */
  resetKey?: string | number
  /** Replaces the crash screen entirely, for callers that need custom copy. */
  fallback?: (state: { error: Error; reset: () => void }) => ReactNode
  /** Escape hatch for a future logger (Stage 4 sends this to the server). */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
  /** Bumped by `reset()` so the remounted subtree gets fresh component state. */
  attempt: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // TRUST: сервер обязан пересчитать (Этап 4) — a crash mid-checkout must be
    // reported so the backend can reconcile a half-written order. For now the
    // fault only reaches the console; the reporting call lands with F4 logging.
    console.log('[v0] ErrorBoundary caught:', error.message, info.componentStack)
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    // Navigating to another section clears a section-level fault by itself.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  /**
   * Drops the error and forces a fresh mount of the subtree.
   *
   * Clearing `error` alone would remount the children with their old keys, and a
   * component that threw out of bad local state would immediately throw again.
   * Bumping `attempt` guarantees genuinely new instances.
   */
  private reset = (): void => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))
  }

  render(): ReactNode {
    const { error, attempt } = this.state
    const { children, variant = 'page', fallback } = this.props

    if (error) {
      if (fallback) return fallback({ error, reset: this.reset })
      return (
        <CrashScreen
          variant={variant}
          onRetry={this.reset}
          reference={digestOf(error)}
          detail={error.stack ?? error.message}
        />
      )
    }

    return <div key={attempt} className="contents">{children}</div>
  }
}

/**
 * A short code the guest can read out loud.
 *
 * Next.js attaches `digest` to errors it has already logged server-side; that is
 * the value an admin can actually correlate, so it wins. Otherwise the message
 * is hashed into something pronounceable — never the raw message, which may
 * contain an email or an id.
 */
function digestOf(error: Error): string {
  const digest = (error as Error & { digest?: string }).digest
  if (digest) return digest

  let hash = 0
  const source = `${error.name}:${error.message}`
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0
  }
  return `SH-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}
