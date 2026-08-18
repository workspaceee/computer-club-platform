// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/games/*` and `/api/club/*`. Read-only catalogue: games, zones, seats and
// the club's own settings. Filtering and sorting live here on purpose — the real
// endpoints take the same query params, so no component ever grows a `.filter()`
// over the whole library.
import { mutate, newId, query, required, serverTime } from '@/lib/mock/api/client'
import {
  db,
  getFriends,
  getLiveSession,
  getMachine,
  getPlayer,
  getZone,
  getZoneOccupancy,
} from '@/lib/mock/db'
import type { BookingStatus } from '@/lib/types/booking'
import type { Game, GameCategory, GameLaunch, HouseAccount } from '@/lib/types/catalog'
import type { ID, ISODateTime } from '@/lib/types/common'
import type {
  Machine,
  MachineSpecs,
  MachineStatus,
  Zone,
  ZoneClass,
  ZoneOccupancy,
} from '@/lib/types/machine'
import type { SessionState } from '@/lib/types/session'
import type { Club, ClubSettings } from '@/lib/types/settings'

export type GameSort = 'popular' | 'rating' | 'name' | 'recent'

export interface GameQuery {
  search?: string
  category?: GameCategory | 'all'
  sort?: GameSort
  /** Only titles the member has launched before. */
  playedOnly?: boolean
  /**
   * Only titles that need one of the club's shared logins (C4.2). A catalogue
   * predicate, so it is answered here and not by the grid.
   */
  needsHouseAccount?: boolean
  /**
   * Only titles an accepted friend is in **right now** (C4.2).
   *
   * Server-side because the client has neither half of the answer: it would have
   * to pull the whole friend list *and* everyone's live presence into the library
   * screen to filter covers. The endpoint joins the two and returns titles, never
   * people — who is in what is the social panel's business (C3.7) and C4.5's.
   */
  friendsPlaying?: boolean
  limit?: number
  offset?: number
}

export interface GameListResult {
  items: Game[]
  /** Matches before pagination, so the UI can render "showing 24 of 68". */
  total: number
}

function sortGames(items: Game[], sort: GameSort, launches: GameLaunch[]): Game[] {
  const lastPlayed = new Map<ID, number>()
  for (const launch of launches) {
    const at = Date.parse(launch.startedAt)
    if (at > (lastPlayed.get(launch.gameId) ?? 0)) lastPlayed.set(launch.gameId, at)
  }

  const sorted = [...items]
  switch (sort) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'recent':
      return sorted.sort((a, b) => (lastPlayed.get(b.id) ?? 0) - (lastPlayed.get(a.id) ?? 0))
    default:
      return sorted.sort((a, b) => b.players - a.players)
  }
}

/** `GET /api/games` — search, filters, sort and pagination (C4.2). */
export function fetchGames(params: GameQuery = {}): Promise<GameListResult> {
  return query('catalog.fetchGames', () => {
    const {
      search = '',
      category = 'all',
      sort = 'popular',
      playedOnly = false,
      needsHouseAccount = false,
      friendsPlaying = false,
    } = params
    const needle = search.trim().toLowerCase()
    const launches = db.gameLaunches.filter((l) => l.userId === db.currentUserId)
    const played = new Set(launches.map((l) => l.gameId))
    // Built once per call rather than per row, and only when the filter is on:
    // resolving the friend list for every one of 67 titles is the same answer 67
    // times. Titles, not friends — a game with four friends in it appears once.
    const friendTitles = friendsPlaying
      ? new Set(
          getFriends()
            .filter((f) => f.online && f.playingGameId)
            .map((f) => f.playingGameId as ID),
        )
      : null

    let items = db.games.filter((game) => {
      if (category !== 'all' && game.category !== category) return false
      if (playedOnly && !played.has(game.id)) return false
      if (needsHouseAccount && !game.needsHouseAccount) return false
      if (friendTitles && !friendTitles.has(game.id)) return false
      if (needle && !game.name.toLowerCase().includes(needle)) return false
      return true
    })

    items = sortGames(items, sort, launches)
    const total = items.length
    const offset = params.offset ?? 0
    const limit = params.limit ?? total
    return { items: items.slice(offset, offset + limit), total }
  })
}

