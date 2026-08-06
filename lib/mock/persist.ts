// MOCK ONLY — deleted in Stage 4 together with `lib/mock/*` (F3.5).
//
// Keeps the mock store alive across page reloads so a demo survives an F5: buy a
// pass, reload, the pass is still there. The real backend makes this file
// meaningless, which is exactly why it is isolated here and touched by nothing
// except `lib/mock/api/client.ts`.
//
// Design constraints that matter:
//  1. **Never restore during render.** Rehydration happens from an effect on the
//     client only. If the server rendered from `MOCK_NOW` and the client
//     rendered from localStorage, React would report a hydration mismatch.
//  2. **Only mutable slices are stored.** The catalogue (games, products,
//     passes, zones) is code, not state — persisting it would freeze a stale
//     copy into every browser that ever opened the demo.
//  3. **Versioned.** Any edit to the dataset shape bumps `SCHEMA_VERSION` and
//     old snapshots are dropped instead of half-loaded.
import { db, type DemoPlayer } from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'

const STORAGE_KEY = 'imba.mock.state'

/**
 * Bump whenever the shape of `Snapshot` or any persisted slice changes — and
 * also when a **seed row** is added to a persisted slice, which is why this is
 * `2`: `bookings` carries the reservation the station panel reads (C1.6), and a
 * v1 snapshot would keep restoring the old list over it, so the new state would
 * be invisible in every browser that had ever opened the demo.
 *
 * `3` adds `transferRequests` (C1.12). A v2 snapshot has no such field, and
 * restoring it would leave the slice at whatever the last run had put in memory
 * — a pending transfer surviving a reload it was never written into.
 *
 * `4` reseeds `tournaments` and `tournamentEntries` for the home card (C3.8):
 * the nearest bracket now starts inside the demo's own evening and its taken
 * seats were re-counted against the entry list. A v3 snapshot would restore the
 * old rows over both, so the card would either count down to a start that has
 * already passed or contradict its own "slots left".
 */
const SCHEMA_VERSION = 4

/**
 * The slices a demo session can actually change. Everything else is rebuilt from
 * `db.ts` on every load.
 */
interface Snapshot {
  v: number
  savedAt: string
  now: string
  currentUserId: ID
  currentSessionId: ID
  currentMachineId: ID
  /** Players are a Map in the store; persisted as entries. */
  players: [ID, DemoPlayer][]
  machines: typeof db.machines
  sessions: typeof db.sessions
  transferRequests: typeof db.transferRequests
  tabs: typeof db.tabs
  passPurchases: typeof db.passPurchases
  orders: typeof db.orders
  transactions: typeof db.transactions
  quests: typeof db.quests
  userSeason: typeof db.userSeason
  battlePassTiers: typeof db.battlePassTiers
  redemptions: typeof db.redemptions
  achievements: typeof db.achievements
  activity: typeof db.activity
  friendships: typeof db.friendships
  parties: typeof db.parties
  tournamentEntries: typeof db.tournamentEntries
  tournaments: typeof db.tournaments
  bookings: typeof db.bookings
  helpThreads: typeof db.helpThreads
  notifications: typeof db.notifications
  userPreferences: typeof db.userPreferences
  machineSettings: typeof db.machineSettings
  houseAccounts: typeof db.houseAccounts
  gameLaunches: typeof db.gameLaunches
  auditLog: typeof db.auditLog
}

/** `true` only in a browser with a usable localStorage (private mode can throw). */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const probe = '__imba_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/** Off by default on the server, and disabled entirely once a load fails. */
let enabled = true
/** Set after a successful `restoreDb()` so writes are not saved pre-rehydration. */
let hydrated = false

function buildSnapshot(): Snapshot {
  return {
    v: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    now: db.now,
    currentUserId: db.currentUserId,
    currentSessionId: db.currentSessionId,
    currentMachineId: db.currentMachineId,
    players: [...db.players.entries()],
    machines: db.machines,
    sessions: db.sessions,
    transferRequests: db.transferRequests,
    tabs: db.tabs,
    passPurchases: db.passPurchases,
    orders: db.orders,
    transactions: db.transactions,
    quests: db.quests,
    userSeason: db.userSeason,
    battlePassTiers: db.battlePassTiers,
    redemptions: db.redemptions,
    achievements: db.achievements,
    activity: db.activity,
    friendships: db.friendships,
    parties: db.parties,
    tournamentEntries: db.tournamentEntries,
    tournaments: db.tournaments,
    bookings: db.bookings,
    helpThreads: db.helpThreads,
    notifications: db.notifications,
    userPreferences: db.userPreferences,
    machineSettings: db.machineSettings,
    houseAccounts: db.houseAccounts,
    gameLaunches: db.gameLaunches,
    auditLog: db.auditLog,
  }
}

