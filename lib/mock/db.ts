// MOCK ONLY — removed in Stage 4 when the real API lands (F3.3).
//
// One in-memory store that stands in for the whole backend. Everything the UI
// renders must come from here, so there is exactly one source of truth while the
// client is built ahead of the server.
//
// Two hard rules keep this file honest:
//  1. Money is integer cents, time is integer seconds/minutes — never floats.
//  2. No `Date.now()` / `Math.random()` at module scope. The dataset is fully
//     deterministic so server and client render identical markup and snapshots
//     do not flake.
import type { Lang } from '@/lib/i18n/types'
import type { AuditEntry, StaffMember } from '@/lib/types/admin'
import type { Booking } from '@/lib/types/booking'
import type {
  Game,
  GameCategory,
  GameLaunch,
  GameLauncher,
  GameRelease,
  GameRequirements,
  HouseAccount,
  Product,
  ProductCategory,
  StationFit,
} from '@/lib/types/catalog'
import type { Cents, Coins, ID, ISODateTime, Minutes } from '@/lib/types/common'
import type {
  Achievement,
  ActivityEvent,
  BattlePassTier,
  Quest,
  Redemption,
  Reward,
  Season,
  UserSeason,
} from '@/lib/types/loyalty'
import type {
  Machine,
  MachineSettings,
  MachineSpecs,
  MachineStatus,
  Zone,
} from '@/lib/types/machine'
import type { HelpThread, Notification } from '@/lib/types/notification'
import type { Order } from '@/lib/types/order'
import type { Pass, PassPurchase } from '@/lib/types/pass'
import type { Promo, PromoAudience, PromoKind, PromoSurface } from '@/lib/types/promo'
import type { Session, TransferRequest } from '@/lib/types/session'
import type { Club, ClubSettings, UserPreferences } from '@/lib/types/settings'
import type { Friendship, FriendSummary, Party } from '@/lib/types/social'
import type { Tab, Transaction } from '@/lib/types/tab'
import type { Tournament, TournamentEntry } from '@/lib/types/tournament'
import type { PrivacySettings, User, Wallet } from '@/lib/types/user'

/* ------------------------------------------------------------------ *
 * Time anchor
 * ------------------------------------------------------------------ */

export const CLUB_ID: ID = 'club-imba-vln'

/**
 * Fixed "now" for the whole dataset: a Sunday evening, prime time, so the club
 * looks busy in screenshots. All timestamps below are offsets from this anchor.
 */
export const MOCK_NOW = '2026-07-26T19:00:00.000Z'

const NOW_MS = Date.parse(MOCK_NOW)

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** ISO timestamp `minutes` away from the anchor. Negative = in the past. */
function atMinutes(minutes: number): ISODateTime {
  return new Date(NOW_MS + minutes * MINUTE).toISOString()
}

function atHours(hours: number): ISODateTime {
  return new Date(NOW_MS + hours * HOUR).toISOString()
}

function atDays(days: number): ISODateTime {
  return new Date(NOW_MS + days * DAY).toISOString()
}

/**
 * Deterministic LCG. Used only to scatter values that carry no meaning (seat
 * occupancy, player counts) without hand-writing 40 rows of noise.
 */
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

/* ------------------------------------------------------------------ *
 * Club and settings
 * ------------------------------------------------------------------ */

const DEFAULT_LOCALE: Lang = 'en'

const club: Club = {
  id: CLUB_ID,
  name: 'IMBA Esports Club',
  timezone: 'Europe/Vilnius',
  currency: 'EUR',
  defaultLocale: DEFAULT_LOCALE,
}

const clubSettings: ClubSettings = {
  clubId: CLUB_ID,
  name: club.name,
  timezone: club.timezone,
  currency: 'EUR',
  defaultLocale: DEFAULT_LOCALE,
  availableLocales: ['en', 'ru', 'lt'],
  creditLimitCents: 2000,
  guestCheckoutEnabled: true,
  bookingEnabled: true,
  barOrdersEnabled: true,
  // The in-app card form is part of the demo, so the switch is on; the charge
  // itself is mocked until a real PSP is wired in Stage 4.
  cardPaymentsEnabled: true,
  warningThresholds: { notice: 30, warning: 10, critical: 3 },
  /**
   * A plausible club week (C2.11), written so every branch of
   * `lib/club-hours.ts` is covered by data rather than by hope:
   *
   *   Mon–Thu  12:00 → 02:00  window across midnight (the common shape)
   *   Fri      12:00 → 04:00  same, longer
   *   Sat      00:00 → 00:00  round the clock (`from === to`)
   *   Sun      12:00 → 23:00  ordinary same-day window
   *
   * No `null` day on purpose: a closed weekday would put the "Club closed"
   * overlay over the whole demo for a day at a time. The branch is still
   * reachable — `?club=closed` (see `lib/dev-flags.ts`) walks straight into it.
   *
   * Saturday shows why a 24-hour day is not the same as "never closes": Sunday
   * opens at noon, so the club really does close at Saturday midnight, and
   * `clubHoursStatus()` warns about it.
   */
  openHours: {
    1: { from: '12:00', to: '02:00' },
    2: { from: '12:00', to: '02:00' },
    3: { from: '12:00', to: '02:00' },
    4: { from: '12:00', to: '02:00' },
    5: { from: '12:00', to: '04:00' },
    6: { from: '00:00', to: '00:00' },
    7: { from: '12:00', to: '23:00' },
  },
  bookingGraceMinutes: 15,
  // Half an hour for a friend who signs up (C3.13) — the club's offer, so the
  // card that makes the promise reads it from here instead of printing a 30.
  referralBonusMinutes: 30,
}

/* ------------------------------------------------------------------ *
 * Zones and 40 machines
 * ------------------------------------------------------------------ */

const zones: Zone[] = [
  { id: 'zone-vip', clubId: CLUB_ID, name: 'VIP', class: 'vip', hourlyPriceCents: 400 },
  { id: 'zone-main', clubId: CLUB_ID, name: 'Main Hall', class: 'standard', hourlyPriceCents: 250 },
  { id: 'zone-arena', clubId: CLUB_ID, name: 'Arena', class: 'standard', hourlyPriceCents: 250 },
  { id: 'zone-console', clubId: CLUB_ID, name: 'Console Lounge', class: 'ps5', hourlyPriceCents: 500 },
]

const SPECS: Record<'vip' | 'standard' | 'arena' | 'ps5', MachineSpecs> = {
  vip: {
    cpu: 'Intel Core i9-14900K',
    gpu: 'NVIDIA RTX 4090 24GB',
    ram: '64GB DDR5-6000',
    monitor: 'ASUS ROG 27" QHD',
    refreshHz: 360,
  },
  standard: {
    cpu: 'Intel Core i5-14600KF',
    gpu: 'NVIDIA RTX 4070 12GB',
    ram: '32GB DDR5-5600',
    monitor: 'AOC 25" FHD',
    refreshHz: 240,
  },
  arena: {
    cpu: 'Intel Core i7-14700K',
    gpu: 'NVIDIA RTX 4080 16GB',
    ram: '32GB DDR5-6000',
    monitor: 'BenQ ZOWIE 24.5" FHD',
    refreshHz: 240,
  },
  ps5: {
    cpu: 'AMD Zen 2 (PS5 Pro)',
    gpu: 'AMD RDNA 2 (PS5 Pro)',
    ram: '16GB GDDR6',
    monitor: 'LG OLED 55" 4K',
    refreshHz: 120,
  },
}

/** Seats deliberately not bookable, so the UI has to render honest states. */
const MAINTENANCE_SEATS = new Set(['pc-13', 'pc-30'])
/** Agent never checked in — must not be shown as free (F5.4). */
const OFFLINE_SEATS = new Set(['pc-35', 'ps5-4'])
const RESERVED_SEATS = new Set(['pc-06', 'pc-22'])

function buildMachines(): Machine[] {
  const rng = makeRng(20260726)
  const list: Machine[] = []

  const pcLayout: Array<{ zoneId: ID; specs: MachineSpecs; from: number; to: number }> = [
    { zoneId: 'zone-vip', specs: SPECS.vip, from: 1, to: 8 },
    { zoneId: 'zone-main', specs: SPECS.standard, from: 9, to: 24 },
    { zoneId: 'zone-arena', specs: SPECS.arena, from: 25, to: 36 },
  ]

  for (const block of pcLayout) {
    for (let n = block.from; n <= block.to; n++) {
      const id = `pc-${String(n).padStart(2, '0')}`
      const status = resolveStatus(id, rng)
      list.push({
        id,
        clubId: CLUB_ID,
        zoneId: block.zoneId,
        label: `PC #${String(n).padStart(2, '0')}`,
        status,
        specs: { ...block.specs },
        agentLastSeen: status === 'offline' ? null : atMinutes(-1 - Math.floor(rng() * 4)),
      })
    }
  }

  for (let n = 1; n <= 4; n++) {
    const id = `ps5-${n}`
    const status = resolveStatus(id, rng)
    list.push({
      id,
      clubId: CLUB_ID,
      zoneId: 'zone-console',
      label: `PS5 #${n}`,
      status,
      specs: { ...SPECS.ps5 },
      agentLastSeen: status === 'offline' ? null : atMinutes(-2),
    })
  }

  return list
}

function resolveStatus(id: ID, rng: () => number): MachineStatus {
  if (MAINTENANCE_SEATS.has(id)) return 'maintenance'
  if (OFFLINE_SEATS.has(id)) return 'offline'
  if (RESERVED_SEATS.has(id)) return 'reserved'
  // ~60% occupancy: busy enough to look alive, free enough to pick a seat.
  return rng() < 0.6 ? 'occupied' : 'free'
}

const machines: Machine[] = buildMachines()

/** The seat this launcher instance runs on — the demo player's PC. */
export const CURRENT_MACHINE_ID: ID = 'pc-17'

/* ------------------------------------------------------------------ *
 * Game catalogue (60+)
 * ------------------------------------------------------------------ */

type GameSeed = [id: string, name: string, category: GameCategory, rating: number, cover: [string, string], launcher: GameLauncher]

