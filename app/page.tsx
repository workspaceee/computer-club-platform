"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useStore } from "@/lib/store"
import { surfaceOf } from "@/lib/launcher-nav"
import { LockScreen } from "@/components/lock-screen"
import { Launcher } from "@/components/launcher/launcher"
import { SessionManager } from "@/components/session-manager"
import { Toaster } from "@/components/toaster"

export default function Page() {
  const screen = useStore((s) => s.screen)

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === "lock" ? (
          <motion.div
            key="lock"
            initial={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              filter: { duration: 0.55 },
            }}
            style={{ willChange: "opacity, transform, filter" }}
          >
            <LockScreen />
          </motion.div>
        ) : (
          <motion.div
            key="launcher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Members and PostPaid guests share one shell; the surface only
                decides which sections the navigation offers (F6.2). */}
            <Launcher surface={surfaceOf(screen)} />
          </motion.div>
        )}
      </AnimatePresence>

      <SessionManager />
      <Toaster />
    </>
  )
}