/**
 * Writes the store to localStorage. Called by `mutate()` after every successful
 * write endpoint, so nothing in the API layer has to remember to save.
 *
 * Debounced with a microtask-free timer: a checkout that writes an order, a tab
 * item and a transaction produces one serialisation, not three.
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function persistDb(): void {
  if (!enabled || !hydrated) return
  const store = storage()
  if (!store) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(buildSnapshot()))
    } catch {
      // Quota exceeded or serialisation failure: stop trying rather than throw
      // inside a UI mutation. The demo keeps working from memory.
      enabled = false
    }
  }, 120)
}

/** Immediate, unbuffered save. Used on `pagehide`, where a timer would not fire. */
function persistNow(): void {
  if (!enabled || !hydrated) return
  const store = storage()
  if (!store) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(buildSnapshot()))
  } catch {
    enabled = false
  }
}

/** Applies one persisted slice, keeping the array identity used by `db`. */
function replaceArray<T>(target: T[], next: unknown): void {
  if (!Array.isArray(next)) return
  target.length = 0
  target.push(...(next as T[]))
}

/**
 * Restores a snapshot into the live store.
 *
 * **Client-side effect only** — calling this during render breaks hydration
 * (rule 1 above). `MockPersistenceGate` is the single caller.
 *
 * @returns `true` when a snapshot was applied.
 */
export function restoreDb(): boolean {
  const store = storage()
  hydrated = true
  if (!enabled || !store) return false

  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    enabled = false
    return false
  }
  if (!raw) return false

  let snap: Snapshot
  try {
    snap = JSON.parse(raw) as Snapshot
  } catch {
    store.removeItem(STORAGE_KEY)
    return false
  }

  // Dataset changed shape since this snapshot was written — start clean rather
  // than merge two incompatible worlds.
  if (snap.v !== SCHEMA_VERSION) {
    store.removeItem(STORAGE_KEY)
    return false
  }

  db.now = snap.now ?? db.now
  db.currentUserId = snap.currentUserId ?? db.currentUserId
  db.currentSessionId = snap.currentSessionId ?? db.currentSessionId
  db.currentMachineId = snap.currentMachineId ?? db.currentMachineId

  if (Array.isArray(snap.players)) {
    db.players.clear()
    for (const [id, player] of snap.players) db.players.set(id, player)
  }

  replaceArray(db.machines, snap.machines)
  replaceArray(db.sessions, snap.sessions)
  replaceArray(db.transferRequests, snap.transferRequests)
  replaceArray(db.tabs, snap.tabs)
  replaceArray(db.passPurchases, snap.passPurchases)
  replaceArray(db.orders, snap.orders)
  replaceArray(db.transactions, snap.transactions)
  replaceArray(db.quests, snap.quests)
  replaceArray(db.battlePassTiers, snap.battlePassTiers)
  replaceArray(db.redemptions, snap.redemptions)
  replaceArray(db.achievements, snap.achievements)
  replaceArray(db.activity, snap.activity)
  replaceArray(db.friendships, snap.friendships)
  replaceArray(db.parties, snap.parties)
  replaceArray(db.tournamentEntries, snap.tournamentEntries)
  replaceArray(db.tournaments, snap.tournaments)
  replaceArray(db.bookings, snap.bookings)
  replaceArray(db.helpThreads, snap.helpThreads)
  replaceArray(db.notifications, snap.notifications)
  replaceArray(db.userPreferences, snap.userPreferences)
  replaceArray(db.machineSettings, snap.machineSettings)
  replaceArray(db.houseAccounts, snap.houseAccounts)
  replaceArray(db.gameLaunches, snap.gameLaunches)
  replaceArray(db.auditLog, snap.auditLog)

  if (snap.userSeason) Object.assign(db.userSeason, snap.userSeason)

  return true
}

/** Drops the snapshot. The next reload starts from the pristine dataset. */
export function resetPersistedDb(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do — a failed removal just means the demo keeps its state.
  }
}

/** When the current snapshot was written, or `null` when there is none. */
export function persistedAt(): string | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as Snapshot
    return snap.v === SCHEMA_VERSION ? (snap.savedAt ?? null) : null
  } catch {
    return null
  }
}

/**
 * Saves on the way out. `pagehide` is the reliable one — `beforeunload` is
 * skipped by mobile browsers and `unload` breaks the back/forward cache.
 * Returns the detach function so the gate can clean up.
 */
export function attachPersistenceListeners(): () => void {
  if (typeof window === 'undefined') return () => {}
  const onHide = () => persistNow()
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistNow()
  })
  return () => {
    window.removeEventListener('pagehide', onHide)
  }
}
