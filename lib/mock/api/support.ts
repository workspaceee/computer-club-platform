// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/notifications/*` and `/api/help/*`. The inbox is addressed the way the
// real one is — to a member, a seat, a zone or everyone — so the UI never has to
// know how targeting works, and staff replies arrive as new messages on a thread
// rather than as a second data shape.
import { ApiError, mutate, newId, query, required } from '@/lib/mock/api/client'
import { db, getInbox } from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'
import type {
  HelpCategory,
  HelpMessage,
  HelpThread,
  HelpThreadStatus,
  Notification,
} from '@/lib/types/notification'

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

/** `GET /api/notifications` — everything addressed to this member and seat. */
export function fetchNotifications(
  userId: ID = db.currentUserId,
  machineId: ID = db.currentMachineId,
): Promise<Notification[]> {
  return query('support.fetchNotifications', () => getInbox(userId, machineId))
}

/** `GET /api/notifications/unread` — the badge count. */
export function fetchUnreadCount(
  userId: ID = db.currentUserId,
  machineId: ID = db.currentMachineId,
): Promise<number> {
  return query(
    'support.fetchUnreadCount',
    () => getInbox(userId, machineId).filter((n) => n.readAt === null).length,
  )
}

/** `POST /api/notifications/:id/read` */
export function markNotificationRead(notificationId: ID): Promise<Notification> {
  return mutate('support.markNotificationRead', () => {
    const notification = required(db.notifications.find((n) => n.id === notificationId))
    notification.readAt ??= db.now
    return notification
  })
}

/** `POST /api/notifications/read-all` — returns how many were still unread. */
export function markAllNotificationsRead(
  userId: ID = db.currentUserId,
  machineId: ID = db.currentMachineId,
): Promise<number> {
  return mutate('support.markAllNotificationsRead', () => {
    const unread = getInbox(userId, machineId).filter((n) => n.readAt === null)
    for (const notification of unread) notification.readAt = db.now
    return unread.length
  })
}

/* ------------------------------------------------------------------ *
 * Help threads
 * ------------------------------------------------------------------ */

/** Threads still needing someone's attention. */
const OPEN_STATUSES: HelpThreadStatus[] = ['open', 'in-progress', 'waiting']

/** `GET /api/help/threads` — the member's tickets, newest first. */
export function fetchHelpThreads(userId: ID = db.currentUserId): Promise<HelpThread[]> {
  return query('support.fetchHelpThreads', () =>
    db.helpThreads
      .filter((t) => t.userId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  )
}

/** `GET /api/help/threads/open` — drives the "staff is on the way" banner. */
export function fetchOpenHelpThread(userId: ID = db.currentUserId): Promise<HelpThread | null> {
  return query(
    'support.fetchOpenHelpThread',
    () => db.helpThreads.find((t) => t.userId === userId && OPEN_STATUSES.includes(t.status)) ?? null,
  )
}

/** `GET /api/help/threads/:id` */
export function fetchHelpThread(threadId: ID): Promise<HelpThread> {
  return query('support.fetchHelpThread', () =>
    required(db.helpThreads.find((t) => t.id === threadId)),
  )
}

export interface CreateHelpThreadPayload {
  category: HelpCategory
  subject: string
  message: string
  machineId?: ID
}

/**
 * `POST /api/help/threads`. One open ticket per member: a second call returns
 * `conflict` instead of flooding the counter with duplicates.
 */
export function createHelpThread(
  payload: CreateHelpThreadPayload,
  userId: ID = db.currentUserId,
): Promise<HelpThread> {
  return mutate('support.createHelpThread', () => {
    const subject = payload.subject.trim()
    const body = payload.message.trim()
    if (subject.length < 3) throw new ApiError('validation', { subject: 'validation' })
    if (body.length < 3) throw new ApiError('validation', { message: 'validation' })
    if (db.helpThreads.some((t) => t.userId === userId && OPEN_STATUSES.includes(t.status))) {
      throw new ApiError('conflict')
    }

    const threadId = newId('help')
    const thread: HelpThread = {
      id: threadId,
      userId,
      guestId: null,
      machineId: payload.machineId ?? db.currentMachineId,
      category: payload.category,
      subject,
      status: 'open',
      messages: [
        {
          id: newId('msg'),
          threadId,
          author: 'user',
          text: body,
          createdAt: db.now,
        },
      ],
      staffId: null,
      rating: null,
      createdAt: db.now,
    }
    db.helpThreads.unshift(thread)
    return thread
  })
}

/** `POST /api/help/threads/:id/messages` — replying reopens a waiting thread. */
export function postHelpMessage(threadId: ID, text: string): Promise<HelpMessage> {
  return mutate('support.postHelpMessage', () => {
    const thread = required(db.helpThreads.find((t) => t.id === threadId))
    if (thread.status === 'closed') throw new ApiError('conflict')

    const body = text.trim()
    if (body.length === 0) throw new ApiError('validation', { text: 'validation' })

    const message: HelpMessage = {
      id: newId('msg'),
      threadId,
      author: 'user',
      text: body,
      createdAt: db.now,
    }
    thread.messages.push(message)
    if (thread.status === 'waiting') thread.status = 'in-progress'
    return message
  })
}

/** `POST /api/help/threads/:id/resolve` — the member closing their own ticket. */
export function resolveHelpThread(threadId: ID): Promise<HelpThread> {
  return mutate('support.resolveHelpThread', () => {
    const thread = required(db.helpThreads.find((t) => t.id === threadId))
    if (!OPEN_STATUSES.includes(thread.status)) throw new ApiError('conflict')
    thread.status = 'resolved'
    return thread
  })
}

/** `POST /api/help/threads/:id/rate` — 1–5, only once a thread is resolved. */
export function rateHelpThread(threadId: ID, rating: number): Promise<HelpThread> {
  return mutate('support.rateHelpThread', () => {
    const thread = required(db.helpThreads.find((t) => t.id === threadId))
    if (thread.status !== 'resolved' && thread.status !== 'closed') throw new ApiError('conflict')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ApiError('validation', { rating: 'validation' })
    }
    thread.rating = rating
    thread.status = 'closed'
    return thread
  })
}

export interface CallStaffPayload {
  category?: HelpCategory
  note?: string
}

/**
 * `POST /api/help/call-staff` — the one-tap button on the lock screen. It is a
 * help thread underneath, so the counter sees a single queue.
 */
export function callStaff(
  payload: CallStaffPayload = {},
  userId: ID = db.currentUserId,
): Promise<HelpThread> {
  return mutate('support.callStaff', () => {
    const existing = db.helpThreads.find(
      (t) => t.userId === userId && OPEN_STATUSES.includes(t.status),
    )
    if (existing) return existing

    const threadId = newId('help')
    const thread: HelpThread = {
      id: threadId,
      userId,
      guestId: null,
      machineId: db.currentMachineId,
      category: payload.category ?? 'other',
      subject: 'Staff called from seat',
      status: 'open',
      messages: [
        {
          id: newId('msg'),
          threadId,
          author: 'user',
          text: payload.note?.trim() || 'Assistance requested',
          createdAt: db.now,
        },
      ],
      staffId: null,
      rating: null,
      createdAt: db.now,
    }
    db.helpThreads.unshift(thread)
    return thread
  })
}