const GAME_SEEDS: GameSeed[] = [
  ['cs2', 'Counter-Strike 2', 'Shooter', 4.8, ['#f0a500', '#3a2c00'], 'Steam'],
  ['valorant', 'Valorant', 'Shooter', 4.7, ['#ff4655', '#1f181b'], 'Riot'],
  ['dota2', 'Dota 2', 'MOBA', 4.6, ['#a72420', '#241110'], 'Steam'],
  ['fortnite', 'Fortnite', 'Battle Royale', 4.5, ['#7b3ff2', '#181430'], 'Epic'],
  ['lol', 'League of Legends', 'MOBA', 4.6, ['#0596aa', '#031a24'], 'Riot'],
  ['apex', 'Apex Legends', 'Battle Royale', 4.5, ['#da292a', '#241012'], 'EA App'],
  ['pubg', 'PUBG: Battlegrounds', 'Battle Royale', 4.2, ['#f2a900', '#2b1f00'], 'Steam'],
  ['ow2', 'Overwatch 2', 'Shooter', 4.3, ['#f99e1a', '#241705'], 'Battle.net'],
  ['rocket', 'Rocket League', 'Sports', 4.6, ['#1f8fff', '#04182b'], 'Epic'],
  ['gtav', 'Grand Theft Auto V', 'RPG', 4.7, ['#6cbf3f', '#0f1f0a'], 'Rockstar'],
  ['minecraft', 'Minecraft', 'RPG', 4.8, ['#5aa03c', '#12210c'], 'Mojang'],
  ['rust', 'Rust', 'RPG', 4.1, ['#ce422b', '#241009'], 'Steam'],
  ['tarkov', 'Escape from Tarkov', 'Shooter', 4.4, ['#8a8f5c', '#1c1d12'], 'BSG'],
  ['warthunder', 'War Thunder', 'Strategy', 4.2, ['#4a6a2f', '#101709'], 'Gaijin'],
  ['wot', 'World of Tanks', 'Strategy', 4.0, ['#a07d3e', '#211a0d'], 'Wargaming'],
  ['fifa25', 'EA Sports FC 25', 'Sports', 4.3, ['#00b140', '#04220f'], 'EA App'],
  ['warzone', 'Call of Duty: Warzone', 'Battle Royale', 4.4, ['#f2a900', '#241a00'], 'Battle.net'],
  ['r6', 'Rainbow Six Siege', 'Shooter', 4.5, ['#ff8c00', '#241500'], 'Ubisoft'],
  ['dbd', 'Dead by Daylight', 'Strategy', 4.2, ['#b3122a', '#210409'], 'Steam'],
  ['bg3', "Baldur's Gate 3", 'RPG', 4.9, ['#b8863b', '#211705'], 'Steam'],
  ['cyberpunk', 'Cyberpunk 2077', 'RPG', 4.6, ['#fcee0a', '#242200'], 'GOG'],
  ['elden', 'Elden Ring', 'RPG', 4.9, ['#c8a24a', '#211a0b'], 'Steam'],
  ['hearthstone', 'Hearthstone', 'Strategy', 4.1, ['#e08a2b', '#241405'], 'Battle.net'],
  ['sc2', 'StarCraft II', 'Strategy', 4.4, ['#2f7fd1', '#04182b'], 'Battle.net'],
  ['bo6', 'Call of Duty: Black Ops 6', 'Shooter', 4.4, ['#7a8b3a', '#171b0c'], 'Battle.net'],
  ['thefinals', 'The Finals', 'Shooter', 4.4, ['#d63b6a', '#240d17'], 'Steam'],
  ['deltaforce', 'Delta Force', 'Shooter', 4.1, ['#3f7f5f', '#0c1a13'], 'Steam'],
  ['marvelrivals', 'Marvel Rivals', 'Shooter', 4.5, ['#d43b3b', '#240d0d'], 'Steam'],
  ['xdefiant', 'XDefiant', 'Shooter', 3.9, ['#e0603a', '#241109'], 'Ubisoft'],
  ['csgo-dz', 'Danger Zone', 'Battle Royale', 3.8, ['#c9a227', '#241d05'], 'Steam'],
  ['naraka', 'Naraka: Bladepoint', 'Battle Royale', 4.2, ['#b03a5b', '#210b13'], 'Steam'],
  ['fallguys', 'Fall Guys', 'Battle Royale', 4.3, ['#ff6fa5', '#2b0f1b'], 'Epic'],
  ['dune', 'Dune: Awakening', 'MMO', 4.3, ['#d9954a', '#241609'], 'Steam'],
  ['throneliberty', 'Throne and Liberty', 'MMO', 4.0, ['#4a86c8', '#0a1724'], 'Steam'],
  ['lostark', 'Lost Ark', 'MMO', 4.1, ['#c0913c', '#211809'], 'Steam'],
  ['newworld', 'New World: Aeternum', 'MMO', 4.0, ['#3f8f7a', '#0c1d18'], 'Steam'],
  ['wowr', 'World of Warcraft', 'MMO', 4.5, ['#2f6fbf', '#08152b'], 'Battle.net'],
  ['ffxiv', 'Final Fantasy XIV', 'MMO', 4.6, ['#7c5cc4', '#150f24'], 'Square Enix'],
  ['albion', 'Albion Online', 'MMO', 3.9, ['#a8963f', '#1d190a'], 'Steam'],
  ['smite2', 'Smite 2', 'MOBA', 4.0, ['#3f9fb0', '#0a1c20'], 'Steam'],
  ['hots', 'Heroes of the Storm', 'MOBA', 3.9, ['#3b7fd4', '#0a1628'], 'Battle.net'],
  ['pokeunite', 'Pokemon Unite', 'MOBA', 3.8, ['#e0b23a', '#241c09'], 'Steam'],
  ['deadlock', 'Deadlock', 'MOBA', 4.4, ['#b98a4a', '#20170c'], 'Steam'],
  ['f124', 'F1 24', 'Racing', 4.3, ['#e10600', '#240101'], 'EA App'],
  ['forza', 'Forza Horizon 5', 'Racing', 4.7, ['#5aa9e0', '#0a1c28'], 'Xbox'],
  ['assetto', 'Assetto Corsa Competizione', 'Racing', 4.5, ['#c3c9d1', '#141821'], 'Steam'],
  ['dirt5', 'DIRT 5', 'Racing', 4.0, ['#d97a1f', '#241305'], 'Steam'],
  ['wreckfest', 'Wreckfest', 'Racing', 4.2, ['#a35a2a', '#20110a'], 'Steam'],
  ['nfsunbound', 'Need for Speed Unbound', 'Racing', 4.0, ['#b83fd1', '#1c0a21'], 'EA App'],
  ['nba2k25', 'NBA 2K25', 'Sports', 4.0, ['#d1802f', '#24160a'], 'Steam'],
  ['ufc5', 'EA Sports UFC 5', 'Sports', 4.1, ['#cf3b2f', '#240d0a'], 'EA App'],
  ['tennis', 'TopSpin 2K25', 'Sports', 3.9, ['#4aa85f', '#0d2113'], 'Steam'],
  ['pes', 'eFootball', 'Sports', 3.7, ['#3f7fc4', '#0a1724'], 'Steam'],
  ['aoe4', 'Age of Empires IV', 'Strategy', 4.5, ['#c9a24a', '#211a0b'], 'Xbox'],
  ['civ7', 'Civilization VII', 'Strategy', 4.6, ['#4a9fb8', '#0c1e24'], 'Steam'],
  ['totalwar', 'Total War: Warhammer III', 'Strategy', 4.4, ['#b0392f', '#210c0a'], 'Steam'],
  ['frostpunk2', 'Frostpunk 2', 'Strategy', 4.3, ['#6f9fc4', '#111d24'], 'Steam'],
  ['cities2', 'Cities: Skylines II', 'Strategy', 3.8, ['#4aa88f', '#0d211c'], 'Steam'],
  ['stellaris', 'Stellaris', 'Strategy', 4.4, ['#6a5cc4', '#120f24'], 'Steam'],
  ['witcher3', 'The Witcher 3: Wild Hunt', 'RPG', 4.9, ['#c9433a', '#21100c'], 'GOG'],
  ['starfield', 'Starfield', 'RPG', 4.0, ['#c9c2b0', '#1b1a16'], 'Steam'],
  ['diablo4', 'Diablo IV', 'RPG', 4.3, ['#a33a2a', '#210c09'], 'Battle.net'],
  ['pathofexile2', 'Path of Exile 2', 'RPG', 4.7, ['#a8763a', '#20170c'], 'Steam'],
  ['helldivers2', 'Helldivers 2', 'Shooter', 4.6, ['#e0c23a', '#241f09'], 'Steam'],
  ['palworld', 'Palworld', 'RPG', 4.4, ['#4ab0c9', '#0c2024'], 'Steam'],
  ['rdr2', 'Red Dead Redemption 2', 'RPG', 4.9, ['#b8452f', '#210f0a'], 'Rockstar'],
  ['gtaonline', 'GTA Online', 'RPG', 4.4, ['#4aa85f', '#0d2113'], 'Rockstar'],
]

/**
 * Launchers the club can only start through one of its **own** logins (C4.2).
 *
 * Steam, Epic and GOG run under the club's café licensing — the seat starts the
 * title on the machine's own library and nobody signs in twice. Everything here
 * insists on a publisher account per player, so the counter keeps a pool of them
 * (`houseAccounts`) and the launch dialog hands one over (C4.7).
 *
 * Kept as a launcher set rather than a flag per seed row because that *is* the
 * rule the club works by, and 67 hand-written booleans is 67 chances to make
 * Valorant the one Riot title that needs no account. `Game.needsHouseAccount`
 * stays a per-title field so a future exception can be written down without
 * teaching every screen about launchers.
 */
const HOUSE_ACCOUNT_LAUNCHERS = new Set<GameLauncher>([
  'Riot',
  'Battle.net',
  'EA App',
  'Ubisoft',
  'Rockstar',
  'Xbox',
  'Square Enix',
  'Mojang',
  'BSG',
  'Gaijin',
  'Wargaming',
])

function buildGames(): Game[] {
  const rng = makeRng(777)
  return GAME_SEEDS.map(([id, name, category, rating, cover, launcher]) => ({
    id,
    name,
    category,
    rating,
    // Lifetime plays inside the club — bigger for higher-rated titles.
    players: Math.round(120 + rating * 180 + rng() * 900),
    cover,
    launcher,
    needsHouseAccount: HOUSE_ACCOUNT_LAUNCHERS.has(launcher),
  }))
}

const games: Game[] = buildGames()

/* ------------------------------------------------------------------ *
 * Game detail: requirements, the club's blurbs, and the seat verdict (C4.5)
 * ------------------------------------------------------------------ */

/**
 * Three hardware classes, and the requirement text that goes with each.
 *
 * Not 67 hand-written requirement blocks: a club catalogue really does sort into
 * "runs on anything the club owns" (the esports titles it exists for), "a current
 * mid-range card" and "the heavy single-player releases", and writing sixty-seven
 * of them by hand is sixty-seven chances to promise a 1060 will carry Cyberpunk.
 * The strings are the publisher's kind of prose — printed verbatim beside the
 * seat's own specs (F2.2) — and `power` is the only part the club compares
 * against a machine.
 */
const REQUIREMENT_TIERS = {
  esports: {
    power: 1,
    requirements: {
      cpu: 'Intel Core i5-9400 / AMD Ryzen 5 2600',
      gpu: 'NVIDIA GTX 1060 6GB / AMD RX 580',
      ram: '8GB',
      storageGb: 45,
    },
  },
  modern: {
    power: 2,
    requirements: {
      cpu: 'Intel Core i5-11400 / AMD Ryzen 5 3600',
      gpu: 'NVIDIA RTX 2060 / AMD RX 5700',
      ram: '16GB',
      storageGb: 90,
    },
  },
  heavy: {
    power: 3,
    requirements: {
      cpu: 'Intel Core i7-12700 / AMD Ryzen 7 5800X3D',
      gpu: 'NVIDIA RTX 3070 / AMD RX 6800',
      ram: '32GB',
      storageGb: 140,
    },
  },
} satisfies Record<string, { power: number; requirements: GameRequirements }>

type RequirementTier = keyof typeof REQUIREMENT_TIERS

/**
 * The genre a title belongs to is the club's first guess at what it asks of the
 * machine — a MOBA is built to run on an office PC, a modern RPG is not.
 */
const TIER_BY_CATEGORY: Record<GameCategory, RequirementTier> = {
  MOBA: 'esports',
  Sports: 'esports',
  Shooter: 'modern',
  'Battle Royale': 'modern',
  Strategy: 'modern',
  MMO: 'modern',
  Racing: 'heavy',
  RPG: 'heavy',
}

/**
 * The titles whose genre lies about their hardware appetite.
 *
 * Both directions matter: Minecraft and GTA Online are `RPG` rows that run on
 * anything, while Tarkov and the two Total War-scale releases are the reason the
 * VIP seats exist. Written per title because these are facts about the game, not
 * about the shelf it sits on.
 */
const TIER_OVERRIDES: Partial<Record<ID, RequirementTier>> = {
  cs2: 'esports',
  valorant: 'esports',
  lol: 'esports',
  dota2: 'modern',
  minecraft: 'esports',
  hearthstone: 'esports',
  rocket: 'esports',
  fallguys: 'esports',
  pokeunite: 'esports',
  albion: 'esports',
  gtaonline: 'modern',
  gtav: 'modern',
  tarkov: 'heavy',
  cyberpunk: 'heavy',
  rdr2: 'heavy',
  witcher3: 'heavy',
  starfield: 'heavy',
  bg3: 'heavy',
  elden: 'heavy',
  totalwar: 'heavy',
  cities2: 'heavy',
  assetto: 'modern',
  dune: 'heavy',
  helldivers2: 'modern',
}

/**
 * The club's own blurbs — admin-authored copy, printed as written (F2.2).
 *
 * Deliberately **partial**. The staff writes these one title at a time, and a
 * genre template stamped over the remaining rows ("A Shooter title on Steam")
 * would read as a description while carrying nothing — the panel is better off
 * saying that nobody has written one yet. `fetchGameDetail` therefore answers
 * `description: null` for anything absent here, and that is a real state rather
 * than missing data.
 */
const GAME_BLURBS: Partial<Record<ID, string>> = {
  cs2: 'The house game. Five against five, thirty seconds to plant, and the club runs the Vilnius ladder on it every Thursday.',
  valorant:
    'Tactical shooting with an agent roster on top. Ranked queues fill fastest between 18:00 and 23:00 here.',
  dota2: 'Two lanes, one river and no forgiveness. Draft takes ten minutes; the game takes forty.',
  lol: 'The MOBA everyone learned first. Quick queues, short games, and half the club can coach you through one.',
  fortnite:
    'Build, break, and be the last one standing. Zero-build queues are on for the seats without a mouse pad the size of a table.',
  apex: 'Squad battle royale with movement worth learning. Three players, one respawn beacon, no time to argue.',
  pubg: 'The original hundred-player drop. Slow, tense, and still the best game of hide-and-seek on the disks.',
  ow2: 'Hero shooter, five a side, with a role queue that keeps the tanks honest.',
  rocket: 'Football with rocket-powered cars. Nothing to learn and everything to master.',
  minecraft: 'The club keeps a shared survival world running. Ask an admin for the seed.',
  tarkov:
    'Raid in, extract with your loot, or lose all of it. The heaviest title in the hall and the one worth a VIP seat.',
  bg3: 'A hundred hours of turn-based role-playing. Saves live on your club profile, so pick up where you left off.',
  cyberpunk: 'Night City, ray tracing on, and the reason the VIP seats have 4090s.',
  elden: 'Open-world Souls. Bring a friend for co-op or suffer beautifully alone.',
  witcher3: 'Still the benchmark for a story-driven RPG, and it runs at 240 fps on the standard seats.',
  rdr2: 'The slowest, most beautiful game in the library. Sit down for three hours or do not sit down at all.',
  gtav: 'The story mode, offline and complete. Online is a separate row on this shelf.',
  gtaonline: 'Heists, cars and chaos with whoever else in the club is online.',
  warzone: 'Free-to-play battle royale on the Call of Duty engine. Fast lobbies, faster deaths.',
  r6: 'Breach walls, hold sites, and lose to a drone you never saw. The club runs 5v5 nights on it.',
  bo6: 'Six-a-side arena Call of Duty, the club default for a twenty-minute visit.',
  helldivers2: 'Co-op against the bugs, four players, friendly fire always on.',
  marvelrivals: 'Hero shooter with destructible cover and a roster everyone already knows.',
  thefinals: 'A game show where the level falls down. Loud, fast and best in a trio.',
  dbd: 'Four survivors, one killer, and a generator that never finishes in time.',
  lostark: 'Isometric MMO with a raid calendar. The club keeps the launcher patched.',
  wowr: 'Twenty years deep and still filling seats. Bring your own account for the characters.',
  ffxiv: 'The story-first MMO. Free trial covers more hours than a night pass does.',
  civ7: 'One more turn. The club closes at 02:00 and this title does not care.',
  aoe4: 'Real-time strategy the club plays 2v2 on Fridays.',
  f124: 'Official Formula 1, with the wheel rigs on seats A1 and A2.',
  forza: 'Open-world racing in Mexico, and the easiest game here to hand a first-timer.',
  fifa25: 'Football on the couch seats. Two controllers per console station.',
  diablo4: 'Season grind, shared world, and a stash that follows your account.',
  pathofexile2: 'The deepest loot game on the shelf. Ask before you respec.',
  stellaris: 'Grand strategy in space. Bring patience and a bar order.',
  frostpunk2: 'City-building where the wrong law costs you the city.',
  palworld: 'Survival crafting with creatures that carry guns. Co-op up to four.',
  deadlock: 'Third-person MOBA shooter, six a side, still in test — patches land weekly.',
}

