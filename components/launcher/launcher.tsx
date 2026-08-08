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
import { useNavShortcuts } from '@/hooks/use-nav-shortcuts'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useSeatOverride } from '@/hooks/use-seat-override'

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

  // The section numbers the bar prints (`01 HOME`, `02 GAMES`, …) become real
  // keys here (F6.7). It lives on the router rather than on the bar because the
  // shortcut belongs to the *surface*, not to a piece of chrome: the mobile bar
  // shows five of the sections and the avatar menu the rest, yet `4` has to
  // reach `04` from anywhere. Registered once per surface, so the guest set is
  // exactly the guest navigation.
  useNavShortcuts(surface)

  // `?seat=pause` — dev only, dropped from a production build. Here rather than
  // in the shell because the state it creates is "paused *with the launcher up*",
  // and this component is the first place in the tree where that is true
  // (`hooks/use-seat-override.ts`, C3.3).
  useSeatOverride()

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
