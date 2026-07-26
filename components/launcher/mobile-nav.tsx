'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n/provider'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { navFor, type LauncherSurface } from '@/lib/launcher-nav'
import { cn } from '@/lib/utils'

/**
 * Bottom bar for narrow screens (F6.2).
 *
 * Reads the same navigation table as the top bar and only shows the sections
 * flagged `mobile`, so the thumb-reachable bar stays at five slots while the
 * full set stays available on desktop.
 */
export function MobileNav({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t } = useT()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const reduceMotion = useReducedMotion()

  const items = navFor(surface).filter((item) => item.mobile)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:hidden"
      aria-label={t('nav.landmark')}
    >
      <div className="glass-strong mx-auto flex max-w-sm items-center justify-around rounded-lg p-1">
        {items.map(({ id, labelKey, icon: Icon }) => {
          const active = view === id
          const label = t(labelKey)
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 rounded-md py-2.5 text-[10px] font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                active ? 'text-primary' : 'text-text-low',
              )}
            >
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : 'mobile-nav-pill'}
                  className="absolute inset-0 rounded-md border border-primary/35 bg-primary/12"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-5 w-5" strokeWidth={2} />
              <span className="label-mono relative text-[8px]">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
