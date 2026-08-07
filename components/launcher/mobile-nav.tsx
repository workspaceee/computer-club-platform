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
    //
    // The bottom padding is the design's 3 *plus* the device's own bottom inset
    // (C2.9): pinned to `bottom-0` under `viewportFit: 'cover'`, the bar would
    // otherwise sit under the iPhone home indicator on the Companion PWA — the
    // gesture area swallowing the taps meant for Profile and Shop. On a kiosk
    // display and in a browser tab the token resolves to `0px`, so this is the
    // same 12px there.
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 px-3 pb-[calc(0.75rem+var(--frame-inset-bottom))] sm:hidden',
        overlayZ.frame,
      )}
    >
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
