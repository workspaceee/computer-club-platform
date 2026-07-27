'use client'

/**
 * The crash screen (F6.5) — what a player sees when the shell throws.
 *
 * Hard constraints that shape every decision in this file:
 *
 * 1. **It must never throw.** It renders on the failure path, so it may not
 *    depend on anything that could be the thing that just broke: no store, no
 *    `useApi`, no realtime, no `useT()` (which throws without its provider).
 *    Translations come from `useMaybeT()` with a `translate()` fallback, and the
 *    language is read straight off localStorage in an effect.
 * 2. **No framer-motion, no next/image, no icons beyond `lucide-react`.**
 *    `app/global-error.tsx` renders without the root layout, so heavy client
 *    machinery is a liability. The brand mark is a plain `<img>` for the same
 *    reason — `next/image` needs an intact app runtime.
 * 3. **Two recoveries, in escalating order.** `reset()` re-renders the tree
 *    (cheap, keeps state); a full reload is the escape hatch. On a kiosk there
 *    is no address bar and no visible F5, so both must be buttons.
 * 4. **Reassurance before diagnostics.** The guest paid for minutes. The first
 *    thing they read is that the clock is server-side and still running; the
 *    fault code sits last, small, for the admin.
 */

import { AlertTriangle, Clock, LifeBuoy, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useMaybeT } from '@/lib/i18n/provider'
import { readSessionLang, translate } from '@/lib/i18n/translate'
import { DEFAULT_LANG, type Lang, type TKey, type TVars } from '@/lib/i18n/types'

export interface CrashScreenProps {
  /**
   * Re-render the subtree that failed. React's own `reset` from an error
   * boundary; omitted when the caller has no way to recover in place.
   */
  onRetry?: () => void
  /**
   * Short identifier the guest can read out to the admin. Next.js supplies
   * `error.digest` in production, where messages are stripped.
   */
  reference?: string
  /**
   * Raw message. Rendered **only** outside production, and even then folded
   * inside a collapsed `<details>` — a stack trace is never club-facing copy.
   */
  detail?: string
  /**
   * `page` fills the viewport and offers a reload (whole shell is gone).
   * `section` sits inside a working frame and only offers a retry.
   */
  variant?: 'page' | 'section'
}

/**
 * Language for the crash screen.
 *
 * Starts at `DEFAULT_LANG` so the server render and the first client paint
 * agree, then upgrades to the session language in an effect. A guest who set
 * the station to Lithuanian should not be dropped into English at the worst
 * possible moment.
 */
function useCrashLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  useEffect(() => {
    setLang(readSessionLang())
  }, [])
  return lang
}

/**
 * Translation that works with or without `<I18nProvider>` above it. Live context
 * wins (it knows the profile language); otherwise the pure core is used.
 */
function useCrashT(): (key: TKey, vars?: TVars) => string {
  const ctx = useMaybeT()
  const lang = useCrashLang()
  return ctx ? ctx.t : (key, vars) => translate(lang, key, vars)
}

export function CrashScreen({
  onRetry,
  reference,
  detail,
  variant = 'page',
}: CrashScreenProps) {
  const t = useCrashT()
  const isPage = variant === 'page'
  // F7.5: the mark is the one image in the product outside `AssetImage`, so it
  // needs its own removal. A crash screen showing the browser's torn-page glyph
  // is the worst possible place to be caught with a broken asset.
  const [markBroken, setMarkBroken] = useState(false)

  // Section failures keep the surrounding shell, so they get the smaller,
  // non-alarming copy — the clock and navigation above them still work.
  const title = isPage ? t('crash.title') : t('crash.sectionTitle')
  const body = isPage ? t('crash.body') : t('crash.sectionBody')

  const card = (
    <div
      role="alert"
      aria-live="assertive"
      className={
        isPage
          ? 'glass-strong tick-corners relative w-full max-w-xl rounded-xl px-6 py-8 sm:px-10 sm:py-10'
          : 'glass relative w-full rounded-lg border-danger/25 px-5 py-8 sm:px-8'
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger"
        >
          <AlertTriangle size={24} />
        </span>

        <div className="flex flex-col items-center gap-2">
          <span className="label-mono text-[10px] text-primary">{t('crash.eyebrow')}</span>
          <h1
            className={
              isPage
                ? 'font-display text-2xl font-bold uppercase tracking-tight text-text-high text-balance sm:text-3xl'
                : 'font-display text-base font-bold uppercase tracking-tight text-text-high text-balance'
            }
          >
            {title}
            {isPage && (
              <>
                {' '}
                <span className="text-primary text-glow">{t('crash.titleAccent')}</span>
              </>
            )}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-text-medium text-pretty">{body}</p>
        </div>

        {/* The money-and-minutes promise. Only on the full-page crash: inside a
            working shell the live clock already makes the point. */}
        {isPage && (
          <p className="flex max-w-md items-start gap-2.5 rounded-md border border-success/20 bg-success/5 px-4 py-3 text-left text-xs leading-relaxed text-text-medium">
            <Clock size={16} className="mt-px shrink-0 text-success" aria-hidden />
            {t('crash.timeSafe')}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button
              variant={isPage ? 'primary' : 'secondary'}
              size={isPage ? 'lg' : 'sm'}
              cut={isPage}
              onClick={onRetry}
              iconLeft={<RotateCcw aria-hidden />}
            >
              {t('crash.retry')}
            </Button>
          )}
          {isPage && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.location.reload()}
              iconLeft={<LifeBuoy aria-hidden />}
            >
              {t('crash.reload')}
            </Button>
          )}
        </div>

        {isPage && (
          <p className="max-w-md text-xs leading-relaxed text-text-low text-pretty">
            {t('crash.callStaff')}
          </p>
        )}

        {reference && (
          <p className="label-mono text-[9px] break-all text-text-low">
            {t('crash.reference')} · {reference}
          </p>
        )}

        {/* Stack traces are for the developer console, not the club floor —
            visible in development only, and collapsed even there. */}
        {detail && process.env.NODE_ENV !== 'production' && (
          <details className="w-full text-left">
            <summary className="label-mono cursor-pointer text-[9px] text-text-low">
              {t('crash.details')}
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-sm border border-border bg-panel p-3 text-[11px] whitespace-pre-wrap text-text-medium">
              {detail}
            </pre>
          </details>
        )}
      </div>
    </div>
  )

  if (!isPage) return card

  return (
    <div className="app-ambient flex min-h-svh flex-col items-center justify-center overflow-y-auto px-4 py-10">
      <div className="hairline-grid pointer-events-none fixed inset-0 -z-10 opacity-60" />

      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        {/* Plain <img>: `next/image` depends on an app runtime that may be the
            thing that just failed. Decorative — the heading carries the meaning,
            so on failure it is removed outright rather than replaced by the
            fallback plate: a dark rectangle where a logo belongs reads as a
            second, unrelated breakage. The layout is `gap`-driven, so the card
            below simply moves up. */}
        {!markBroken && (
          <img
            src="/imba-mark.webp"
            alt=""
            aria-hidden
            width={60}
            height={72}
            onError={() => setMarkBroken(true)}
            className="h-[72px] w-auto opacity-90 drop-shadow-[0_0_14px_rgba(229,53,43,0.4)]"
          />
        )}
        {card}
      </div>
    </div>
  )
}