/**
 * How much machine a seat actually has, on the same 1–3 scale as the tiers.
 *
 * Read off the GPU string because that is the field the club fills in when it
 * builds a seat, and every value in `SPECS` is one of the club's own four
 * configurations — so the match is exact rather than a guess at parsing. A seat
 * whose card is not on the list is treated as `modern`: the honest default for
 * hardware nobody has classified is "it runs the shelf", not "it runs nothing".
 */
function seatPower(specs: MachineSpecs): number {
  if (specs.gpu.includes('4090') || specs.gpu.includes('4080')) return 3
  // The standard seats' 4070, the console block, and anything the club has not
  // classified. One branch, because "it runs the shelf" is the honest default and
  // a third rung nobody's hardware falls into would just be dead code.
  return 2
}

/** The requirement tier of a title: genre, unless the title says otherwise. */
function requirementTier(game: Game): RequirementTier {
  return TIER_OVERRIDES[game.id] ?? TIER_BY_CATEGORY[game.category]
}

/**
 * Requirements, the club's blurb and the verdict for one seat (C4.5).
 *
 * The comparison lives here and not in the panel for the reason written on
 * `GameDetail.fit`: the requirement rows are prose, and only the club knows what
 * it put in each machine.
 */
export function getGameRequirements(game: Game): {
  requirements: GameRequirements
  description: string | null
  power: number
} {
  const tier = REQUIREMENT_TIERS[requirementTier(game)]
  return {
    requirements: tier.requirements,
    description: GAME_BLURBS[game.id] ?? null,
    power: tier.power,
  }
}

/** `above` / `meets` / `below` — the seat against the title. */
export function getStationFit(game: Game, specs: MachineSpecs): StationFit {
  const seat = seatPower(specs)
  const needed = getGameRequirements(game).power
  if (seat > needed) return 'above'
  if (seat === needed) return 'meets'
  return 'below'
}

/**
 * "New at the club" — the curated novelty shelf behind the hero's third kind of
 * slide (C3.9).
 *
 * Catalogue data, not session state: the staff edits the shelf in admin and a demo
 * run never mutates it, so like `promos` it is deliberately absent from
 * `lib/mock/persist.ts`.
 *
 * Deliberately *not* the club's headline titles: the hero would otherwise spend
 * two of its slides on the same game — a campaign the club is running tonight and
 * its newest arrival are different editorial claims, and a shelf that repeated the
 * front page would say nothing new. `note` is the club's own line, printed as
 * written.
 */
const GAME_RELEASES: GameRelease[] = [
  { gameId: 'pathofexile2', addedAt: atDays(-2), note: 'Installed on every seat in the Main Hall' },
  { gameId: 'helldivers2', addedAt: atDays(-6), note: 'Four-seat squads — book the corner pod' },
  { gameId: 'frostpunk2', addedAt: atDays(-11), note: 'New on the two VIP machines' },
]

const houseAccounts: HouseAccount[] = [
  { id: 'house-1', label: 'House Account #1', status: 'available' },
  { id: 'house-2', label: 'House Account #2', status: 'in-use' },
  { id: 'personal', label: 'Personal Steam Account', status: 'available', linkedUser: 'demo_player_steam' },
]

/* ------------------------------------------------------------------ *
 * Bar, kitchen and merch catalogue
 * ------------------------------------------------------------------ */

function product(
  id: string,
  name: string,
  category: ProductCategory,
  priceCents: Cents,
  description: string,
  extra: { tag?: string; stock?: number } = {},
): Product {
  const stock = extra.stock ?? 24
  return {
    id,
    clubId: CLUB_ID,
    name,
    category,
    priceCents,
    description,
    tag: extra.tag,
    stock,
    inStock: stock > 0,
    // `scripts/optimize-products.mjs` writes one WebP per id (F7.2). A
    // membership is a product row with nothing to photograph, so it gets no
    // path at all rather than one that would 404 on every render.
    image: category === 'membership' ? '' : `/products/${id}.webp`,
  }
}

const products: Product[] = [
  // drinks
  product('drink-energy-red', 'Red Bull 250ml', 'drinks', 250, 'Ice-cold classic boost', { tag: 'Popular' }),
  product('drink-energy-monster', 'Monster Energy 500ml', 'drinks', 320, 'Big can, big session'),
  product('drink-cola', 'Coca-Cola 500ml', 'drinks', 220, 'Chilled bottle'),
  product('drink-cola-zero', 'Coca-Cola Zero 500ml', 'drinks', 220, 'No sugar'),
  product('drink-water', 'Still Water 500ml', 'drinks', 120, 'Because hydration wins games'),
  product('drink-sparkling', 'Sparkling Water 500ml', 'drinks', 140, 'Lightly carbonated'),
  product('drink-iced-tea', 'Iced Tea Peach 500ml', 'drinks', 200, 'Sweet and cold'),
  product('drink-juice', 'Orange Juice 330ml', 'drinks', 230, 'Freshly pressed'),
  // coffee
  product('coffee-espresso', 'Espresso', 'coffee', 160, 'Double shot, no mercy'),
  product('coffee-americano', 'Americano', 'coffee', 190, 'Long black'),
  product('coffee-latte', 'Latte', 'coffee', 250, 'Smooth and milky'),
  product('coffee-cappuccino', 'Cappuccino', 'coffee', 250, 'Classic foam'),
  product('coffee-iced', 'Iced Latte', 'coffee', 280, 'Cold brew over ice', { tag: 'New' }),
  // snacks
  product('snack-chips-paprika', 'Chips Paprika', 'snacks', 180, 'Crunchy, shareable'),
  product('snack-chips-salt', 'Chips Salted', 'snacks', 180, 'The neutral pick'),
  product('snack-nachos', 'Nachos & Cheese', 'snacks', 390, 'Warm cheese dip'),
  product('snack-popcorn', 'Salted Popcorn', 'snacks', 200, 'Light and salty'),
  product('snack-chocolate', 'Chocolate Bar', 'snacks', 150, 'Quick sugar'),
  product('snack-protein', 'Protein Bar', 'snacks', 260, '20g protein'),
  product('snack-peanuts', 'Salted Peanuts', 'snacks', 170, 'One-hand friendly'),
  // food
  product('food-pizza-margarita', 'Pizza Margherita', 'food', 790, '25cm, stone-baked'),
  product('food-pizza-pepperoni', 'Pizza Pepperoni', 'food', 890, '25cm, extra spicy', { tag: 'Popular' }),
  product('food-burger', 'Classic Burger', 'food', 720, 'Beef, cheddar, pickles'),
  product('food-chicken-burger', 'Crispy Chicken Burger', 'food', 690, 'Fried chicken, slaw'),
  product('food-fries', 'French Fries', 'food', 320, 'Salted, with ketchup'),
  product('food-wings', 'Chicken Wings x6', 'food', 590, 'BBQ glaze', { stock: 12 }),
  // combos
  product('combo-solo', 'Solo Combo', 'combo', 990, 'Burger + fries + cola', { tag: 'Save 15%' }),
  product('combo-duo', 'Duo Combo', 'combo', 1790, '2 pizzas + 2 energy drinks'),
  product('combo-squad', 'Squad Combo', 'combo', 3490, '5 burgers + 5 drinks + 2 fries'),
  product('combo-night', 'Night Owl Combo', 'combo', 850, 'Coffee + protein bar + water'),
  // merch
  product('merch-tshirt', 'IMBA T-Shirt', 'merch', 2200, 'Official club merch', { stock: 8 }),
  product('merch-hoodie', 'IMBA Hoodie', 'merch', 4500, 'Heavy cotton, red logo', { stock: 5 }),
  product('merch-mousepad', 'IMBA Mousepad XL', 'merch', 1800, 'XL cloth surface', { stock: 14 }),
  product('merch-cap', 'IMBA Cap', 'merch', 1600, 'Snapback, red logo', { stock: 9 }),
  product('merch-bottle', 'IMBA Water Bottle', 'merch', 1400, '750ml stainless steel', { stock: 11 }),
  product('merch-sticker', 'Sticker Pack', 'merch', 400, '8 vinyl stickers'),
  // memberships are products too — they just do not consume stock
  product('mem-bronze', 'Bronze Membership', 'membership', 1500, '10% off gaming time', { stock: 999 }),
  product('mem-silver', 'Silver Membership', 'membership', 2500, '20% off + priority seats', { stock: 999 }),
  product('mem-gold', 'Gold Membership', 'membership', 4000, '35% off + VIP zone + 2x coins', {
    tag: 'Best Value',
    stock: 999,
  }),
]

/* ------------------------------------------------------------------ *
 * Passes
 * ------------------------------------------------------------------ */

function pass(
  id: string,
  name: string,
  hours: number,
  priceCents: Cents,
  overrides: Partial<Pass> = {},
): Pass {
  return {
    id,
    clubId: CLUB_ID,
    name,
    hours,
    bonusMinutes: 0,
    priceCents,
    zoneScope: [],
    timeWindow: null,
    unlimitedInWindow: false,
    validDays: [],
    coinsReward: hours * 20,
    visibleTo: 'everyone',
    active: true,
    ...overrides,
  }
}

const passes: Pass[] = [
  pass('pass-1h', '1 Hour', 1, 300),
  pass('pass-3h', '3 Hours', 3, 800, { bonusMinutes: 15 }),
  pass('pass-5h', '5 Hours', 5, 1200, { bonusMinutes: 30, coinsReward: 150 }),
  pass('pass-night', 'Night Pass', 10, 1000, {
    timeWindow: { from: '22:00', to: '08:00' },
    unlimitedInWindow: true,
    coinsReward: 250,
  }),
  pass('pass-weekend', 'Weekend Day Pass', 8, 1800, {
    validDays: [6, 7],
    coinsReward: 300,
  }),
  pass('pass-vip-3h', 'VIP 3 Hours', 3, 1400, {
    zoneScope: ['vip'],
    bonusMinutes: 20,
    coinsReward: 200,
  }),
  pass('pass-ps5-2h', 'PS5 2 Hours', 2, 900, { zoneScope: ['ps5'] }),
  pass('pass-staff-test', 'Staff Test Pass', 1, 0, { visibleTo: 'staff', coinsReward: 0 }),
]

/* ------------------------------------------------------------------ *
 * 12 demo players
 * ------------------------------------------------------------------ */

/** Lifetime + season stats the API computes server-side. */
export interface PlayerStats {
  totalHours: number
  gamesPlayed: number
  sessions: number
  /** Hours inside the active season — the leaderboard's default ranking (C3.10). */
  seasonHours: number
  seasonCoins: Coins
  /**
   * Matches won inside the active season — the leaderboard's third ranking
   * (C3.10). Authored as its own number rather than derived from `gamesPlayed`:
   * "played" and "won" are different facts about an evening, and a board that
   * multiplied one by a guessed win-rate would rank players by a constant.
   */
  seasonWins: number
  achievementsUnlocked: number
  /**
   * Consecutive visit days, today included (C3.1). Optional because only the
   * signed-in member's streak is ever rendered — the leaderboard ranks by season
   * hours, so authoring twelve streaks nobody reads would be twelve numbers that
   * can silently drift out of step with the sessions around them.
   */
  visitStreak?: number
}

/** A demo account bundled with everything the UI needs about it. */
export interface DemoPlayer {
  user: User
  wallet: Wallet
  stats: PlayerStats
  online: boolean
  machineId: ID | null
  playingGameId: ID | null
}

