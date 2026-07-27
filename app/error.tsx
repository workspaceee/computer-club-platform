'use client'

/**
 * Route-segment error boundary (F6.5).
 *
 * `components/error-boundary.tsx` catches throws *inside* the shell. This file
 * catches the ones it cannot: an error thrown by the page component itself, by
 * `layout.tsx`'s children slot, or during a navigation — cases where React has
 * already discarded the tree that held our boundary.
 *
 * The root layout survives here, so `<I18nProvider>` is still mounted and the
 * crash screen gets real translations. `global-error.tsx` handles the harder
 * case where even the layout is gone.
 */

import { useEffect } from 'react'
import { CrashScreen } from '@/components/crash-screen'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log('[v0] route error:', error.message, error.digest)
  }, [error])

  return (
    <CrashScreen
      variant="page"
      onRetry={reset}
      reference={error.digest}
      detail={error.stack ?? error.message}
    />
  )
}
