/**
 * Primitives shared by every domain (F3.1).
 *
 * These aliases exist so the intent of a field is readable at the call site:
 * `Cents` can never be silently mixed with `Coins`, and `ISODateTime` makes it
 * obvious that the server sends strings, not `Date` objects.
 */

/** Opaque server identifier. Always a string, never a number. */
export type ID = string

/** ISO-8601 timestamp as delivered by the API, e.g. `2026-07-26T03:52:00Z`. */
export type ISODateTime = string

/** ISO-8601 calendar date without a time part, e.g. `2026-07-26`. */
export type ISODate = string

/** Money is always integer EUR cents — never a float (MVP §9.4 invariants). */
export type Cents = number

/** Loyalty currency. Integer, no fractions. */
export type Coins = number

/** Whole seconds. Used for session time, never fractional. */
export type Seconds = number

/** Whole minutes. Used for pass balances, never fractional. */
export type Minutes = number

/** Only EUR is supported by the club today, but the field stays explicit. */
export type Currency = 'EUR'

/** Uniform list envelope for endpoints that may paginate later. */
export interface Page<T> {
  items: T[]
  total: number
  /** Cursor for the next page, `null` when the list is exhausted. */
  nextCursor: string | null
}

/**
 * How a mutation was paid for. Shared by passes, orders and tab settlement so
 * the payment picker can be one component across the whole product.
 */
export type PaymentMethod = 'wallet' | 'tab' | 'cash' | 'card' | 'staff'