function player(
  id: string,
  nickname: string,
  level: number,
  xp: number,
  wallet: { moneyCents: Cents; coins: Coins },
  stats: PlayerStats,
  presence: { machineId?: ID; playingGameId?: ID } = {},
  overrides: Partial<User> = {},
): DemoPlayer {
  return {
    user: {
      id,
      clubId: CLUB_ID,
      nickname,
      email: `${nickname.toLowerCase()}@imba.club`,
      role: 'member',
      level,
      xp,
      createdAt: atDays(-400 + level * 3),
      ...overrides,
    },
    wallet: { userId: id, ...wallet },
    stats,
    online: Boolean(presence.machineId),
    machineId: presence.machineId ?? null,
    playingGameId: presence.playingGameId ?? null,
  }
}

/** The signed-in member for the whole demo. */
export const CURRENT_USER_ID: ID = 'u-demo'

const playersList: DemoPlayer[] = [
  player(
    CURRENT_USER_ID,
    'DemoPlayer',
    12,
    6400,
    { moneyCents: 1750, coins: 1250 },
    { totalHours: 148, gamesPlayed: 23, sessions: 94, seasonHours: 28, seasonCoins: 5432, seasonWins: 9, achievementsUnlocked: 11, visitStreak: 4 },
    { machineId: CURRENT_MACHINE_ID, playingGameId: 'cs2' },
    { email: 'demo@imba.club' },
  ),
  player(
    'u-pro',
    'ProGamer97',
    31,
    24800,
    { moneyCents: 4200, coins: 9876 },
    { totalHours: 612, gamesPlayed: 41, sessions: 302, seasonHours: 42, seasonCoins: 9876, seasonWins: 64, achievementsUnlocked: 27 },
    { machineId: 'pc-01', playingGameId: 'cs2' },
  ),
  player(
    'u-skill',
    'SkillMaster',
    28,
    21200,
    { moneyCents: 900, coins: 8765 },
    { totalHours: 540, gamesPlayed: 36, sessions: 271, seasonHours: 39, seasonCoins: 8765, seasonWins: 57, achievementsUnlocked: 24 },
    { machineId: 'pc-02', playingGameId: 'valorant' },
  ),
  player(
    'u-ninja',
    'TacticalNinja',
    25,
    18400,
    { moneyCents: 0, coins: 7654 },
    { totalHours: 470, gamesPlayed: 33, sessions: 240, seasonHours: 35, seasonCoins: 7654, seasonWins: 48, achievementsUnlocked: 22 },
    { machineId: 'pc-11', playingGameId: 'r6' },
  ),
  player(
    'u-noscope',
    'NoScopeKing',
    22,
    15600,
    { moneyCents: 2500, coins: 6543 },
    { totalHours: 398, gamesPlayed: 29, sessions: 211, seasonHours: 31, seasonCoins: 6543, seasonWins: 41, achievementsUnlocked: 19 },
    { machineId: 'pc-19', playingGameId: 'cs2' },
  ),
  player(
    'u-clutch',
    'ClutchQueen',
    20,
    13900,
    { moneyCents: 6100, coins: 4890 },
    { totalHours: 352, gamesPlayed: 27, sessions: 190, seasonHours: 25, seasonCoins: 4890, seasonWins: 44, achievementsUnlocked: 18 },
    { machineId: 'pc-24', playingGameId: 'valorant' },
  ),
  player(
    'u-aimbot',
    'AimBotAndy',
    18,
    11700,
    { moneyCents: 350, coins: 4210 },
    { totalHours: 300, gamesPlayed: 24, sessions: 172, seasonHours: 22, seasonCoins: 4210, seasonWins: 33, achievementsUnlocked: 16 },
  ),
  player(
    'u-frag',
    'FragMachine',
    17,
    10800,
    { moneyCents: 1200, coins: 3980 },
    { totalHours: 288, gamesPlayed: 22, sessions: 165, seasonHours: 20, seasonCoins: 3980, seasonWins: 29, achievementsUnlocked: 15 },
    { machineId: 'pc-27', playingGameId: 'apex' },
  ),
  player(
    'u-rush',
    'RushBravo',
    15,
    9100,
    { moneyCents: 0, coins: 3540 },
    { totalHours: 254, gamesPlayed: 20, sessions: 148, seasonHours: 18, seasonCoins: 3540, seasonWins: 22, achievementsUnlocked: 13 },
  ),
  player(
    'u-wolf',
    'SilentWolf',
    14,
    8300,
    { moneyCents: 800, coins: 3120 },
    { totalHours: 231, gamesPlayed: 19, sessions: 137, seasonHours: 16, seasonCoins: 3120, seasonWins: 26, achievementsUnlocked: 12 },
    { machineId: 'pc-33', playingGameId: 'dota2' },
  ),
  player(
    'u-maya',
    'MidLaneMaya',
    13,
    7200,
    { moneyCents: 3300, coins: 2870 },
    { totalHours: 205, gamesPlayed: 18, sessions: 126, seasonHours: 14, seasonCoins: 2870, seasonWins: 18, achievementsUnlocked: 11 },
    { machineId: 'pc-09', playingGameId: 'lol' },
  ),
  player(
    'u-smoke',
    'SmokeCriminal',
    11,
    5900,
    { moneyCents: 450, coins: 2410 },
    { totalHours: 176, gamesPlayed: 16, sessions: 108, seasonHours: 12, seasonCoins: 2410, seasonWins: 11, achievementsUnlocked: 9 },
  ),
]

const players = new Map<ID, DemoPlayer>(playersList.map((p) => [p.user.id, p]))

const userPreferences: UserPreferences[] = [
  {
    userId: CURRENT_USER_ID,
    // The demo member is a Russian speaker, so signing in switches the shell (F2.5).
    locale: 'ru',
    density: 'comfortable',
    reduceMotion: false,
    sounds: true,
    // Never taken the tour, so the demo shows what a first arrival sees (C3.12).
    // Finishing or skipping it writes the timestamp through
    // `completeOnboarding()`, and the snapshot in `persist.ts` keeps that answer
    // across a reload — the tour is a first *visit*, not a first render.
    onboardingCompletedAt: null,
    privacy: {
      showOnLeaderboard: true,
      showRealName: false,
      allowFriendRequests: true,
      allowPartyInvites: true,
    },
    overlay: {
      enabled: true,
      showFps: true,
      showPing: true,
      showClock: true,
      showTimeLeft: true,
      corner: 'tr',
    },
  },
  /**
   * One friend who has switched party invites off (C3.7).
   *
   * Without this row every seat in the seed accepts invites, and the branch where
   * the card must *not* offer a call button — because `inviteToParty` would refuse
   * it — is unreachable data. `SilentWolf` is the natural candidate: he is seated
   * in the Arena during the demo, so the state is visible rather than hypothetical.
   */
  {
    userId: 'u-wolf',
    locale: 'en',
    density: 'comfortable',
    reduceMotion: false,
    sounds: true,
    // A regular: he was shown the shell on his first evening and is not shown it
    // again. The date is inside the seed's own timeline, so it reads as history.
    onboardingCompletedAt: '2024-03-04T19:12:00.000Z',
    privacy: {
      showOnLeaderboard: true,
      showRealName: false,
      allowFriendRequests: true,
      allowPartyInvites: false,
    },
    overlay: {
      enabled: true,
      showFps: true,
      showPing: false,
      showClock: true,
      showTimeLeft: true,
      corner: 'tr',
    },
  },
]

/* ------------------------------------------------------------------ *
 * Live sessions, tabs, passes owned
 * ------------------------------------------------------------------ */

const CURRENT_SESSION_ID: ID = 'sess-demo'

const sessions: Session[] = [
  {
    id: CURRENT_SESSION_ID,
    userId: CURRENT_USER_ID,
    guestId: null,
    machineId: CURRENT_MACHINE_ID,
    // A member's visit is **prepaid** (MVP §3.2): the hours are bought at the
    // counter and burn down, and `lib/seat.ts` opens every account visit that
    // way. This row used to say `postpaid` while the comment below described a
    // remainder, and C1.10 is where the contradiction became visible — the PIN
    // unlock adopts server truth, so the launcher opened a *counting-up* tab for
    // the same visit whose paused card had just stated "01:24 left".
    billingMode: 'prepaid',
    // The remainder is being drawn from the banked pass `pp-1` below, so the HUD
    // says "TIME LEFT · PASS": nothing more will be charged when it runs out,
    // there are simply no more minutes (C2.2).
    timeSource: 'pass',
    state: 'active',
    startedAt: atMinutes(-96),
    endedAt: null,
    // 3h granted, 1h36m burnt → 1h24m left, which the snapshot below mirrors.
    secondsGranted: 3 * 3600,
    secondsUsed: 96 * 60,
    pausedSeconds: 0,
    debtSeconds: 0,
    closedBy: null,
    // The epoch every seeded row opens in, with `baseAtAnchor` equal to its own
    // `secondsUsed + debtSeconds`. A disagreement here would read as "the club has
    // already heard more than it wrote down", and the visit's first report would
    // bill the difference.
    anchorId: 'sess-demo#seed',
    baseAtAnchor: 96 * 60,
  },
  {
    id: 'sess-pro',
    userId: 'u-pro',
    guestId: null,
    machineId: 'pc-01',
    billingMode: 'prepaid',
    timeSource: 'pass',
    state: 'active',
    startedAt: atMinutes(-210),
    endedAt: null,
    secondsGranted: 5 * 3600,
    secondsUsed: 210 * 60,
    pausedSeconds: 300,
    debtSeconds: 0,
    closedBy: null,
    anchorId: 'sess-pro#seed',
    baseAtAnchor: 210 * 60,
  },
  {
    id: 'sess-maya',
    userId: 'u-maya',
    guestId: null,
    machineId: 'pc-09',
    billingMode: 'postpaid',
    // A postpaid seat has no granted minutes to have a pocket: the clock runs up
    // into the open tab, which is what the source has to say out loud.
    timeSource: 'postpaid',
    state: 'paused',
    startedAt: atMinutes(-60),
    endedAt: null,
    secondsGranted: 2 * 3600,
    secondsUsed: 45 * 60,
    pausedSeconds: 900,
    debtSeconds: 0,
    closedBy: null,
    anchorId: 'sess-maya#seed',
    baseAtAnchor: 45 * 60,
  },
  {
    id: 'sess-guest-1',
    userId: null,
    guestId: 'guest-1',
    machineId: 'pc-20',
    billingMode: 'prepaid',
    // A walk-in with granted, counting-down time is the one shape that can only
    // have come from the counter: the admin issued an hour on this seat (MVP S9),
    // and a guest owns neither a pass nor a wallet to have paid for it.
    timeSource: 'staff',
    state: 'active',
    startedAt: atMinutes(-35),
    endedAt: null,
    secondsGranted: 3600,
    secondsUsed: 35 * 60,
    pausedSeconds: 0,
    debtSeconds: 0,
    closedBy: null,
    anchorId: 'sess-guest-1#seed',
    baseAtAnchor: 35 * 60,
  },
  {
    id: 'sess-demo-prev',
    userId: CURRENT_USER_ID,
    guestId: null,
    machineId: 'pc-14',
    billingMode: 'prepaid',
    // Yesterday's five hours were paid straight off the wallet, so the history
    // row keeps a source the receipt of C2.3 can state.
    timeSource: 'wallet',
    state: 'ended',
    startedAt: atDays(-1),
    endedAt: atHours(-19),
    secondsGranted: 5 * 3600,
    secondsUsed: 5 * 3600,
    pausedSeconds: 0,
    debtSeconds: 0,
    closedBy: 'timeout',
    anchorId: 'sess-demo-prev#seed',
    baseAtAnchor: 5 * 3600,
  },
]

/**
 * Pending "move my session to this seat" asks (C1.12).
 *
 * Seeded empty, and it has to be: a request is a live negotiation between one
 * player standing at one keyboard and the admin on shift, so a fixture row would
 * be a transfer nobody asked for, waiting for an approval that would move a
 * session out from under whoever is actually sitting there.
 */
const transferRequests: TransferRequest[] = []

const CURRENT_TAB_ID: ID = 'tab-demo'

const tabs: Tab[] = [
  {
    id: CURRENT_TAB_ID,
    sessionId: CURRENT_SESSION_ID,
    status: 'open',
    // 800 (pass) + 250 (energy) + 320 (fries) = 1370
    totalCents: 1370,
    items: [
      {
        id: 'tab-item-1',
        tabId: CURRENT_TAB_ID,
        kind: 'pass',
        refId: 'pass-3h',
        label: '3 Hours',
        qty: 1,
        priceCents: 800,
      },
      {
        id: 'tab-item-2',
        tabId: CURRENT_TAB_ID,
        kind: 'product',
        refId: 'drink-energy-red',
        label: 'Red Bull 250ml',
        qty: 1,
        priceCents: 250,
      },
      {
        id: 'tab-item-3',
        tabId: CURRENT_TAB_ID,
        kind: 'product',
        refId: 'food-fries',
        label: 'French Fries',
        qty: 1,
        priceCents: 320,
      },
    ],
    settledBy: null,
    settledAt: null,
  },
]

