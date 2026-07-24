"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useStore } from "@/lib/store"
import { TopBar } from "@/components/launcher/top-bar"
import { MobileNav } from "@/components/launcher/mobile-nav"
import { HomeView } from "@/components/launcher/home-view"
import { GamesView } from "@/components/launcher/games-view"
import { ShopView } from "@/components/launcher/shop-view"
import { ProfileView } from "@/components/launcher/profile-view"
import { GameLaunchModal } from "@/components/launcher/game-launch-modal"
import { CartDrawer } from "@/components/launcher/cart-drawer"
import { SettingsModal } from "@/components/launcher/settings-modal"

export function Launcher() {
  const view = useStore((s) => s.view)

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      <div className="hairline-grid pointer-events-none fixed inset-0 -z-10 opacity-60" />
      <TopBar />

      <main className="flex-1 pb-24 sm:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {view === "home" && <HomeView />}
              {view === "games" && <GamesView />}
              {view === "shop" && <ShopView />}
              {view === "profile" && <ProfileView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileNav />

      <GameLaunchModal />
      <CartDrawer />
      <SettingsModal />
    </div>
  )
}
