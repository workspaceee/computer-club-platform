import type { Cents, ID, ISODateTime } from './common'

/**
 * `bookings.status`. The club runs free seating, so a booking is a soft hold:
 * `no-show` releases the seat automatically after the grace period (MVP §5.9).
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked-in'
  | 'cancelled'
  | 'no-show'
  | 'completed'

export interface Booking {
  id: ID
  userId: ID
  /** A booking may hold a specific seat or just a zone. */
  machineId: ID | null
  zoneId: ID
  startsAt: ISODateTime
  endsAt: ISODateTime
  status: BookingStatus
  prepaidCents: Cents
  createdAt: ISODateTime
}

/** One bookable window returned by the availability lookup. */
export interface BookingSlot {
  zoneId: ID
  startsAt: ISODateTime
  endsAt: ISODateTime
  seatsFree: number
  priceCents: Cents
}
