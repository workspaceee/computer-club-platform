import type { ID, ISODateTime } from './common'

/** Who a notification is addressed to (`notifications.target`). */
export type NotificationTarget = 'user' | 'machine' | 'zone' | 'broadcast'

/** Severity, mapped to toast/banner styling by the UI. */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'critical'

/**
 * What a card can *do* besides being read (C2.5). A closed union, because the
 * panel renders one control set per kind: a new kind has to teach the card its
 * buttons instead of arriving as a row that promises an action and offers none.
 */
export type NotificationActionKind = 'party-invite' | 'rate-order'

/** How an action ended. `rated` only ever belongs to `rate-order`. */
export type NotificationActionOutcome = 'accepted' | 'declined' | 'rated'

export interface NotificationAction {
  kind: NotificationActionKind
  /** Party id for `party-invite`, order id for `rate-order`. */
  refId: ID
  /**
   * `null` while the card still asks. Written by
   * `POST /api/notifications/:id/action`, so the answer lives where the party
   * membership does and a reopened panel cannot forget it.
   */
  outcome: NotificationActionOutcome | null
  /** 1–5 once a `rate-order` card has been answered, `null` otherwise. */
  rating: number | null
}

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
  /** `null` for news the player can only read (C2.5). */
  action: NotificationAction | null
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
