/**
 * `notifications` slice (F6.1) — the toast queue (F1.20).
 */
import type { SliceCreator } from '../types'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  /** Optional emphasised line above the message. */
  title?: string
  /** Auto-dismiss delay in ms. `0` keeps it up until dismissed manually. */
  duration?: number
}

export interface ToastOptions {
  title?: string
  duration?: number
}

/** Never stack more than this — the oldest toast is dropped (F1.20). */
export const MAX_TOASTS = 3

export interface NotificationsSlice {
  toasts: Toast[]
  toast: (kind: ToastKind, message: string, options?: ToastOptions) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
}

export const createNotificationsSlice: SliceCreator<NotificationsSlice> = (set) => ({
  toasts: [],

  toast: (kind, message, options) =>
    set((s) => {
      const next: Toast = {
        id: crypto.randomUUID(),
        kind,
        message,
        title: options?.title,
        duration: options?.duration,
      }
      // Cap the queue at MAX_TOASTS by evicting the oldest entries.
      return { toasts: [...s.toasts, next].slice(-MAX_TOASTS) }
    }),

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
})