const passPurchases: PassPurchase[] = [
  {
    id: 'pp-1',
    userId: CURRENT_USER_ID,
    passId: 'pass-3h',
    minutesTotal: 195,
    minutesLeft: 84,
    expiresAt: null,
    paidVia: 'wallet',
    staffId: null,
    createdAt: atMinutes(-96),
  },
  {
    id: 'pp-2',
    userId: CURRENT_USER_ID,
    passId: 'pass-5h',
    minutesTotal: 330,
    minutesLeft: 0,
    expiresAt: atDays(-1),
    paidVia: 'cash',
    staffId: 'staff-1',
    createdAt: atDays(-1),
  },
]

const machineSettings: MachineSettings[] = [
  {
    machineId: CURRENT_MACHINE_ID,
    sessionId: CURRENT_SESSION_ID,
    brightness: 80,
    displayMode: { width: 1920, height: 1080, refreshHz: 240 },
    audioOutId: 'out-headset',
    audioInId: 'in-headset-mic',
    appliedAt: atMinutes(-96),
  },
]

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

const orders: Order[] = [
  {
    id: 'ord-1',
    userId: CURRENT_USER_ID,
    guestId: null,
    sessionId: CURRENT_SESSION_ID,
    machineId: CURRENT_MACHINE_ID,
    items: [
      {
        orderId: 'ord-1',
        productId: 'food-fries',
        name: 'French Fries',
        qty: 1,
        priceSnapshotCents: 320,
      },
    ],
    totalCents: 320,
    paymentMethod: 'tab',
    status: 'preparing',
    createdAt: atMinutes(-8),
    etaMinutes: 6,
  },
  {
    id: 'ord-2',
    userId: CURRENT_USER_ID,
    guestId: null,
    sessionId: CURRENT_SESSION_ID,
    machineId: CURRENT_MACHINE_ID,
    items: [
      {
        orderId: 'ord-2',
        productId: 'drink-energy-red',
        name: 'Red Bull 250ml',
        qty: 1,
        priceSnapshotCents: 250,
      },
    ],
    totalCents: 250,
    paymentMethod: 'tab',
    status: 'delivered',
    createdAt: atMinutes(-72),
    etaMinutes: 0,
  },
  {
    id: 'ord-3',
    userId: 'u-pro',
    guestId: null,
    sessionId: 'sess-pro',
    machineId: 'pc-01',
    items: [
      {
        orderId: 'ord-3',
        productId: 'combo-solo',
        name: 'Solo Combo',
        qty: 1,
        priceSnapshotCents: 990,
      },
    ],
    totalCents: 990,
    paymentMethod: 'wallet',
    status: 'delivering',
    createdAt: atMinutes(-14),
    etaMinutes: 2,
  },
]

/* ------------------------------------------------------------------ *
 * Loyalty: quests, season, battle pass, rewards, achievements
 * ------------------------------------------------------------------ */

const quests: Quest[] = [
  {
    id: 'q-daily-1',
    type: 'daily',
    code: 'play_60m',
    description: 'Play 60 minutes today',
    target: 60,
    progress: 60,
    rewardCoins: 50,
    rewardXp: 100,
    completedAt: atMinutes(-36),
    claimedAt: atMinutes(-30),
    active: true,
  },
  {
    id: 'q-daily-2',
    type: 'daily',
    code: 'play_two_games',
    description: 'Launch two different games',
    target: 2,
    progress: 1,
    rewardCoins: 40,
    rewardXp: 80,
    completedAt: null,
    claimedAt: null,
    active: true,
  },
  {
    id: 'q-daily-3',
    type: 'daily',
    code: 'order_bar',
    description: 'Order anything from the bar',
    target: 1,
    progress: 1,
    rewardCoins: 30,
    rewardXp: 60,
    completedAt: atMinutes(-72),
    claimedAt: null,
    active: true,
  },
  {
    id: 'q-daily-4',
    type: 'daily',
    code: 'invite_friend',
    description: 'Play in a party with a friend',
    target: 1,
    progress: 0,
    rewardCoins: 60,
    rewardXp: 120,
    completedAt: null,
    claimedAt: null,
    active: true,
  },
  {
    id: 'q-weekly-1',
    type: 'weekly',
    code: 'play_600m',
    description: 'Play 10 hours this week',
    target: 600,
    progress: 415,
    rewardCoins: 300,
    rewardXp: 600,
    completedAt: null,
    claimedAt: null,
    active: true,
  },
  {
    id: 'q-weekly-2',
    type: 'weekly',
    code: 'visit_4_days',
    description: 'Visit the club on 4 different days',
    target: 4,
    progress: 3,
    rewardCoins: 250,
    rewardXp: 500,
    completedAt: null,
    claimedAt: null,
    active: true,
  },
  {
    id: 'q-weekly-3',
    type: 'weekly',
    code: 'tournament_entry',
    description: 'Join one tournament',
    target: 1,
    progress: 1,
    rewardCoins: 400,
    rewardXp: 800,
    completedAt: atDays(-2),
    claimedAt: atDays(-2),
    active: true,
  },
]

const SEASON_ID: ID = 'season-3'

const seasons: Season[] = [
  {
    id: SEASON_ID,
    name: 'Season 3 — Neon Rush',
    startsAt: atDays(-30),
    endsAt: atDays(30),
    levels: 50,
    paidTrack: true,
    paidPriceCents: 1500,
    active: true,
  },
  {
    id: 'season-2',
    name: 'Season 2 — Cold Boot',
    startsAt: atDays(-120),
    endsAt: atDays(-31),
    levels: 40,
    paidTrack: true,
    paidPriceCents: 1200,
    active: false,
  },
]

const userSeason: UserSeason = {
  seasonId: SEASON_ID,
  xp: 8600,
  level: 18,
  paidUnlocked: true,
  claimedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
}

/**
 * The ladder is generated rather than hand-written: 50 levels x 2 tracks is data
 * the admin panel will own anyway, and generating it guarantees no gaps.
 */
function buildBattlePass(season: Season, standing: UserSeason): BattlePassTier[] {
  const tiers: BattlePassTier[] = []

  for (let level = 1; level <= season.levels; level++) {
    const unlocked = level <= standing.level
    const claimed = standing.claimedLevels.includes(level)
    const milestone = level % 10 === 0

    // Free track: coins most levels, time every 5th, merch at every 10th.
    if (milestone) {
      tiers.push({
        seasonId: season.id,
        level,
        track: 'free',
        rewardType: 'merch',
        rewardRef: 'merch-sticker',
        rewardAmount: 1,
        label: 'Sticker Pack',
        unlocked,
        claimed,
      })
    } else if (level % 5 === 0) {
      tiers.push({
        seasonId: season.id,
        level,
        track: 'free',
        rewardType: 'time',
        rewardRef: null,
        rewardAmount: 30,
        label: '30 min free time',
        unlocked,
        claimed,
      })
    } else {
      const coins = 50 + level * 5
      tiers.push({
        seasonId: season.id,
        level,
        track: 'free',
        rewardType: 'coins',
        rewardRef: null,
        rewardAmount: coins,
        label: `${coins} coins`,
        unlocked,
        claimed,
      })
    }

    if (!season.paidTrack) continue

    // Paid track: always richer, and merch/product drops land on milestones.
    if (milestone) {
      const isBig = level % 20 === 0
      tiers.push({
        seasonId: season.id,
        level,
        track: 'paid',
        rewardType: 'merch',
        rewardRef: isBig ? 'merch-hoodie' : 'merch-tshirt',
        rewardAmount: 1,
        label: isBig ? 'IMBA Hoodie' : 'IMBA T-Shirt',
        unlocked,
        claimed: claimed && standing.paidUnlocked,
      })
    } else if (level % 5 === 0) {
      tiers.push({
        seasonId: season.id,
        level,
        track: 'paid',
        rewardType: 'product',
        rewardRef: 'drink-energy-red',
        rewardAmount: 1,
        label: 'Free energy drink',
        unlocked,
        claimed: claimed && standing.paidUnlocked,
      })
    } else if (level % 3 === 0) {
      tiers.push({
        seasonId: season.id,
        level,
        track: 'paid',
        rewardType: 'time',
        rewardRef: null,
        rewardAmount: 60,
        label: '1 hour free time',
        unlocked,
        claimed: claimed && standing.paidUnlocked,
      })
    } else {
      const coins = 120 + level * 10
      tiers.push({
        seasonId: season.id,
        level,
        track: 'paid',
        rewardType: 'coins',
        rewardRef: null,
        rewardAmount: coins,
        label: `${coins} coins`,
        unlocked,
        claimed: claimed && standing.paidUnlocked,
      })
    }
  }

  return tiers
}

const battlePassTiers: BattlePassTier[] = buildBattlePass(seasons[0], userSeason)

const rewards: Reward[] = [
  { id: 'rw-sticker', name: 'Sticker Pack', costCoins: 100, type: 'merch', stock: 40, perUserLimit: 3 },
  { id: 'rw-hour', name: 'Free Hour', costCoins: 500, type: 'time', stock: 999, perUserLimit: 5 },
  { id: 'rw-drink', name: 'Free Energy Drink', costCoins: 350, type: 'product', stock: 30, perUserLimit: 4 },
  { id: 'rw-tshirt', name: 'IMBA T-Shirt', costCoins: 1000, type: 'merch', stock: 8, perUserLimit: 1 },
  { id: 'rw-mouse', name: 'Gaming Mouse', costCoins: 5000, type: 'merch', stock: 2, perUserLimit: 1 },
  { id: 'rw-vip-night', name: 'VIP Night', costCoins: 2500, type: 'time', stock: 10, perUserLimit: 2 },
]

/** Coin ladder teased on the home screen — first four rewards, cheapest first. */
const FEATURED_REWARD_IDS: ID[] = ['rw-sticker', 'rw-drink', 'rw-hour', 'rw-tshirt']

const redemptions: Redemption[] = [
  { id: 'rd-1', userId: CURRENT_USER_ID, rewardId: 'rw-hour', status: 'collected', createdAt: atDays(-2) },
  { id: 'rd-2', userId: CURRENT_USER_ID, rewardId: 'rw-drink', status: 'ready', createdAt: atMinutes(-40) },
]

const achievements: Achievement[] = [
  { id: 'a1', name: 'First Blood', description: 'Complete your first session', condition: 'Play 1 session', icon: 'zap', unlocked: true },
  { id: 'a2', name: 'Headshot King', description: 'Top a shooter leaderboard', condition: 'Rank #1 in a shooter', icon: 'target', unlocked: true },
  { id: 'a3', name: 'Marathon', description: 'Play 5 hours in one day', condition: '5h in a day', icon: 'flame', unlocked: true },
  { id: 'a4', name: 'Big Spender', description: 'Spend 5000 coins', condition: 'Spend 5000 coins', icon: 'coins', unlocked: true },
  { id: 'a5', name: 'Night Owl', description: 'Finish a night session', condition: 'Use a Night Pass', icon: 'moon', unlocked: true },
  { id: 'a6', name: 'Regular', description: 'Play 50 sessions', condition: '50 sessions', icon: 'repeat', unlocked: true },
  { id: 'a7', name: 'Sommelier', description: 'Try 5 different bar items', condition: '5 unique products', icon: 'cup-soda', unlocked: true },
  { id: 'a8', name: 'Squad Up', description: 'Play in a party of four', condition: 'Party of 4', icon: 'users', unlocked: true },
  { id: 'a9', name: 'Explorer', description: 'Launch 20 different games', condition: '20 unique games', icon: 'compass', unlocked: true },
  { id: 'a10', name: 'Season Rider', description: 'Reach Battle Pass level 15', condition: 'BP level 15', icon: 'trending-up', unlocked: true },
  { id: 'a11', name: 'Contender', description: 'Join a tournament', condition: '1 tournament entry', icon: 'swords', unlocked: true },
  { id: 'a12', name: 'Collector', description: 'Own 3 pieces of merch', condition: 'Buy 3 merch items', icon: 'shirt', unlocked: false },
  { id: 'a13', name: 'Legend', description: 'Reach level 25', condition: 'Hit level 25', icon: 'crown', unlocked: false },
  { id: 'a14', name: 'Streak', description: 'Visit 7 days in a row', condition: '7-day streak', icon: 'calendar', unlocked: false },
  { id: 'a15', name: 'Champion', description: 'Win a tournament', condition: 'Finish 1st', icon: 'trophy', unlocked: false },
  { id: 'a16', name: 'VIP Taste', description: 'Play a session in the VIP zone', condition: '1 VIP session', icon: 'gem', unlocked: false },
]

const activity: ActivityEvent[] = [
  { id: 'e1', type: 'game', label: 'Played Counter-Strike 2', time: '2 hours ago' },
  { id: 'e2', type: 'achievement', label: 'Unlocked "Headshot King"', time: '3 hours ago' },
  { id: 'e3', type: 'purchase', label: 'Bought 3 Hours pass', time: 'Yesterday' },
  { id: 'e4', type: 'game', label: 'Played Valorant', time: 'Yesterday' },
  { id: 'e5', type: 'purchase', label: 'Redeemed 500 coins → Free Hour', time: '2 days ago' },
  { id: 'e6', type: 'achievement', label: 'Unlocked "Marathon"', time: '3 days ago' },
]

/**
 * Launch history. Feeds the "Continue" row (C3.2) and the playtime list on the
 * profile, so the demo member needs more than one visit's worth: three distinct
 * titles at three different distances (this visit / last night / three days ago)
 * so every bucket of the "last played" label is reachable on screen, plus a
 * repeat of one of them to prove the row deduplicates by title instead of
 * printing the same cover twice.
 */
