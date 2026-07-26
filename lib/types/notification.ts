import type { ID, ISODateTime } from './common'

/** Who a notification is addressed to (`notifications.target`). */
export type NotificationTarget = 'user' | 'machine' | 'zone' | 'broadcast'

/** Severity, mapped to toast/banner styling by the UI. */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'critical'

export interface Notification {
  id: ID
  target: NotificationTarget
  /** `null` for broadcasts, which have no specific addressee. */
  targetId: ID | null
  level: NotificationLevel
  title: string
  body: string
  createdAt: ISODateTime
  readAt: ISODateTime | null
}

/** `tickets.category` — chosen by the player when opening a help thread. */
export type HelpCategory =
  | 'hardware'
  | 'network'
  | 'game'
  | 'payment'
  | 'order'
  | 'other'

export type HelpThreadStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed'

/** `tickets` — a conversation between one guest and the staff. */
export interface HelpThread {
  id: ID
  userId: ID | null
  guestId: ID | null
  machineId: ID
  category: HelpCategory
  subject: string
  status: HelpThreadStatus
  messages: HelpMessage[]
  staffId: ID | null
  /** 1–5 stars, set by the player after resolution. */
  rating: number | null
  createdAt: ISODateTime
}

export interface HelpMessage {
  id: ID
  threadId: ID
  author: 'user' | 'staff'
  text: string
  createdAt: ISODateTime
}
