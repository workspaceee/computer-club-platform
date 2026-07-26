// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/games/*` and `/api/club/*`. Read-only catalogue: games, zones, seats and
// the club's own settings. Filtering and sorting live here on purpose — the real
// endpoints take the same query params, so no component ever grows a `.filter()`
// over the whole library.
import { mutate, newId, query, required } from '@/lib/mock/api/client'
import { db, getMachine, getPlayer } from '@/lib/mock/db'
import type { Game, GameCategory, GameLaunch, HouseAccount } from '@/lib/types/catalog'
import type { ID } from '@/lib/types/common'
import type { Machine, Zone } from '@/lib/types/machine'
import type { Club, ClubSettings } from '@/lib/types/settings'

export type GameSort = 'popular' | 'rating' | 'name' | 'recent'

export interface GameQuery {
  search?: string
  category?: GameCategory | 'all'
  sort?: GameSort
  /** Only titles the member has launched before. */
  playedOnly?: boolean
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

/** `GET /api/games` — search, category filter, sort and pagination. */
export function fetchGames(params: GameQuery = {}): Promise<GameListResult> {
  return query('catalog.fetchGames', () => {
    const { search = '', category = 'all', sort = 'popular', playedOnly = false } = params
    const needle = search.trim().toLowerCase()
    const launches = db.gameLaunches.filter((l) => l.userId === db.currentUserId)
    const played = new Set(launches.map((l) => l.gameId))

    let items = db.games.filter((game) => {
      if (category !== 'all' && game.category !== category) return false
      if (playedOnly && !played.has(game.id)) return false
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

/**
 * `GET /api/games/featured` — the curated hero row. Resolved from ids in curator
 * order, and silently skips an id whose title left the catalogue.
 */
export function fetchFeaturedGames(): Promise<Game[]> {
  return query('catalog.fetchFeaturedGames', () =>
    db.featuredGameIds
      .map((id) => db.games.find((g) => g.id === id))
      .filter((game): game is Game => game !== undefined),
  )
}

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

/** `GET /api/games/recent` — the member's continue-playing row. */
export function fetchRecentGames(userId: ID = db.currentUserId, limit = 6): Promise<Game[]> {
  return query('catalog.fetchRecentGames', () => {
    const seen = new Set<ID>()
    const ordered: Game[] = []
    const launches = db.gameLaunches
      .filter((l) => l.userId === userId)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

    for (const launch of launches) {
      if (seen.has(launch.gameId)) continue
      const game = db.games.find((g) => g.id === launch.gameId)
      if (!game) continue
      seen.add(launch.gameId)
      ordered.push(game)
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
