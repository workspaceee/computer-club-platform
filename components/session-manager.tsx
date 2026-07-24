'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { TimerOff } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export function SessionManager() {
  const tick = useStore((s) => s.tick)
  const sessionExpired = useStore((s) => s.sessionExpired)
  const clearExpired = useStore((s) => s.clearExpired)

  useEffect(() => {
    const t = setInterval(() => tick(), 1000)
    return () => clearInterval(t)
  }, [tick])

  useEffect(() => {
    if (!sessionExpired) return
    const t = setTimeout(() => clearExpired(), 3000)
    return () => clearTimeout(t)
  }, [sessionExpired, clearExpired])

  return (
    <AnimatePresence>
      {sessionExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-black/85 backdrop-blur"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
          >
            <TimerOff size={40} className="text-primary" />
          </motion.div>
          <h2 className="font-display text-3xl font-black uppercase text-text-high">
            Session Expired
          </h2>
          <p className="text-text-medium">Returning to lock screen...</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