const gameLaunches: GameLaunch[] = [
  {
    id: 'gl-1',
    userId: CURRENT_USER_ID,
    gameId: 'cs2',
    sessionId: CURRENT_SESSION_ID,
    startedAt: atMinutes(-90),
    endedAt: null,
  },
  {
    id: 'gl-2',
    userId: CURRENT_USER_ID,
    gameId: 'valorant',
    sessionId: 'sess-demo-prev',
    startedAt: atDays(-1),
    endedAt: atHours(-20),
  },
  // Same title as `gl-2`, one visit earlier: the row must still list Valorant
  // once, dated by this launch's *newer* sibling above.
  {
    id: 'gl-2b',
    userId: CURRENT_USER_ID,
    gameId: 'valorant',
    sessionId: 'sess-demo-prev2',
    startedAt: atDays(-4),
    endedAt: atDays(-4),
  },
  {
    id: 'gl-2c',
    userId: CURRENT_USER_ID,
    gameId: 'bg3',
    sessionId: 'sess-demo-prev2',
    startedAt: atDays(-3),
    endedAt: atDays(-3),
  },
  // Fourth title on purpose: the card asks for three, so the seed has to be able
  // to prove that the fourth is left off rather than that there is no fourth.
  {
    id: 'gl-2d',
    userId: CURRENT_USER_ID,
    gameId: 'forza',
    sessionId: 'sess-demo-prev3',
    startedAt: atDays(-6),
    endedAt: atDays(-6),
  },
  {
    id: 'gl-3',
    userId: 'u-pro',
    gameId: 'cs2',
    sessionId: 'sess-pro',
    startedAt: atMinutes(-200),
    endedAt: null,
  },
]

/* ------------------------------------------------------------------ *
 * Social
 * ------------------------------------------------------------------ */

const friendships: Friendship[] = [
  { userId: CURRENT_USER_ID, friendId: 'u-pro', status: 'accepted', createdAt: atDays(-200) },
  { userId: CURRENT_USER_ID, friendId: 'u-clutch', status: 'accepted', createdAt: atDays(-150) },
  { userId: CURRENT_USER_ID, friendId: 'u-wolf', status: 'accepted', createdAt: atDays(-90) },
  { userId: CURRENT_USER_ID, friendId: 'u-maya', status: 'accepted', createdAt: atDays(-45) },
  { userId: CURRENT_USER_ID, friendId: 'u-frag', status: 'accepted', createdAt: atDays(-20) },
  { userId: 'u-smoke', friendId: CURRENT_USER_ID, status: 'pending', createdAt: atMinutes(-25) },
  { userId: CURRENT_USER_ID, friendId: 'u-aimbot', status: 'pending', createdAt: atMinutes(-180) },
]

const parties: Party[] = [
  {
    id: 'party-1',
    ownerId: 'u-clutch',
    gameId: 'valorant',
    members: [
      { partyId: 'party-1', userId: 'u-clutch', nickname: 'ClutchQueen', state: 'joined' },
      { partyId: 'party-1', userId: 'u-maya', nickname: 'MidLaneMaya', state: 'joined' },
      { partyId: 'party-1', userId: CURRENT_USER_ID, nickname: 'DemoPlayer', state: 'invited' },
      { partyId: 'party-1', userId: 'u-frag', nickname: 'FragMachine', state: 'declined' },
    ],
    createdAt: atMinutes(-12),
  },
]

/* ------------------------------------------------------------------ *
 * Tournaments
 * ------------------------------------------------------------------ */

const tournaments: Tournament[] = [
  {
    id: 't-cs2-weekly',
    name: 'CS2 Weekly Cup',
    gameId: 'cs2',
    startsAt: atMinutes(45),
    format: 'single-elim',
    feeCents: 500,
    feeCoins: 0,
    prizes: [
      { place: 1, label: '€100 + 2000 coins', cents: 10000, coins: 2000 },
      { place: 2, label: '€50 + 1000 coins', cents: 5000, coins: 1000 },
      { place: 3, label: '500 coins', coins: 500 },
    ],
    slots: 16,
    // 12, not 13: the demo member holds no entry here (see `tournamentEntries`), so
    // the count must not include one. Four seats left is also what makes the home
    // card's "Join" reachable rather than a "No slots left" badge (C3.8).
    slotsTaken: 12,
    status: 'check-in',
  },
  {
    id: 't-valorant-night',
    name: 'Valorant Night Showdown',
    gameId: 'valorant',
    startsAt: atHours(5),
    format: 'double-elim',
    feeCents: 0,
    feeCoins: 500,
    prizes: [
      { place: 1, label: 'Gold Membership + 1500 coins', coins: 1500 },
      { place: 2, label: '750 coins', coins: 750 },
    ],
    slots: 8,
    slotsTaken: 5,
    status: 'announced',
  },
  {
    id: 't-fifa-1v1',
    name: 'FC 25 1v1 Ladder',
    gameId: 'fifa25',
    startsAt: atDays(2),
    format: 'round-robin',
    feeCents: 300,
    feeCoins: 0,
    prizes: [{ place: 1, label: 'IMBA Hoodie + 1000 coins', coins: 1000 }],
    slots: 12,
    slotsTaken: 4,
    status: 'announced',
  },
  {
    id: 't-dota-swiss',
    name: 'Dota 2 Swiss Open',
    gameId: 'dota2',
    startsAt: atMinutes(-30),
    format: 'swiss',
    feeCents: 400,
    feeCoins: 0,
    prizes: [
      { place: 1, label: '€80', cents: 8000 },
      { place: 2, label: '€40', cents: 4000 },
    ],
    slots: 16,
    slotsTaken: 16,
    status: 'running',
  },
  {
    id: 't-rocket-past',
    name: 'Rocket League Rumble',
    gameId: 'rocket',
    startsAt: atDays(-5),
    format: 'single-elim',
    feeCents: 0,
    feeCoins: 250,
    prizes: [{ place: 1, label: '1200 coins', coins: 1200 }],
    slots: 8,
    slotsTaken: 8,
    status: 'finished',
  },
]

/* ------------------------------------------------------------------ *
 * Promo campaigns (F7.3)
 *
 * Catalogue data, not session state: the club edits campaigns in admin, a demo
 * run never mutates them, so this slice is intentionally absent from
 * `lib/mock/persist.ts` — a stale banner frozen into localStorage is exactly the
 * bug that file's rule 2 exists to prevent.
 *
 * Every row that advertises something real points at it through `refType`/
 * `refId` (a tournament above, the active season, a pass) so copy and data
 * cannot drift apart, and `target` is a section id rather than a URL so
 * `resolveView` can refuse a destination the current surface cannot open.
 * `image` names a file in `public/promo/`; the art carries **no baked-in text**.
 * ------------------------------------------------------------------ */

function promo(
  id: string,
  kind: PromoKind,
  copy: { badge: string; title: string; subtitle: string },
  extra: Partial<Omit<Promo, 'id' | 'kind' | 'badge' | 'title' | 'subtitle'>> = {},
): Promo {
  return {
    id,
    kind,
    badge: copy.badge,
    title: copy.title,
    subtitle: copy.subtitle,
    image: `/promo/${id}.webp`,
    cta: null,
    target: null,
    priority: 0,
    startsAt: atDays(-2),
    endsAt: null,
    surfaces: ['home', 'attract'],
    audience: 'everyone',
    refType: null,
    refId: null,
    ...extra,
  }
}

const promos: Promo[] = [
  // Highest priority: the check-in window is closing in 45 minutes, so this is
  // the one thing worth shouting about on both screens tonight.
  promo(
    'promo-cs2-weekly',
    'tournament',
    {
      badge: 'Check-in open',
      title: 'CS2 Weekly Cup',
      subtitle: '€100 top prize · 13 of 16 seats taken · starts in 45 minutes',
    },
    {
      cta: 'Check in',
      target: 'tournaments',
      priority: 100,
      startsAt: atDays(-3),
      endsAt: atHours(3),
      audience: 'members',
      refType: 'tournament',
      refId: 't-cs2-weekly',
    },
  ),
  promo(
    'promo-double-coins',
    'sale',
    {
      badge: 'Happy hours',
      title: 'Double coins until 22:00',
      subtitle: 'Every minute of play pays twice into the season track',
    },
    {
      cta: 'View rewards',
      target: 'rewards',
      priority: 90,
      startsAt: atHours(-2),
      endsAt: atHours(3),
      // Coins are a membership perk — the walk-in guest surface has no coin
      // balance, so advertising the multiplier there would sell nothing.
      audience: 'members',
    },
  ),
  promo(
    'promo-battlepass',
    'battlepass',
    {
      badge: 'Season 3',
      title: 'Neon Rush battle pass',
      subtitle: '50 levels of rewards · 30 days left in the season',
    },
    {
      cta: 'Open the pass',
      target: 'rewards',
      priority: 80,
      startsAt: atDays(-30),
      endsAt: atDays(30),
      audience: 'members',
      refType: 'season',
      refId: SEASON_ID,
    },
  ),
  promo(
    'promo-valorant-night',
    'tournament',
    {
      badge: 'Tonight',
      title: 'Valorant Night Showdown',
      subtitle: 'Free entry with 500 coins · 3 slots left',
    },
    {
      cta: 'Join',
      target: 'tournaments',
      priority: 70,
      endsAt: atHours(5),
      audience: 'members',
      refType: 'tournament',
      refId: 't-valorant-night',
    },
  ),
  promo(
    'promo-night-pass',
    'sale',
    {
      badge: 'Night pass',
      title: 'Unlimited from 22:00 to 08:00',
      subtitle: 'One price, one seat, the whole night in the Main Hall',
    },
    {
      cta: 'Buy at the shop',
      target: 'shop',
      priority: 60,
      refType: 'pass',
      refId: 'pass-night',
    },
  ),
  // The bar's own campaign (C3.6). `surfaces: ['bar']` and nothing else: the
  // promo strip higher up the same screen reads `home`, so a row listed on both
  // would advertise one tray twice — once as a hero banner and once inside the
  // card that can put it in the basket. No art of its own (`image: ''`): the card
  // draws the promoted product's photograph, which is the thing being sold.
  //
  // The copy names no percentage. Discounts are not modelled in the cart, and
  // `quoteCart` would price the combo at its catalogue price regardless, so a
  // banner promising "−15 %" would be contradicted by the drawer one click later.
  promo(
    'promo-bar-combo',
    'sale',
    {
      badge: 'Kitchen deal',
      title: 'Solo Combo — burger, fries and a cola',
      subtitle: 'One tray, one price, brought to your seat while the kitchen is quiet',
    },
    {
      priority: 95,
      endsAt: atHours(4),
      surfaces: ['bar'],
      image: '',
      refType: 'product',
      refId: 'combo-solo',
    },
  ),
  promo(
    'promo-fifa-ladder',
    'tournament',
    {
      badge: 'Sign-ups open',
      title: 'FC 25 1v1 Ladder',
      subtitle: 'IMBA hoodie for first place · €3 entry · starts Tuesday',
    },
    {
      cta: 'Reserve a slot',
      target: 'tournaments',
      priority: 50,
      endsAt: atDays(2),
      audience: 'members',
      refType: 'tournament',
      refId: 't-fifa-1v1',
    },
  ),
  // Informational: no CTA, and attract-only. It answers a question people ask
  // the counter, which is worth screen time while nobody is seated but would
  // just be noise inside a live session.
  promo(
    'promo-vip-zone',
    'event',
    {
      badge: 'VIP zone',
      title: 'RTX 4090 seats and a door that closes',
      subtitle: 'Six seats, private room, ask the counter about the team rate',
    },
    { priority: 40, surfaces: ['attract'] },
  ),
  promo(
    'promo-birthday',
    'event',
    {
      badge: 'Parties',
      title: 'Book the arena for your birthday',
      subtitle: 'Ten seats, two hours, cake from the bar — reserve in advance',
    },
    { cta: 'Ask the staff', target: 'help', priority: 30, surfaces: ['home', 'attract'] },
  ),
]

const tournamentEntries: TournamentEntry[] = [
  // The member is deliberately **not** entered in `t-cs2-weekly`, the bracket the
  // home card is about (C3.8): that card exists for its "Join" button, and a seeded
  // entry would have made the one action the task asks for unreachable in the demo.
  // Joining lands straight in the check-in window (the bracket is already in it), so
  // the full chain register → check in → checked in is one click apiece from the seed
  // as shipped. `slotsTaken` on the tournament is 12 to match.
  { tournamentId: 't-cs2-weekly', userId: 'u-pro', teamId: null, checkedIn: true, seed: 1 },
  { tournamentId: 't-cs2-weekly', userId: 'u-noscope', teamId: null, checkedIn: true, seed: 4 },
  { tournamentId: 't-dota-swiss', userId: 'u-wolf', teamId: null, checkedIn: true, seed: 6 },
  { tournamentId: 't-rocket-past', userId: CURRENT_USER_ID, teamId: null, checkedIn: true, seed: 5 },
]

/* ------------------------------------------------------------------ *
 * Bookings
 * ------------------------------------------------------------------ */

