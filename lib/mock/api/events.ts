// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/tournaments/*` and `/api/bookings/*`. Both are slot systems, so both
// enforce the same shape of rule server-side: capacity, timing windows and who
// has already paid. Countdowns are built from `startsAt` against the server
// clock (F3.7) — never from a client `Date.now()`.
import { ApiError, mutate, newId, query, required, serverTime } from '@/lib/mock/api/client'
import { db, getMachine, getPlayer } from '@/lib/mock/db'
import type { Booking, BookingSlot, BookingStatus } from '@/lib/types/booking'
import type { Cents, ID } from '@/lib/types/common'
import type { Tournament, TournamentEntry, TournamentStatus } from '@/lib/types/tournament'
import type { Transaction } from '@/lib/types/tab'
import type { Wallet } from '@/lib/types/user'

function recordTransaction(entry: Omit<Transaction, 'id' | 'currency' | 'createdAt'>): void {
  db.transactions.push({
    id: newId('tx'),
    currency: db.club.currency,
    createdAt: db.now,
    ...entry,
  })
}

const MINUTE_MS = 60_000

/* ------------------------------------------------------------------ *
 * Tournaments
 * ------------------------------------------------------------------ */

export interface TournamentSummary extends Tournament {
  gameName: string
  /** Minutes until start, negative once it has begun. Derived server-side. */
  startsInMinutes: number
  slotsFree: number
  /** Whether *this* member already holds an entry. */
  registered: boolean
  checkedIn: boolean
}

function summarize(tournament: Tournament, userId: ID): TournamentSummary {
  const entry = db.tournamentEntries.find(
    (e) => e.tournamentId === tournament.id && e.userId === userId,
  )
  return {
    ...tournament,
    gameName: db.games.find((g) => g.id === tournament.gameId)?.name ?? tournament.gameId,
    startsInMinutes: Math.round((Date.parse(tournament.startsAt) - Date.parse(serverTime())) / MINUTE_MS),
    slotsFree: Math.max(0, tournament.slots - tournament.slotsTaken),
    registered: entry !== undefined,
    checkedIn: entry?.checkedIn ?? false,
  }
}

export interface TournamentQuery {
  status?: TournamentStatus | 'upcoming' | 'all'
  gameId?: ID
  limit?: number
}

/** Anything a member can still join or watch. */
const UPCOMING: TournamentStatus[] = ['announced', 'check-in', 'running']

/** `GET /api/tournaments` */
export function fetchTournaments(
  params: TournamentQuery = {},
  userId: ID = db.currentUserId,
): Promise<TournamentSummary[]> {
  return query('events.fetchTournaments', () => {
    const { status = 'upcoming', gameId, limit } = params
    let items = db.tournaments.filter((t) => {
      if (gameId && t.gameId !== gameId) return false
      if (status === 'all') return true
      if (status === 'upcoming') return UPCOMING.includes(t.status)
      return t.status === status
    })

    items = items.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    if (limit) items = items.slice(0, limit)
    return items.map((t) => summarize(t, userId))
  })
}

/** `GET /api/tournaments/:id` */
export function fetchTournament(
  tournamentId: ID,
  userId: ID = db.currentUserId,
): Promise<TournamentSummary> {
  return query('events.fetchTournament', () =>
    summarize(required(db.tournaments.find((t) => t.id === tournamentId)), userId),
  )
}

/** `GET /api/tournaments/:id/entries` — the bracket list. */
export function fetchTournamentEntries(tournamentId: ID): Promise<TournamentEntry[]> {
  return query('events.fetchTournamentEntries', () =>
    db.tournamentEntries.filter((e) => e.tournamentId === tournamentId),
  )
}

export interface RegisterResult {
  entry: TournamentEntry
  tournament: TournamentSummary
  wallet: Wallet
}

/**
 * `POST /api/tournaments/:id/register`. Fees can be money or coins, and both are
 * charged here — the client sends nothing but the id.
 */
export function registerForTournament(
  tournamentId: ID,
  userId: ID = db.currentUserId,
): Promise<RegisterResult> {
  return mutate('events.registerForTournament', () => {
    const tournament = required(db.tournaments.find((t) => t.id === tournamentId))
    const player = required(getPlayer(userId))

    if (tournament.status !== 'announced' && tournament.status !== 'check-in') {
      throw new ApiError('conflict')
    }
    if (tournament.slotsTaken >= tournament.slots) throw new ApiError('conflict')
    if (db.tournamentEntries.some((e) => e.tournamentId === tournamentId && e.userId === userId)) {
      throw new ApiError('conflict')
    }
    if (player.wallet.moneyCents < tournament.feeCents) throw new ApiError('insufficientFunds')
    if (player.wallet.coins < tournament.feeCoins) throw new ApiError('insufficientCoins')

    if (tournament.feeCents > 0) {
      player.wallet.moneyCents -= tournament.feeCents
      recordTransaction({
        userId,
        type: 'spend_money',
        amount: -tournament.feeCents,
        refType: null,
        refId: tournament.id,
        staffId: null,
        note: 'tournament fee',
      })
    }
    if (tournament.feeCoins > 0) {
      player.wallet.coins -= tournament.feeCoins
      recordTransaction({
        userId,
        type: 'spend_coins',
        amount: -tournament.feeCoins,
        refType: null,
        refId: tournament.id,
        staffId: null,
        note: 'tournament fee',
      })
    }

    const entry: TournamentEntry = {
      tournamentId,
      userId,
      teamId: null,
      checkedIn: false,
      seed: null,
    }
    db.tournamentEntries.push(entry)
    tournament.slotsTaken += 1

    return { entry, tournament: summarize(tournament, userId), wallet: player.wallet }
  })
}

