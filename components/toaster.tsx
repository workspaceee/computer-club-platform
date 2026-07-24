'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Toast } from '@/lib/store'

const CONFIG = {
  success: { icon: CheckCircle2, color: 'var(--success)' },
  error: { icon: XCircle, color: 'var(--danger)' },
  info: { icon: Info, color: 'var(--steel)' },
} as const

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast)
  const { icon: Icon, color } = CONFIG[toast.kind]

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 3500)
    return () => clearTimeout(t)
  }, [toast.id, dismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-border bg-surface-2/95 px-4 py-3 shadow-lg backdrop-blur"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <Icon size={18} style={{ color }} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm text-text-high">{toast.message}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-text-low transition-colors hover:text-text-high"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
