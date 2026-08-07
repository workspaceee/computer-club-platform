// MOCK ONLY — the public face of the mock backend (F3.4).
//
// Every screen imports from `@/lib/mock/api` and nothing else: the domain
// modules under `lib/mock/api/*` are an implementation detail, and `lib/mock/db`
// is off limits to the UI entirely. When the real backend lands, this file
// becomes a thin wrapper over `fetch` and no component changes.
//
// Domains:
//   client    transport, `ApiError`, fault injection (`mockFaults`)
//   auth      sign-in, register, password recovery, guest, QR handshake
//   profile   profile, wallet, preferences, privacy
//   session   the live session: heartbeat, pause, extend, end
//   catalog   games, club, zones, seats, occupancy
//   shop      products, cart quoting, orders, tab, passes, wallet ledger
//   loyalty   coins, quests, battle pass, rewards, leaderboard
//   social    friends, requests, parties
//   events    tournaments and bookings
//   hero      the composed slides of the Home carousel (C3.9)
//   promo     marketing campaigns for the hero carousel and attract-mode
//   support   notifications and help threads
export {
  ApiError,
  isApiError,
  mockFaults,
  // C2.12. The two ends of the "no purchases while the link is down" guard: the
  // realtime provider pushes the banner's delayed `offline` flag in, and registers
  // the reporter that turns a refused purchase into a translated toast.
  onPurchaseRefused,
  serverTime,
  setTransportOffline,
  toApiError,
  type ApiErrorCode,
  type FaultConfig,
} from '@/lib/mock/api/client'

export * from '@/lib/mock/api/auth'
export * from '@/lib/mock/api/catalog'
export * from '@/lib/mock/api/events'
export * from '@/lib/mock/api/hero'
export * from '@/lib/mock/api/loyalty'
export * from '@/lib/mock/api/profile'
export * from '@/lib/mock/api/promo'
export * from '@/lib/mock/api/session'
export * from '@/lib/mock/api/shop'
export * from '@/lib/mock/api/social'
export * from '@/lib/mock/api/support'
