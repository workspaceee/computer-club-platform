'use client'

/**
 * Last line of defence (F6.5) — the file that replaces the white Next.js screen.
 *
 * Next.js renders this when the **root layout itself** throws. That is a harsher
 * environment than `app/error.tsx`: the layout is discarded, so there is no
 * `<html>`, no `<body>`, no fonts and no `<I18nProvider>`. This component must
 * supply the document shell on its own, and everything it renders must survive
 * without app context — which is exactly what `CrashScreen` is built for
 * (it falls back to `useMaybeT()` + `translate()`).
 *
 * `globals.css` is imported here explicitly: the stylesheet normally arrives
 * through the root layout, and without it the crash screen would be unstyled
 * HTML — the very failure mode this task exists to remove.
 */

import { useEffect } from 'react'
import { CrashScreen } from '@/components/crash-screen'
import './globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log('[v0] global error:', error.message, error.digest)
  }, [error])

  return (
    // `lang` is hardcoded: the profile is unreachable at this point, and
    // CrashScreen still localises its copy from the stored device preference.
    <html lang="en" className="bg-background">
      <body className="antialiased bg-background text-foreground">
        <CrashScreen
          variant="page"
          onRetry={reset}
          reference={error.digest}
          detail={error.stack ?? error.message}
        />
      </body>
    </html>
  )
}