const bookings: Booking[] = [
  {
    id: 'bk-1',
    userId: CURRENT_USER_ID,
    machineId: 'pc-06',
    zoneId: 'zone-main',
    startsAt: atDays(1),
    endsAt: new Date(NOW_MS + DAY + 3 * HOUR).toISOString(),
    status: 'confirmed',
    prepaidCents: 800,
    createdAt: atHours(-6),
  },
  {
    id: 'bk-2',
    userId: CURRENT_USER_ID,
    machineId: null,
    zoneId: 'zone-vip',
    startsAt: atDays(4),
    endsAt: new Date(NOW_MS + 4 * DAY + 2 * HOUR).toISOString(),
    status: 'pending',
    prepaidCents: 0,
    createdAt: atMinutes(-90),
  },
  {
    id: 'bk-3',
    userId: 'u-pro',
    machineId: 'pc-22',
    zoneId: 'zone-main',
    startsAt: atHours(2),
    endsAt: atHours(6),
    status: 'confirmed',
    prepaidCents: 1000,
    createdAt: atDays(-1),
  },
  /**
   * Somebody else's reservation on **this** seat, three hours out (C1.6).
   *
   * Here so the station panel's third state is real data rather than a demo
   * flag: `pc-17` is free at `db.now`, and a seat that is free now and taken
   * later is the case a plain `machines.status` cannot express. Without a row
   * like this the "booked from HH:MM" branch would only ever be reachable by
   * editing the fixture.
   */
  {
    id: 'bk-4',
    userId: 'u-noscope',
    machineId: CURRENT_MACHINE_ID,
    zoneId: 'zone-main',
    startsAt: atHours(3),
    endsAt: atHours(5),
    status: 'confirmed',
    prepaidCents: 900,
    createdAt: atHours(-3),
  },
]

/* ------------------------------------------------------------------ *
 * Help threads and notifications
 * ------------------------------------------------------------------ */

const helpThreads: HelpThread[] = [
  {
    id: 'ht-1',
    userId: CURRENT_USER_ID,
    guestId: null,
    machineId: CURRENT_MACHINE_ID,
    category: 'hardware',
    subject: 'Headset right ear is quiet',
    status: 'in-progress',
    messages: [
      {
        id: 'hm-1',
        threadId: 'ht-1',
        author: 'user',
        text: 'The right side of the headset is much quieter than the left.',
        createdAt: atMinutes(-18),
      },
      {
        id: 'hm-2',
        threadId: 'ht-1',
        author: 'staff',
        text: 'On my way with a replacement headset, one minute.',
        createdAt: atMinutes(-15),
      },
    ],
    staffId: 'staff-2',
    rating: null,
    createdAt: atMinutes(-18),
  },
  {
    id: 'ht-2',
    userId: CURRENT_USER_ID,
    guestId: null,
    machineId: 'pc-14',
    category: 'payment',
    subject: 'Pass did not appear after paying',
    status: 'resolved',
    messages: [
      {
        id: 'hm-3',
        threadId: 'ht-2',
        author: 'user',
        text: 'Paid for 5 hours but the balance did not update.',
        createdAt: atDays(-1),
      },
      {
        id: 'hm-4',
        threadId: 'ht-2',
        author: 'staff',
        text: 'Added manually, sorry about that. Enjoy the session!',
        createdAt: atDays(-1),
      },
    ],
    staffId: 'staff-1',
    rating: 5,
    createdAt: atDays(-1),
  },
]

/**
 * The inbox spans three days on purpose (C2.5): grouping by day is only visible
 * when there is more than one day, and the two actionable cards — the party
 * invite still asking and the delivered order still unrated — are what the panel
 * has to render buttons for. `n-8` is the same invite already answered, so the
 * answered shape is on screen beside the unanswered one.
 */
const notifications: Notification[] = [
  {
    id: 'n-1',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'warning',
    title: 'Time running low',
    body: 'About 1 hour 24 minutes left in your session.',
    createdAt: atMinutes(-2),
    readAt: null,
    action: null,
  },
  {
    id: 'n-6',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'info',
    title: 'Party invite',
    body: 'ClutchQueen invited you to “Friday Five Stack”.',
    createdAt: atMinutes(-4),
    readAt: null,
    action: { kind: 'party-invite', refId: 'party-1', outcome: null, rating: null },
  },
  {
    id: 'n-2',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'info',
    title: 'Order accepted',
    body: 'French Fries — ready in about 6 minutes.',
    createdAt: atMinutes(-7),
    readAt: null,
    action: null,
  },
  {
    id: 'n-3',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'critical',
    title: 'Tournament check-in open',
    body: 'CS2 Weekly Cup starts in 45 minutes. Confirm your spot.',
    createdAt: atMinutes(-10),
    readAt: null,
    action: null,
  },
  {
    id: 'n-4',
    target: 'broadcast',
    targetId: null,
    level: 'info',
    title: 'Happy hour',
    body: 'All coffee is 50% off until 21:00.',
    createdAt: atMinutes(-55),
    readAt: atMinutes(-50),
    action: null,
  },
  {
    id: 'n-7',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'success',
    title: 'Order delivered',
    body: 'Energy Drink, Chicken Wrap — how was it?',
    createdAt: atHours(-2),
    readAt: null,
    action: { kind: 'rate-order', refId: 'ord-3', outcome: null, rating: null },
  },
  {
    id: 'n-5',
    target: 'zone',
    targetId: 'zone-main',
    level: 'warning',
    title: 'Scheduled restart',
    body: 'Main Hall seats will restart at 04:00 for updates.',
    createdAt: atHours(-3),
    readAt: atHours(-3),
    action: null,
  },
  {
    id: 'n-8',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'info',
    title: 'Party invite',
    body: 'FragMachine invited you to “Ranked Grind”.',
    createdAt: atDays(-1),
    readAt: atDays(-1),
    action: { kind: 'party-invite', refId: 'party-1', outcome: 'declined', rating: null },
  },
  {
    id: 'n-9',
    target: 'user',
    targetId: CURRENT_USER_ID,
    level: 'success',
    title: 'Order delivered',
    body: 'Cheeseburger — thanks for the 5 stars.',
    createdAt: atDays(-2),
    readAt: atDays(-2),
    action: { kind: 'rate-order', refId: 'ord-1', outcome: 'rated', rating: 5 },
  },
]

/* ------------------------------------------------------------------ *
 * Ledger
 * ------------------------------------------------------------------ */

const transactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: CURRENT_USER_ID,
    type: 'topup',
    amount: 2000,
    currency: 'EUR',
    refType: 'topup',
    refId: null,
    staffId: 'staff-1',
    note: 'Cash top-up at the counter',
    createdAt: atDays(-3),
  },
  {
    id: 'tx-2',
    userId: CURRENT_USER_ID,
    type: 'spend_money',
    amount: 1200,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pass-5h',
    staffId: null,
    note: '5 Hours pass',
    createdAt: atDays(-1),
  },
  {
    id: 'tx-3',
    userId: CURRENT_USER_ID,
    type: 'time_grant',
    amount: 330 * 60,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pp-2',
    staffId: null,
    note: '5h + 30 min bonus',
    createdAt: atDays(-1),
  },
  {
    id: 'tx-4',
    userId: CURRENT_USER_ID,
    type: 'earn_coins',
    amount: 150,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pass-5h',
    staffId: null,
    note: 'Pass purchase reward',
    createdAt: atDays(-1),
  },
  {
    id: 'tx-5',
    userId: CURRENT_USER_ID,
    type: 'time_spend',
    amount: 5 * 3600,
    currency: 'EUR',
    refType: 'session',
    refId: 'sess-demo-prev',
    staffId: null,
    note: 'Session on PC #14',
    createdAt: atHours(-19),
  },
  {
    id: 'tx-6',
    userId: CURRENT_USER_ID,
    type: 'spend_coins',
    amount: 500,
    currency: 'EUR',
    refType: 'reward',
    refId: 'rw-hour',
    staffId: null,
    note: 'Redeemed Free Hour',
    createdAt: atDays(-2),
  },
  {
    id: 'tx-7',
    userId: CURRENT_USER_ID,
    type: 'earn_coins',
    amount: 50,
    currency: 'EUR',
    refType: null,
    refId: 'q-daily-1',
    staffId: null,
    note: 'Daily quest: play 60 minutes',
    createdAt: atMinutes(-30),
  },
  {
    id: 'tx-8',
    userId: CURRENT_USER_ID,
    type: 'spend_money',
    amount: 800,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pass-3h',
    staffId: null,
    note: '3 Hours pass',
    createdAt: atMinutes(-96),
  },
  {
    id: 'tx-9',
    userId: CURRENT_USER_ID,
    type: 'time_grant',
    amount: 195 * 60,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pp-1',
    staffId: null,
    note: '3h + 15 min bonus',
    createdAt: atMinutes(-96),
  },
  {
    id: 'tx-10',
    userId: CURRENT_USER_ID,
    type: 'spend_money',
    amount: 250,
    currency: 'EUR',
    refType: 'order',
    refId: 'ord-2',
    staffId: null,
    note: 'Red Bull 250ml (on tab)',
    createdAt: atMinutes(-72),
  },
  {
    id: 'tx-11',
    userId: CURRENT_USER_ID,
    type: 'spend_money',
    amount: 320,
    currency: 'EUR',
    refType: 'order',
    refId: 'ord-1',
    staffId: null,
    note: 'French Fries (on tab)',
    createdAt: atMinutes(-8),
  },
  {
    id: 'tx-12',
    userId: CURRENT_USER_ID,
    type: 'earn_coins',
    amount: 400,
    currency: 'EUR',
    refType: null,
    refId: 'q-weekly-3',
    staffId: null,
    note: 'Weekly quest: join a tournament',
    createdAt: atDays(-2),
  },
  {
    id: 'tx-13',
    userId: CURRENT_USER_ID,
    type: 'spend_coins',
    amount: 350,
    currency: 'EUR',
    refType: 'reward',
    refId: 'rw-drink',
    staffId: null,
    note: 'Redeemed Free Energy Drink',
    createdAt: atMinutes(-40),
  },
  {
    id: 'tx-14',
    userId: CURRENT_USER_ID,
    type: 'tab_settle',
    amount: 1450,
    currency: 'EUR',
    refType: 'tab',
    refId: 'tab-old-1',
    staffId: 'staff-2',
    note: 'Settled at the counter',
    createdAt: atDays(-1),
  },
  {
    id: 'tx-15',
    userId: CURRENT_USER_ID,
    type: 'debt',
    amount: 240,
    currency: 'EUR',
    refType: 'session',
    refId: 'sess-old-2',
    staffId: null,
    note: 'Overrun 12 minutes',
    createdAt: atDays(-6),
  },
  {
    id: 'tx-16',
    userId: CURRENT_USER_ID,
    type: 'topup',
    amount: 1000,
    currency: 'EUR',
    refType: 'topup',
    refId: null,
    staffId: 'staff-1',
    note: 'Cash top-up at the counter',
    createdAt: atDays(-8),
  },
  {
    id: 'tx-17',
    userId: 'u-pro',
    type: 'spend_money',
    amount: 990,
    currency: 'EUR',
    refType: 'order',
    refId: 'ord-3',
    staffId: null,
    note: 'Solo Combo',
    createdAt: atMinutes(-14),
  },
  {
    id: 'tx-18',
    userId: 'u-pro',
    type: 'earn_coins',
    amount: 250,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pass-night',
    staffId: null,
    note: 'Night Pass reward',
    createdAt: atDays(-1),
  },
  {
    id: 'tx-19',
    userId: 'u-clutch',
    type: 'topup',
    amount: 5000,
    currency: 'EUR',
    refType: 'topup',
    refId: null,
    staffId: 'staff-3',
    note: 'Card top-up',
    createdAt: atDays(-2),
  },
  {
    id: 'tx-20',
    userId: 'u-maya',
    type: 'spend_money',
    amount: 900,
    currency: 'EUR',
    refType: 'pass',
    refId: 'pass-ps5-2h',
    staffId: null,
    note: 'PS5 2 Hours',
    createdAt: atMinutes(-60),
  },
]

/* ------------------------------------------------------------------ *
 * Staff and audit log
 * ------------------------------------------------------------------ */

const staff: StaffMember[] = [
  { id: 'staff-1', clubId: CLUB_ID, nickname: 'Ruslan', role: 'manager', active: true },
  { id: 'staff-2', clubId: CLUB_ID, nickname: 'Egle', role: 'operator', active: true },
  { id: 'staff-3', clubId: CLUB_ID, nickname: 'Tomas', role: 'owner', active: true },
]