/** `GET /api/games/:id` */
export function fetchGame(gameId: ID): Promise<Game> {
  return query('catalog.fetchGame', () => required(db.games.find((g) => g.id === gameId)))
}

// `GET /api/games/featured` used to live here — the five covers of the old hero
// row. C3.9 replaced that rail with the club's own deck (`GET /api/hero`), which
// composes campaigns, brackets and the novelty shelf; nothing reads a curated
// game list any more, and the shelf it *would* have duplicated is `gameReleases`.

/** `GET /api/games/categories` — with counts, for the filter chips. */
export function fetchGameCategories(): Promise<{ category: GameCategory; count: number }[]> {
  return query('catalog.fetchGameCategories', () => {
    const counts = new Map<GameCategory, number>()
    for (const game of db.games) {
      counts.set(game.category, (counts.get(game.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  })
}

/**
 * One row of the "Continue" card (C3.2): a title the member has played, and when
 * they last started it.
 *
 * The timestamp travels *with* the game rather than the row being a bare `Game`,
 * because "last played" is the only thing that makes the card more than three
 * more covers — it is what tells the player which of these three is the match
 * they just stepped away from. Deriving it on the client would mean pulling the
 * whole launch history onto the home surface and reducing it there, which is the
 * same mistake `sortGames` exists to prevent one function above.
 *
 * A `Minutes` total is deliberately *not* here: the card has room for one fact,
 * and the profile screen is where playtime per title belongs.
 */
export interface RecentGame {
  game: Game
  /** Start of the most recent launch of this title. */
  lastPlayedAt: ISODateTime
}

/**
 * `GET /api/games/recent` — the member's continue-playing row.
 *
 * Deduplicated by title, newest first: a player who restarted CS2 four times
 * tonight has played *one* game, and a row that repeated it four times would
 * bury the other two. `limit` is the caller's — the home card asks for three,
 * and nothing about that number lives in this function.
 */
export function fetchRecentGames(
  userId: ID = db.currentUserId,
  limit = 6,
): Promise<RecentGame[]> {
  return query('catalog.fetchRecentGames', () => {
    const seen = new Set<ID>()
    const ordered: RecentGame[] = []
    const launches = db.gameLaunches
      .filter((l) => l.userId === userId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

    for (const launch of launches) {
      if (seen.has(launch.gameId)) continue
      const game = db.games.find((g) => g.id === launch.gameId)
      if (!game) continue
      seen.add(launch.gameId)
      // Newest-first order means the first row seen for a title *is* its latest
      // launch, so no per-title max has to be computed.
      ordered.push({ game, lastPlayedAt: launch.startedAt })
      if (ordered.length === limit) break
    }
    return ordered
  })
}

/** `GET /api/games/launches` — playtime history for the profile page. */
export function fetchGameLaunches(userId: ID = db.currentUserId): Promise<GameLaunch[]> {
  return query('catalog.fetchGameLaunches', () =>
    db.gameLaunches
      .filter((l) => l.userId === userId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
  )
}

/**
 * `POST /api/games/:id/launch`. Records the launch and marks the player as
 * in-game so the social panel shows what everyone is playing.
 */
export function launchGame(gameId: ID, userId: ID = db.currentUserId): Promise<GameLaunch> {
  return mutate('catalog.launchGame', () => {
    const game = required(db.games.find((g) => g.id === gameId))
    const player = required(getPlayer(userId))

    const launch: GameLaunch = {
      id: newId('launch'),
      userId,
      gameId: game.id,
      sessionId: db.currentSessionId,
      startedAt: db.now,
      // Open-ended until the agent reports the exit; playtime is derived from the
      // two timestamps rather than stored twice.
      endedAt: null,
    }
    db.gameLaunches.push(launch)

    player.playingGameId = game.id
    player.online = true
    player.stats.gamesPlayed += 1

    // The feed is a presentational log: pre-rendered label plus a relative time
    // string, matching what the real activity endpoint will return.
    db.activity.unshift({
      id: newId('act'),
      type: 'game',
      label: `Played ${game.name}`,
      time: 'Just now',
    })

    return launch
  })
}

/** `GET /api/club/accounts` — shared launcher logins available at the counter. */
export function fetchHouseAccounts(): Promise<HouseAccount[]> {
  return query('catalog.fetchHouseAccounts', () => db.houseAccounts)
}

/** `GET /api/club` */
export function fetchClub(): Promise<Club> {
  return query('catalog.fetchClub', () => db.club)
}

/** `GET /api/club/settings` — currency, thresholds, feature switches. */
export function fetchClubSettings(): Promise<ClubSettings> {
  return query('catalog.fetchClubSettings', () => db.clubSettings)
}

/** `GET /api/club/zones` */
export function fetchZones(): Promise<Zone[]> {
  return query('catalog.fetchZones', () => db.zones)
}

/** `GET /api/club/machines` — the seat map, optionally one zone at a time. */
export function fetchMachines(zoneId?: ID): Promise<Machine[]> {
  return query('catalog.fetchMachines', () =>
    zoneId ? db.machines.filter((m) => m.zoneId === zoneId) : db.machines,
  )
}

/** `GET /api/club/machines/:id` */
export function fetchMachine(machineId: ID = db.currentMachineId): Promise<Machine> {
  return query('catalog.fetchMachine', () => required(getMachine(machineId)))
}

/**
 * The seat this launcher runs on, resolved into one answer (C1.6).
 *
 * The station panel needs the machine, its zone *and* whatever is booked on it
 * next. Three separate reads would make the lock screen join them itself and
 * paint a seat as free while its own booking row was still in flight, so the
 * join happens here — the real `GET /api/club/station` answers the same shape.
 *
 * Hardware facts (`specs`) travel with it because the HUD strip states the panel
 * and the GPU next to the status: those are club data, not agent telemetry, and
 * a seat with a dead agent must still be able to say what it is (F5.4).
 */
export interface StationInfo {
  machineId: ID
  /** Display name of the seat, e.g. `PC #17`. Never built from the id in the UI. */
  label: string
  zoneId: ID
  zoneName: string
  zoneClass: ZoneClass
  status: MachineStatus
  /**
   * Start of the next live reservation on this seat, `null` when the horizon
   * below is empty. Drives the third status the panel can show — "booked from
   * HH:MM" — which no other field can express: a seat that is free *right now*
   * and taken in twenty minutes is neither `free` nor `reserved`.
   */
  nextBookingAt: ISODateTime | null
  specs: MachineSpecs
  /** `null` when the Windows agent has never checked in (F5.4). */
  agentLastSeen: ISODateTime | null
}

/**
 * How far ahead a reservation is worth naming on the lock screen. Beyond half a
 * day "booked from 09:00" is not information a walk-in can act on, and it would
 * make every seat in the club look taken.
 */
const STATION_BOOKING_HORIZON_MS = 12 * 60 * 60 * 1000

/** Reservations that still hold the seat. Cancelled and no-show ones do not. */
const HOLDING_BOOKING_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed', 'checked-in']

/** `GET /api/club/station` — seat + zone + next reservation, for the lock screen. */
export function fetchStation(machineId: ID = db.currentMachineId): Promise<StationInfo> {
  return query('catalog.fetchStation', () => {
    const machine = required(getMachine(machineId))
    const zone = required(getZone(machine.zoneId))
    const now = Date.parse(serverTime())

    const next = db.bookings
      .filter(
        (booking) =>
          booking.machineId === machine.id &&
          HOLDING_BOOKING_STATUSES.includes(booking.status) &&
          // Still running counts: a booking whose window has started but whose
          // check-in never happened is exactly what holds this seat now.
          Date.parse(booking.endsAt) > now &&
          Date.parse(booking.startsAt) - now < STATION_BOOKING_HORIZON_MS,
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]

    return {
      machineId: machine.id,
      label: machine.label,
      zoneId: zone.id,
      zoneName: zone.name,
      zoneClass: zone.class,
      status: machine.status,
      nextBookingAt: next?.startsAt ?? null,
      specs: machine.specs,
      agentLastSeen: machine.agentLastSeen,
    }
  })
}

/**
 * Who is sitting here right now (C1.7).
 *
 * `StationInfo.status` answers "can this seat be taken", which is the question
 * the lock screen's strip asks. It cannot answer the one the *sign-in* asks —
 * "is the person who just authenticated the person this seat already belongs
 * to" — because `occupied` is an aggregate for the floor map and names nobody.
 * Only the session row knows, so this is a separate read against the sessions,
 * not another field on the seat.
 *
 * `holder` is a display name and the only human-readable field: a nickname for a
 * member, the walk-in's own label for a guest. It travels as *data* because it is
 * data — an admin-authored account name, not copy to translate (F2.2).
 */
export interface StationHolder {
  sessionId: ID
  machineId: ID
  /** Nickname of the member, or the walk-in's label. Never an id. */
  holder: string
  /** `null` for a walk-in — there is no account to compare an arrival against. */
  userId: ID | null
  /** `null` for a member. Exactly one of the two is set, like `Session`. */
  guestId: ID | null
  /**
   * `ended` never reaches the client: a closed session holds nothing, and a
   * screen that had to filter it out would be one `if` away from locking a
   * player out of a seat nobody is on.
   */
  state: Exclude<SessionState, 'ended'>
  startedAt: ISODateTime
}

/**
 * `GET /api/club/station/holder` — the live session on this seat, or `null`.
 *
 * A paused session counts, and that is the whole point: "Lock PC" keeps the
 * seat, so a paused visit is exactly the case where the machine looks free and
 * is not. Its own player walks back in by PIN (`fetchPausedVisit` /
 * `unlockWithPin`, C1.10); for everybody else this endpoint is what stops a
 * second visit from being opened on top of the first.
 */
export function fetchStationHolder(
  machineId: ID = db.currentMachineId,
): Promise<StationHolder | null> {
  return query('catalog.fetchStationHolder', () => {
    const live = getLiveSession(machineId)
    if (!live) return null

    const member = live.userId ? getPlayer(live.userId) : undefined
    return {
      sessionId: live.id,
      machineId,
      // Same label shape `continueAsGuest` hands out, so the screen does not
      // have to tell a member and a walk-in apart just to print a name.
      holder: member?.user.nickname ?? `Guest ${(live.guestId ?? live.id).slice(-4).toUpperCase()}`,
      userId: live.userId,
      guestId: live.guestId,
      state: live.state as Exclude<SessionState, 'ended'>,
      startedAt: live.startedAt,
    }
  })
}

export interface OccupancySummary {
  total: number
  free: number
  occupied: number
  reserved: number
  maintenance: number
  /** 0–100, rounded. Drives the "club is busy" badge. */
  loadPct: number
}

/** `GET /api/club/occupancy` — precomputed so no component counts seats itself. */
export function fetchOccupancy(zoneId?: ID): Promise<OccupancySummary> {
  return query('catalog.fetchOccupancy', () => {
    const seats = zoneId ? db.machines.filter((m) => m.zoneId === zoneId) : db.machines
    const count = (status: Machine['status']) => seats.filter((m) => m.status === status).length
    const occupied = count('occupied')
    return {
      total: seats.length,
      free: count('free'),
      occupied,
      reserved: count('reserved'),
      maintenance: count('maintenance'),
      loadPct: seats.length === 0 ? 0 : Math.round((occupied / seats.length) * 100),
    }
  })
}

/**
 * `GET /api/club/occupancy/zones` — free seats **per zone** (C1.8).
 *
 * `fetchOccupancy` answers "how full is the club"; the idle screen has to answer
 * "where can I sit", and those are different questions: a walk-in reading `12
 * free` from the door still has to be told that eleven of them are in the Main
 * Hall and the last one is a €5/h console seat. Counted here rather than by the
 * screen for the usual reason — a client that counts seats itself is a client
 * that will disagree with the counter's screen.
 */
export function fetchZoneOccupancy(): Promise<ZoneOccupancy[]> {
  return query('catalog.fetchZoneOccupancy', () => getZoneOccupancy())
}
