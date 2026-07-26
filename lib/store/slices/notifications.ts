import type { Notification } from '@/lib/types/notification'

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

/** The inbox is a rolling window, not an archive: the server owns history. */
export const MAX_NOTIFICATIONS = 50

export interface NotificationsSlice {
  /** Transient stack rendered by `components/toaster.tsx`. */
  toasts: Toast[]
  /** Persistent inbox, newest first. Fed by realtime events, read by the bell. */
  notifications: Notification[]

  toast: (kind: ToastKind, message: string, options?: ToastOptions) => void
  dismissToast: (id: string) => void
  clearToasts: () => void

  pushNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
}

export const notificationsInitialState = {
  toasts: [],
  notifications: [],
} satisfies Pick<NotificationsSlice, 'toasts' | 'notifications'>

export const createNotificationsSlice: SliceCreator<NotificationsSlice> = (set) => ({
  ...notificationsInitialState,

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

  // Newest first, de-duplicated by id so a redelivered event cannot double up.
  pushNotification: (notification) =>
    set((s) => ({
      notifications: [
        notification,
        ...s.notifications.filter((n) => n.id !== notification.id),
      ].slice(0, MAX_NOTIFICATIONS),
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    })),

  markAllNotificationsRead: () =>
    set((s) => {
      const readAt = new Date().toISOString()
      return {
        notifications: s.notifications.map((n) => (n.readAt ? n : { ...n, readAt })),
      }
    }),

  clearNotifications: () => set({ notifications: [] }),
})

export const unreadCount = (notifications: Notification[]) =>
  notifications.reduce((sum, n) => (n.readAt ? sum : sum + 1), 0)