const auditLog: AuditEntry[] = [
  {
    id: 'au-1',
    actorStaffId: 'staff-1',
    action: 'pass.grant',
    targetType: 'user',
    targetId: CURRENT_USER_ID,
    payload: { passId: 'pass-5h', reason: 'payment not registered' },
    createdAt: atDays(-1),
  },
  {
    id: 'au-2',
    actorStaffId: 'staff-2',
    action: 'session.move',
    targetType: 'session',
    targetId: CURRENT_SESSION_ID,
    payload: { from: 'pc-14', to: CURRENT_MACHINE_ID },
    createdAt: atMinutes(-96),
  },
  {
    id: 'au-3',
    actorStaffId: 'staff-1',
    action: 'machine.maintenance',
    targetType: 'machine',
    targetId: 'pc-13',
    payload: { note: 'GPU fan replacement' },
    createdAt: atHours(-5),
  },
  {
    id: 'au-4',
    actorStaffId: 'staff-3',
    action: 'settings.update',
    targetType: 'settings',
    targetId: CLUB_ID,
    payload: { key: 'cardPaymentsEnabled', from: true, to: false },
    createdAt: atDays(-4),
  },
  {
    id: 'au-5',
    actorStaffId: 'staff-2',
    action: 'tab.settle',
    targetType: 'tab',
    targetId: 'tab-old-1',
    payload: { totalCents: 1450, method: 'cash' },
    createdAt: atDays(-1),
  },
]

/* ------------------------------------------------------------------ *
 * The store
 * ------------------------------------------------------------------ */

/**
 * Single mutable in-memory store. `lib/mock/api/*` (F3.4) is the only module
 * allowed to touch it; UI code always goes through the API layer so the swap to
 * a real backend is a one-line import change.
 */
export const db = {
  now: MOCK_NOW,
  club,
  clubSettings,
  zones,
  machines,
  currentMachineId: CURRENT_MACHINE_ID,
  games,
  gameReleases: GAME_RELEASES,
  houseAccounts,
  gameLaunches,
  products,
  passes,
  passPurchases,
  players,
  currentUserId: CURRENT_USER_ID,
  userPreferences,
  sessions,
  currentSessionId: CURRENT_SESSION_ID,
  transferRequests,
  tabs,
  machineSettings,
  orders,
  quests,
  seasons,
  userSeason,
  battlePassTiers,
  rewards,
  featuredRewardIds: FEATURED_REWARD_IDS,
  redemptions,
  achievements,
  activity,
  friendships,
  parties,
  tournaments,
  tournamentEntries,
  promos,
  bookings,
  helpThreads,
  notifications,
  transactions,
  staff,
  auditLog,
}

export type MockDb = typeof db

/* ------------------------------------------------------------------ *
 * Selectors
 *
 * Thin read helpers so the API layer never re-implements the same lookups.
 * Anything that needs computing (occupancy, friend lists) lives here, because
 * the real server will compute it too — the UI must not.
 * ------------------------------------------------------------------ */

export function getPlayer(userId: ID): DemoPlayer | undefined {
  return db.players.get(userId)
}

export function getCurrentPlayer(): DemoPlayer {
  const found = db.players.get(db.currentUserId)
  if (!found) throw new Error(`mock db: current user ${db.currentUserId} is missing`)
  return found
}

export function getZone(zoneId: ID): Zone | undefined {
  return db.zones.find((z) => z.id === zoneId)
}

export function getMachine(machineId: ID): Machine | undefined {
  return db.machines.find((m) => m.id === machineId)
}

export function getGame(gameId: ID): Game | undefined {
  return db.games.find((g) => g.id === gameId)
}

export function getProduct(productId: ID): Product | undefined {
  return db.products.find((p) => p.id === productId)
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return db.products.filter((p) => p.category === category)
}

/**
 * Who is in what, **in the hall**, right now (C4.4).
 *
 * Counted from the seat and not from the presence flag, exactly like the "Club
 * now" card counts friends (C3.7): a member playing the same title from home is
 * online and is not *here*, and the library promises the player somebody they
 * could actually turn around and talk to. `machineId` is that promise.
 *
 * Sparse by construction — only titles with somebody in them get a key — so the
 * caller reads `counts[id] ?? 0` and no card has to tell "nobody is in it" apart
 * from "this title is not in the answer".
 */
export function getGamePresence(): Record<ID, number> {
  const counts: Record<ID, number> = {}
  for (const player of db.players.values()) {
    if (!player.machineId || !player.playingGameId) continue
    counts[player.playingGameId] = (counts[player.playingGameId] ?? 0) + 1
  }
  return counts
}

/** Free-seat counts per zone, for the lock screen and attract mode. */
export function getZoneOccupancy() {
  return db.zones.map((zone) => {
    const seats = db.machines.filter((m) => m.zoneId === zone.id)
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      class: zone.class,
      free: seats.filter((m) => m.status === 'free').length,
      total: seats.length,
    }
  })
}

/**
 * Every member's board row, **unranked and unsorted** (C3.10).
 *
 * Rank is deliberately not assigned here: the board is ranked by whichever of
 * three columns the reader picked, and privacy hides rows *before* the numbering
 * is handed out — a row stamped with a rank in this function would be a second
 * opinion about position that the endpoint then has to overwrite. `userId` rides
 * along so `fetchLeaderboard` can check the privacy flag by identity instead of
 * matching nicknames, and is stripped before the payload leaves the API.
 *
 * `viewerId` has three states, and `null` is not the same as omitting it:
 * omitted means "the signed-in member", `null` means **nobody** — an unattended
 * kiosk, where no row may be flagged. Collapsing the two (`viewerId ?? undefined`
 * at the call site) is what would put a "You" chip on the previous member's row
 * in front of the walk-in standing at their seat.
 */
export function getLeaderboard(viewerId: ID | null = db.currentUserId) {
  return [...db.players.values()].map((p) => ({
    userId: p.user.id,
    nickname: p.user.nickname,
    level: p.user.level,
    hours: p.stats.seasonHours,
    coins: p.stats.seasonCoins,
    wins: p.stats.seasonWins,
    isCurrentUser: p.user.id === viewerId,
  }))
}

/**
 * Permissive defaults for a member with no preferences row.
 *
 * One definition, because privacy is checked in two places that must never
 * disagree: the endpoints that refuse a request (`sendFriendRequest`,
 * `inviteToParty`) and the summaries that decide whether to offer the button at
 * all (C3.7). A card that guessed "probably allowed" would render an invite that
 * the API is about to reject.
 */
export const DEFAULT_PRIVACY: PrivacySettings = {
  showOnLeaderboard: true,
  showRealName: false,
  allowFriendRequests: true,
  allowPartyInvites: true,
}

export function getPrivacy(userId: ID): PrivacySettings {
  return db.userPreferences.find((p) => p.userId === userId)?.privacy ?? DEFAULT_PRIVACY
}

/**
 * The preferences row a brand-new member starts life with (registration, C1.11).
 *
 * A member without this row is not a member with default settings — it is a
 * member the preferences endpoints (`getPreferences`, `completeOnboarding`,
 * `updateLocale`, `updatePrivacy`) throw `notFound` on, because each one does
 * `required(find(...))`. So the seed and the sign-up path have to agree that
 * *every* account owns exactly one row, and this factory is where they agree.
 *
 * `onboardingCompletedAt: null` on purpose: a first arrival has not been shown
 * the shell tour (C3.12), and the empty-home states (C3.13) are written for
 * precisely this person — the row exists, the history behind it does not yet.
 */
export function createDefaultPreferences(userId: ID): UserPreferences {
  return {
    userId,
    locale: DEFAULT_LOCALE,
    density: 'comfortable',
    reduceMotion: false,
    sounds: true,
    onboardingCompletedAt: null,
    privacy: { ...DEFAULT_PRIVACY },
    overlay: {
      enabled: true,
      showFps: true,
      showPing: true,
      showClock: true,
      showTimeLeft: true,
      corner: 'tr',
    },
  }
}

/** Accepted friends of one member, resolved to the summary the social list needs. */
export function getFriends(userId: ID = db.currentUserId): FriendSummary[] {
  const ids = db.friendships
    .filter((f) => f.status === 'accepted' && (f.userId === userId || f.friendId === userId))
    .map((f) => (f.userId === userId ? f.friendId : f.userId))

  return ids.flatMap((id) => {
    const friend = db.players.get(id)
    if (!friend) return []
    return [
      {
        userId: friend.user.id,
        nickname: friend.user.nickname,
        level: friend.user.level,
        online: friend.online,
        machineLabel: friend.machineId ? (getMachine(friend.machineId)?.label ?? null) : null,
        playingGameId: friend.playingGameId,
        // Resolved here, not by the caller: a friend can be in a title this
        // station has not installed, and a client-side lookup in the local
        // library would then print nothing at all.
        playingGameName: friend.playingGameId
          ? (getGame(friend.playingGameId)?.name ?? null)
          : null,
        acceptsPartyInvites: getPrivacy(friend.user.id).allowPartyInvites,
      },
    ]
  })
}

export function getSession(sessionId: ID): Session | undefined {
  return db.sessions.find((s) => s.id === sessionId)
}

/**
 * Opens a new accounting epoch on a visit's row.
 *
 * Called by **every** write that moves time: an extension, an admin grant or
 * correction, a pause, a resume, opening or adopting a visit — and the accepted
 * `heartbeat` itself. The point is to make the previous reading unusable: the
 * client measured its elapsed span against a deadline that no longer exists, and
 * adding it to the new `baseAtAnchor` would be time nobody played.
 *
 * `baseAtAnchor` carries **both** halves of the club's count, because the reading
 * is compared with them as one number (prepaid burns `secondsUsed`, postpaid
 * accrues `debtSeconds`, and the border between the two is crossed exactly once).
 *
 * The identifier is random rather than a counter: after an F5 a module-level
 * counter starts again, and the rotation could hand a row back an anchor it had
 * already used — which would make a straggling report from the tab's previous
 * life applicable again.
 */
export function reanchorSession(session: Session): void {
  session.anchorId = `${session.id}#${Math.random().toString(36).slice(2, 8)}`
  session.baseAtAnchor = session.secondsUsed + session.debtSeconds
}

/**
 * The visit currently holding a seat — active **or paused** — or `undefined`.
 *
 * Four endpoints ask this exact question (the holder read of C1.7, the seat
 * claim in `openSession`, the paused-visit read and the PIN unlock of C1.10),
 * and the two halves of the answer are easy to get subtly different: a paused
 * row still holds the chair, and a seat that somehow carries two live rows must
 * report the newest rather than whichever one the array happens to hold first.
 * Written once here, so no endpoint can drift into its own definition of
 * "occupied".
 */
export function getLiveSession(machineId: ID = db.currentMachineId): Session | undefined {
  return db.sessions
    .filter((s) => s.machineId === machineId && s.state !== 'ended')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]
}

export function getOpenTab(sessionId: ID): Tab | undefined {
  return db.tabs.find((t) => t.sessionId === sessionId && t.status === 'open')
}

export function getTransactions(userId: ID = db.currentUserId): Transaction[] {
  return db.transactions
    .filter((t) => t.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** Minutes left across every non-expired pass the member owns. */
export function getMinutesBanked(userId: ID = db.currentUserId): Minutes {
  return db.passPurchases
    .filter((p) => p.userId === userId)
    .reduce((sum, p) => sum + p.minutesLeft, 0)
}

export function getBattlePassTiers(track?: 'free' | 'paid'): BattlePassTier[] {
  return track ? db.battlePassTiers.filter((t) => t.track === track) : db.battlePassTiers
}

/**
 * Campaigns live *now* on one surface, highest priority first (F7.3).
 *
 * The window check uses `db.now`, not `Date.now()`, so the strip on Home and the
 * idle screen agree with every countdown in the product and server-rendered
 * markup matches the client. Audience filtering is done here rather than in the
 * component because "the guest surface must not see the coin economy" is a rule
 * about data, not about layout.
 */
export function getActivePromos(
  surface: PromoSurface,
  audience: PromoAudience = 'members',
): Promo[] {
  const now = Date.parse(db.now)
  return db.promos
    .filter((p) => {
      if (!p.surfaces.includes(surface)) return false
      if (p.audience === 'members' && audience !== 'members') return false
      if (Date.parse(p.startsAt) > now) return false
      if (p.endsAt !== null && Date.parse(p.endsAt) <= now) return false
      return true
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
}

/**
 * The novelty shelf, newest first, resolved against the catalogue (C3.9).
 *
 * A shelf row naming a title the library no longer stocks is dropped rather than
 * returned with a `null` game: "new at the club" is an invitation to press Play,
 * and a slide that cannot launch anything is not one. Ordering is the club's
 * `addedAt`, so an entry backdated in admin lands where the staff put it instead
 * of jumping to the front on save.
 */
export function getNewReleases(limit?: number): { game: Game; release: GameRelease }[] {
  const rows = db.gameReleases
    .map((release) => ({ game: db.games.find((g) => g.id === release.gameId), release }))
    .filter((row): row is { game: Game; release: GameRelease } => row.game !== undefined)
    .sort((a, b) => Date.parse(b.release.addedAt) - Date.parse(a.release.addedAt))
  return limit === undefined ? rows : rows.slice(0, limit)
}

export function getActiveSeason(): Season {
  const active = db.seasons.find((s) => s.active)
  if (!active) throw new Error('mock db: no active season')
  return active
}

/** Notifications addressed to this member, this seat, its zone, or everyone. */
export function getInbox(userId: ID = db.currentUserId, machineId: ID = db.currentMachineId) {
  const zoneId = getMachine(machineId)?.zoneId
  return db.notifications
    .filter((n) => {
      if (n.target === 'broadcast') return true
      if (n.target === 'user') return n.targetId === userId
      if (n.target === 'machine') return n.targetId === machineId
      return n.targetId === zoneId
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