/** `POST /api/tournaments/:id/check-in` — only while check-in is open. */
export function checkInToTournament(
  tournamentId: ID,
  userId: ID = db.currentUserId,
): Promise<TournamentEntry> {
  return mutate('events.checkInToTournament', () => {
    const tournament = required(db.tournaments.find((t) => t.id === tournamentId))
    if (tournament.status !== 'check-in') throw new ApiError('conflict')

    const entry = required(
      db.tournamentEntries.find((e) => e.tournamentId === tournamentId && e.userId === userId),
    )
    entry.checkedIn = true
    return entry
  })
}

/** `DELETE /api/tournaments/:id/register` — refunds the fee and frees the slot. */
export function withdrawFromTournament(
  tournamentId: ID,
  userId: ID = db.currentUserId,
): Promise<void> {
  return mutate('events.withdrawFromTournament', () => {
    const tournament = required(db.tournaments.find((t) => t.id === tournamentId))
    if (tournament.status === 'running' || tournament.status === 'finished') {
      throw new ApiError('conflict')
    }

    const entry = required(
      db.tournamentEntries.find((e) => e.tournamentId === tournamentId && e.userId === userId),
    )
    db.tournamentEntries.splice(db.tournamentEntries.indexOf(entry), 1)
    tournament.slotsTaken = Math.max(0, tournament.slotsTaken - 1)

    const player = getPlayer(userId)
    if (!player) return
    if (tournament.feeCents > 0) player.wallet.moneyCents += tournament.feeCents
    if (tournament.feeCoins > 0) player.wallet.coins += tournament.feeCoins
  })
}

/* ------------------------------------------------------------------ *
 * Bookings
 * ------------------------------------------------------------------ */

/** `GET /api/bookings` — the member's reservations, soonest first. */
export function fetchBookings(userId: ID = db.currentUserId): Promise<Booking[]> {
  return query('events.fetchBookings', () =>
    db.bookings
      .filter((b) => b.userId === userId)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
  )
}

export interface BookingView extends Booking {
  zoneName: string
  machineLabel: string | null
  startsInMinutes: number
  /** Inside the grace window, so the check-in button should be live. */
  checkInOpen: boolean
}

/** `GET /api/bookings/upcoming` — with the check-in window resolved server-side. */
export function fetchUpcomingBookings(userId: ID = db.currentUserId): Promise<BookingView[]> {
  return query('events.fetchUpcomingBookings', () => {
    const now = Date.parse(serverTime())
    const live: BookingStatus[] = ['pending', 'confirmed', 'checked-in']
    const grace = db.clubSettings.bookingGraceMinutes * MINUTE_MS

    return db.bookings
      .filter((b) => b.userId === userId && live.includes(b.status))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .map((booking) => {
        const startsAt = Date.parse(booking.startsAt)
        return {
          ...booking,
          zoneName: db.zones.find((z) => z.id === booking.zoneId)?.name ?? booking.zoneId,
          machineLabel: booking.machineId ? (getMachine(booking.machineId)?.label ?? null) : null,
          startsInMinutes: Math.round((startsAt - now) / MINUTE_MS),
          checkInOpen: now >= startsAt - grace && now <= startsAt + grace,
        }
      })
  })
}

/** Hourly rate per zone class, until per-zone pricing lands. */
const ZONE_RATE_CENTS: Record<string, Cents> = { standard: 300, vip: 500, arena: 700 }

function rateFor(zoneId: ID): Cents {
  const zone = db.zones.find((z) => z.id === zoneId)
  return ZONE_RATE_CENTS[zone?.class ?? 'standard'] ?? 300
}

export interface SlotQuery {
  zoneId: ID
  /** How many hourly slots to return, starting from the next full hour. */
  hours?: number
}

/**
 * `GET /api/bookings/slots` — hourly availability for a zone. Seat counts
 * subtract existing bookings, so a full hour is genuinely unbookable.
 */
