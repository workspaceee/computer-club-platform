'use client'

import { NavRail } from '@/components/ui/nav-rail'
import { useT } from '@/lib/i18n/provider'
import { navFor, type LauncherSurface, type LauncherView } from '@/lib/launcher-nav'
import { overlayZ } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Bottom bar for narrow screens (F6.2).
 *
 * Reads the same navigation table as the top bar and only shows the sections
 * flagged `mobile`, so the thumb-reachable bar stays at five slots while the
 * full set stays available on desktop. Same rail primitive as the desktop bar
 * too (C2.1) — only the marker differs, a pill behind the glyph instead of a
 * rule under the word.
 */
export function MobileNav({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t } = useT()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  const items = navFor(surface)
    .filter((item) => item.mobile)
    .map(({ id, index, labelKey, icon }) => ({ id, index, label: t(labelKey), icon }))

  return (
    // Same `frame` rung as the top bar — they are one piece of chrome, and any
    // overlay is allowed to cover both (F6.4). The positioning stays on a plain
    // wrapper so the rail itself keeps carrying the landmark.
    <div className={cn('fixed inset-x-0 bottom-0 px-3 pb-3 sm:hidden', overlayZ.frame)}>
      <NavRail<LauncherView>
        items={items}
        value={view}
        onChange={setView}
        variant="pill"
        label={t('nav.landmark')}
        className="glass-strong mx-auto max-w-sm rounded-lg p-1"
      />
    </div>
  )
}
