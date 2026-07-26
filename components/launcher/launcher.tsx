'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { navItem, resolveView, type LauncherSurface } from '@/lib/launcher-nav'
import { TopBar } from '@/components/launcher/top-bar'
import { MobileNav } from '@/components/launcher/mobile-nav'
import { HomeView } from '@/components/launcher/home-view'
import { GamesView } from '@/components/launcher/games-view'
import { ShopView } from '@/components/launcher/shop-view'
import { ProfileView } from '@/components/launcher/profile-view'
import { PendingView } from '@/components/launcher/pending-view'
import { GameLaunchModal } from '@/components/launcher/game-launch-modal'
import { CartDrawer } from '@/components/launcher/cart-drawer'
import { SettingsModal } from '@/components/launcher/settings-modal'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

/**
 * The launcher shell (F6.2 / F6.4).
 *
 * Both signed-in members and PostPaid guests render through here — the surface
 * only changes which sections the navigation offers, so there is no second copy
 * of the frame to keep in sync.
 */
export function Launcher({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const view = useStore((s) => s.view)
  const reduceMotion = useReducedMotion()

  // A guest arriving on a member-only section is folded back to home rather
  // than shown an empty frame.
  const active = resolveView(surface, view)
  const pendingTask = navItem(active).pendingTask

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      <div className="hairline-grid pointer-events-none fixed inset-0 -z-10 opacity-60" />
      <TopBar surface={surface} />

      <main className="flex-1 pb-24 sm:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              {pendingTask ? (
                <PendingView view={active} />
              ) : (
                <>
                  {active === 'home' && <HomeView />}
                  {active === 'games' && <GamesView />}
                  {active === 'shop' && <ShopView />}
                  {active === 'profile' && <ProfileView />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileNav surface={surface} />

      <GameLaunchModal />
      <CartDrawer />
      <SettingsModal />
    </div>
  )
}
