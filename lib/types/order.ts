import type { Cents, ID, ISODateTime, PaymentMethod } from './common'
import type { ShopItem } from './catalog'

/**
 * `orders.status` — the exact stages the player sees on the order tracker. The
 * client only renders what the server reports; it never advances a status
 * optimistically.
 */
export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

/** Ways to pay for a bar order. Cards are disabled until Stage 4. */
export type OrderPaymentMethod = Extract<PaymentMethod, 'wallet' | 'tab' | 'cash' | 'card'>

export interface Order {
  id: ID
  userId: ID | null
  guestId: ID | null
  sessionId: ID
  machineId: ID
  items: OrderItem[]
  totalCents: Cents
  paymentMethod: OrderPaymentMethod
  status: OrderStatus
  createdAt: ISODateTime
  /** Set when the kitchen gives an ETA; `null` while the order is still new. */
  etaMinutes: number | null
}

/**
 * Order lines snapshot the price at purchase time, so a later catalogue change
 * never rewrites history.
 */
export interface OrderItem {
  orderId: ID
  productId: ID
  name: string
  qty: number
  priceSnapshotCents: Cents
}

/** Client-side basket entry. Still built on the legacy `ShopItem` shape. */
export interface CartItem extends ShopItem {
  qty: number
}