export function fetchBookingSlots(params: SlotQuery): Promise<BookingSlot[]> {
  return query('events.fetchBookingSlots', () => {
    if (!db.clubSettings.bookingEnabled) throw new ApiError('forbidden')
    const zone = required(db.zones.find((z) => z.id === params.zoneId))
    const seats = db.machines.filter((m) => m.zoneId === zone.id && m.status !== 'maintenance').length
    const priceCents = rateFor(zone.id)

    const now = Date.parse(serverTime())
    const firstHour = new Date(now)
    firstHour.setUTCMinutes(0, 0, 0)
    firstHour.setUTCHours(firstHour.getUTCHours() + 1)

    return Array.from({ length: params.hours ?? 8 }, (_, index) => {
      const startsAt = new Date(firstHour.getTime() + index * 60 * MINUTE_MS)
      const endsAt = new Date(startsAt.getTime() + 60 * MINUTE_MS)
      const taken = db.bookings.filter(
        (b) =>
          b.zoneId === zone.id &&
          b.status !== 'cancelled' &&
          b.status !== 'no-show' &&
          Date.parse(b.startsAt) < endsAt.getTime() &&
          Date.parse(b.endsAt) > startsAt.getTime(),
      ).length

      return {
        zoneId: zone.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        seatsFree: Math.max(0, seats - taken),
        priceCents,
      }
    })
  })
}

export interface CreateBookingPayload {
  zoneId: ID
  startsAt: string
  /** Whole hours. The server prices it — the client never sends an amount. */
  hours: number
  machineId?: ID
  /** Pay now from the wallet, or `false` to pay at the counter. */
  prepay?: boolean
}

export interface CreateBookingResult {
  booking: Booking
  wallet: Wallet
}

/** `POST /api/bookings` */
export function createBooking(
  payload: CreateBookingPayload,
  userId: ID = db.currentUserId,
): Promise<CreateBookingResult> {
  return mutate('events.createBooking', () => {
    if (!db.clubSettings.bookingEnabled) throw new ApiError('forbidden')
    const zone = required(db.zones.find((z) => z.id === payload.zoneId))
    const player = required(getPlayer(userId))

    const startsAt = Date.parse(payload.startsAt)
    if (Number.isNaN(startsAt)) throw new ApiError('validation', { startsAt: 'validation' })
    if (startsAt < Date.parse(serverTime())) throw new ApiError('validation', { startsAt: 'conflict' })
    if (payload.hours < 1) throw new ApiError('validation', { hours: 'validation' })

    const endsAt = startsAt + payload.hours * 60 * MINUTE_MS
    const seats = db.machines.filter((m) => m.zoneId === zone.id && m.status !== 'maintenance').length
    const overlapping = db.bookings.filter(
      (b) =>
        b.zoneId === zone.id &&
        b.status !== 'cancelled' &&
        b.status !== 'no-show' &&
        Date.parse(b.startsAt) < endsAt &&
        Date.parse(b.endsAt) > startsAt,
    ).length
    if (overlapping >= seats) throw new ApiError('conflict')

    const totalCents = rateFor(zone.id) * payload.hours
    const prepay = payload.prepay ?? false
    if (prepay && player.wallet.moneyCents < totalCents) throw new ApiError('insufficientFunds')
    if (prepay) {
      player.wallet.moneyCents -= totalCents
      recordTransaction({
        userId,
        type: 'spend_money',
        amount: -totalCents,
        refType: null,
        refId: zone.id,
        staffId: null,
        note: 'booking prepay',
      })
    }

    const booking: Booking = {
      id: newId('bk'),
      userId,
      machineId: payload.machineId ?? null,
      zoneId: zone.id,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      status: prepay ? 'confirmed' : 'pending',
      prepaidCents: prepay ? totalCents : 0,
      createdAt: db.now,
    }
    db.bookings.push(booking)

    return { booking, wallet: player.wallet }
  })
}

/** `POST /api/bookings/:id/check-in` — refused outside the grace window. */
export function checkInBooking(bookingId: ID): Promise<Booking> {
  return mutate('events.checkInBooking', () => {
    const booking = required(db.bookings.find((b) => b.id === bookingId))
    if (booking.status !== 'confirmed' && booking.status !== 'pending') throw new ApiError('conflict')

    const now = Date.parse(serverTime())
    const grace = db.clubSettings.bookingGraceMinutes * MINUTE_MS
    const startsAt = Date.parse(booking.startsAt)
    if (now < startsAt - grace || now > startsAt + grace) throw new ApiError('conflict')

    booking.status = 'checked-in'
    return booking
  })
}

/** `DELETE /api/bookings/:id` — refunds anything prepaid. */
export function cancelBooking(bookingId: ID): Promise<Booking> {
  return mutate('events.cancelBooking', () => {
    const booking = required(db.bookings.find((b) => b.id === bookingId))
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new ApiError('conflict')
    }

    if (booking.prepaidCents > 0) {
      const player = getPlayer(booking.userId)
      if (player) player.wallet.moneyCents += booking.prepaidCents
      recordTransaction({
        userId: booking.userId,
        type: 'topup',
        amount: booking.prepaidCents,
        refType: null,
        refId: booking.id,
        staffId: null,
        note: 'booking refund',
      })
      booking.prepaidCents = 0
    }

    booking.status = 'cancelled'
    return booking
  })
}
