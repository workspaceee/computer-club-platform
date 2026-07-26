import type { Cents, Currency, ID, ISODateTime } from './common'

export type TabStatus = 'open' | 'settled' | 'void'

/** `tab_items.kind` — what the line represents. */
export type TabItemKind = 'time' | 'pass' | 'product' | 'adjustment'

/**
 * The running bill of one postpaid session. `totalCents` is recomputed server-
 * side from the items inside a transaction — the client never sums it itself
 * (MVP §9.4 invariants).
 */
export interface Tab {
  id: ID
  sessionId: ID
  status: TabStatus
  totalCents: Cents
  items: TabItem[]
  settledBy: ID | null
  settledAt: ISODateTime | null
}

export interface TabItem {
  id: ID
  tabId: ID
  kind: TabItemKind
  /** Points at the pass, product or session that produced the line. */
  refId: ID | null
  label: string
  qty: number
  priceCents: Cents
  note?: string
}

/**
 * `transactions.type` — every movement of money, coins or time gets one record.
 * Nothing in the product may change a balance without writing one.
 */
export type TransactionType =
  | 'topup'
  | 'spend_money'
  | 'spend_coins'
  | 'earn_coins'
  | 'time_grant'
  | 'time_spend'
  | 'tab_settle'
  | 'debt'

/**
 * Append-only ledger entry. Kept in the tab (billing) domain rather than in
 * `user.ts` because it describes a movement, not a person.
 */
export interface Transaction {
  id: ID
  userId: ID
  type: TransactionType
  /** Cents for money types, coins for coin types, seconds for time types. */
  amount: number
  currency: Currency
  refType: 'pass' | 'order' | 'tab' | 'session' | 'reward' | 'topup' | null
  refId: ID | null
  staffId: ID | null
  note?: string
  createdAt: ISODateTime
}
