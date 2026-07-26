'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { navItem, resolveView, type LauncherSurface } from '@/lib/launcher-nav'
import { AppShell } from '@/components/app-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { HomeView } from '@/components/launcher/home-view'
import { GamesView } from '@/components/launcher/games-view'
import { ShopView } from '@/components/launcher/shop-view'
import { ProfileView } from '@/components/launcher/profile-view'
import { PendingView } from '@/components/launcher/pending-view'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

/**
 * Section router of the launcher (F6.2).
 *
 * The frame — background, bars, content column — is `AppShell` (F6.4), and the
 * global overlays are mounted next to the screens, not here. What is left in
 * this file is the one thing it should own: which section is open and what
 * happens when that section fails.
 *
 * Both signed-in members and PostPaid guests render through here; the surface
 * only changes which sections the navigation offers.
 */
export function Launcher({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const view = useStore((s) => s.view)
  const reduceMotion = useReducedMotion()

  // A guest arriving on a member-only section is folded back to home rather
  // than shown an empty frame.
  const active = resolveView(surface, view)
  const pendingTask = navItem(active).pendingTask

  return (
    <AppShell surface={surface}>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Section-level boundary (F6.5). A render fault in one view must not
              cost the player the session clock, the lock button and the
              navigation they need to get out — so the frame outside this
              boundary stays mounted and only the content becomes a card.
              `resetKey={active}` means switching sections clears the fault
              without any explicit retry. */}
          <ErrorBoundary variant="section" resetKey={active}>
            {pendingTask ? (
              <PendingView view={active} />
            ) : (
              <>
                {active === 'home' && <HomeView surface={surface} />}
                {active === 'games' && <GamesView />}
                {active === 'shop' && <ShopView />}
                {active === 'profile' && <ProfileView />}
              </>
            )}
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
