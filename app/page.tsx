"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useStore } from "@/lib/store"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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
            <Launcher />
          </motion.div>
        )}
      </AnimatePresence>

      <SessionManager />
      <Toaster />
    </>
  )
}
