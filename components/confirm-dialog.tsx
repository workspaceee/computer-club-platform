'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="tick-corners w-full max-w-sm rounded-xl border border-border-strong bg-surface-2 p-6"
          >
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-text-high">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-medium">{message}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-md py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-all"
                style={{
                  background: danger ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
