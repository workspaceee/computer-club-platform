// MOCK ONLY — removed in Stage 4 when the real API lands (F3.4).
//
// The transport every mock endpoint goes through. It exists so the UI is written
// against a *network*, not against a synchronous array: every call is async,
// takes 200–600 ms, and can be made to fail on demand.
//
// Rules for `lib/mock/api/*`:
//  1. Endpoints never touch `db` directly for writes without going through a
//     mutation here — that keeps latency and fault injection uniform.
//  2. Errors are `ApiError` with a machine-readable `code`; display copy lives in
//     the dictionaries (`errors` namespace, F2.2). The API never returns prose.
//  3. Responses are deep-cloned, so a component that mutates what it received
//     cannot corrupt the store — exactly like a real JSON response.
import { DEV_SHORTCUTS, readEndpointFault } from '@/lib/dev-flags'
import { db } from '@/lib/mock/db'
import { persistDb } from '@/lib/mock/persist'

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

/**
 * Every failure the mock API can produce. The UI maps the code to
 * `errors.<code>` in the dictionaries, so error states are localized like the
 * rest of the product and nothing has to be re-typed when the real API lands.
 */
export type ApiErrorCode =
  | 'generic'
  | 'network'
  | 'timeout'
  | 'notFound'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'invalidCredentials'
  /**
   * A one-time code was wrong, already used, or belongs to a dead challenge
   * (C1.3). Deliberately *not* `invalidCredentials`: "wrong username or
   * password" under a six-digit field sends the player back to the login form
   * to fix a password they cannot remember. Expiry is `timeout`, like the QR
   * handshake — a code that ran out is a different repair (resend) than a code
   * that was mistyped (retype).
   */
  | 'invalidCode'
  /** Too many requests in the cooldown window — the 60 s resend guard (C1.3). */
  | 'rateLimited'
  | 'sessionExpired'
  /**
   * One PC, one session (C1.12). The credentials were right and *this* chair is
   * free — the account signing in is already playing somewhere else.
   *
   * Deliberately not `conflict`: `conflict` on this endpoint means "somebody else
   * is sitting here", and the two refusals have opposite repairs. A stranger's
   * visit can only be ended by the admin's key, while your own visit on another
   * seat is yours to move — so the screen offers a transfer instead of sending
   * you to the counter, and it can only tell them apart by the code.
   */
  | 'activeElsewhere'
  | 'insufficientFunds'
  | 'insufficientCoins'
  | 'outOfStock'
  | 'creditLimit'

/** HTTP status the real endpoint will answer with — kept so the contract in
 * `docs/API-CONTRACT.md` (F3.8) can be written straight off these codes. */
const STATUS: Record<ApiErrorCode, number> = {
  generic: 500,
  network: 0,
  timeout: 504,
  notFound: 404,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  validation: 422,
  invalidCredentials: 401,
  invalidCode: 401,
  rateLimited: 429,
  sessionExpired: 410,
  activeElsewhere: 409,
  insufficientFunds: 402,
  insufficientCoins: 402,
  outOfStock: 409,
  creditLimit: 402,
}

/**
 * Machine-readable detail attached to a refusal.
 *
 * Scalars only, and on purpose: this is the JSON body of an error response, so it
 * has to survive `structuredClone` and a real `fetch` unchanged. It is *not* a
 * place for prose — the sentence still comes from the dictionaries (rule 2
 * above), and these are the ids and labels that get interpolated into it.
 */
export type ApiErrorData = Record<string, string | number | boolean | null>

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  /** Field-level problems for `validation`, keyed by form field name. */
  readonly fields?: Record<string, ApiErrorCode>
  /**
   * What the screen needs in order to *name* the refusal (C1.12).
   *
   * A code alone cannot carry "your session is active on PC #05": the seat that
   * holds it is known to the server and to nothing else, and a client that
   * re-read the whole floor to find it would be guessing at the answer the
   * refusal already had.
   */
  readonly data?: ApiErrorData

  constructor(
    code: ApiErrorCode,
    fields?: Record<string, ApiErrorCode>,
    data?: ApiErrorData,
  ) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = STATUS[code]
    this.fields = fields
    this.data = data
  }
}

/** Narrowing helper so `catch` blocks stay readable. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Maps anything thrown into an `ApiError`, so a UI catch block always has a code
 * to translate and never renders a raw JS message.
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  return new ApiError('generic')
}

/* ------------------------------------------------------------------ *
 * Fault injection
 * ------------------------------------------------------------------ */

export interface FaultConfig {
  /** Fail every endpoint whose name matches, with this code. */
  always: Map<string, ApiErrorCode>
  /** Fail the *next* call to the endpoint once, then clear itself. */
  once: Map<string, ApiErrorCode>
  /** 0–1 chance that any endpoint fails with `network`. Chaos mode. */
  rate: number
  /** Multiplier on the 200–600 ms window. `0` makes tests instant. */
  latencyFactor: number
  /** Code used by `rate`-driven failures. */
  rateCode: ApiErrorCode
}

const faults: FaultConfig = {
  always: new Map(),
  once: new Map(),
  rate: 0,
  latencyFactor: 1,
  rateCode: 'network',
}

/**
 * Handle for driving error states from anywhere: a dev panel, a story, a test.
 *
 * ```ts
 * mockFaults.failNext('shop.createOrder', 'outOfStock') // one-shot
 * mockFaults.fail('session.getCurrent')                 // until cleared
 * mockFaults.setLatencyFactor(0)                         // no artificial delay
 * ```
 */
export const mockFaults = {
  /** Fail `endpoint` on every call until `clear()`. */
  fail(endpoint: string, code: ApiErrorCode = 'generic') {
    faults.always.set(endpoint, code)
  },
  /** Fail the next single call to `endpoint`. */
  failNext(endpoint: string, code: ApiErrorCode = 'generic') {
    faults.once.set(endpoint, code)
  },
  /** Fail a random share of all calls, `0`–`1`. */
  failRandomly(rate: number, code: ApiErrorCode = 'network') {
    faults.rate = Math.min(1, Math.max(0, rate))
    faults.rateCode = code
  },
  /** `0` = instant, `1` = the normal 200–600 ms, `4` = slow 3G feel. */
  setLatencyFactor(factor: number) {
    faults.latencyFactor = Math.max(0, factor)
  },
  clear(endpoint?: string) {
    if (endpoint) {
      faults.always.delete(endpoint)
      faults.once.delete(endpoint)
      return
    }
    faults.always.clear()
    faults.once.clear()
    faults.rate = 0
    faults.latencyFactor = 1
  },
  /** Snapshot for a debug panel. */
  inspect(): Readonly<{
    always: Record<string, ApiErrorCode>
    once: Record<string, ApiErrorCode>
    rate: number
    latencyFactor: number
  }> {
    return {
      always: Object.fromEntries(faults.always),
      once: Object.fromEntries(faults.once),
      rate: faults.rate,
      latencyFactor: faults.latencyFactor,
    }
  },
}

/**
 * Arms `?fail=<endpoint>[:code]` before the page's first read (C3.3).
 *
 * Module scope rather than an effect: the first `query()` can be in flight before
 * any component has mounted, and a fault that lands after it would leave the
 * screen showing data on the very load that asked to see the failure. The client
 * bundle evaluates this once, and the `window` guard keeps the server render out
 * of it — the switch describes what *this tab* asked for, not what SSR produced.
 *
 * The code is validated against `STATUS`, the one list of codes that exists, so a
 * typo falls back to `generic` instead of arming a fault whose `status` is
 * `undefined`.
 */
if (DEV_SHORTCUTS && typeof window !== 'undefined') {
  const armed = readEndpointFault()
  if (armed) {
    const code = armed.code && armed.code in STATUS ? (armed.code as ApiErrorCode) : 'generic'
    faults.always.set(armed.endpoint, code)
  }
}

/** Which fault, if any, applies to this call. Consumes one-shots. */
function nextFault(endpoint: string): ApiErrorCode | null {
  const once = faults.once.get(endpoint)
  if (once) {
    faults.once.delete(endpoint)
    return once
  }
  const always = faults.always.get(endpoint)
  if (always) return always
  if (faults.rate > 0 && Math.random() < faults.rate) return faults.rateCode
  return null
}

/* ------------------------------------------------------------------ *
 * Money and the door while the link is down (C2.12 / C2.13)
 * ------------------------------------------------------------------ */

/**
 * The writes that must not be attempted without a link to the club server.
 *
 * Every one of them either moves money or moves a deadline — the two things whose
 * outcome the player cannot verify for themselves. A charge that leaves the
 * station and is never confirmed is the worst failure this product has: the money
 * may or may not be gone, and nothing on screen can honestly say which.
 *
 * The buttons for these are already disabled by `useSalesGate()`, so reaching this
 * list means something got past the UI — a click that beat a re-render, a dialog
 * that was already open, a keyboard `Enter` on a form. That is exactly why the
 * guard is *here*, at the one choke point every write goes through, rather than
 * trusted to six `disabled` props.
 *
 * What is deliberately **absent** matters as much as what is present:
 * `catalog.launchGame` and `support.callStaff` are not in it. A player with a dead
 * link must still be able to start a game and reach a human — those are the two
 * things an outage must never take away, and both are safe to retry or to honour
 * late.
 */
const OFFLINE_BLOCKED: ReadonlySet<string> = new Set([
  // The till.
  'shop.checkoutCart',
  'shop.createOrder',
  'shop.purchasePass',
  'shop.settleTab',
  'shop.topUpWallet',
  // The clock. Banked minutes are still the club's to grant, and a deadline the
  // server never acknowledged is a minute the player would wrongly believe in.
  'session.extendSession',
  // Loyalty spends a balance the server owns, same as a card would.
  'loyalty.redeemReward',
  'loyalty.unlockPaidTrack',
  /**
   * C4.7/C4.8 — handing over a club ("house") game account. The endpoint does not
   * exist in `lib/mock/api/catalog.ts` yet; the name is reserved here so the rule
   * is decided once, in the file that owns the rule, rather than rediscovered when
   * the feature lands. A set entry for a missing endpoint is inert.
   *
   * The rule, in three parts:
   *  - **Launching an installed game is not blocked.** `catalog.launchGame` stays
   *    absent from both lists: it is local, and taking it away is the last thing a
   *    stranded player needs.
   *  - **Only the *grant* is blocked.** The pool of shared logins is the club's,
   *    one seat at a time, and lending one out without the server's yes is how two
   *    stations end up in the same account.
   *  - **A grant already made survives the outage.** An account stays attached to
   *    the visit that has it; nothing here revokes one. Which is why *releasing* an
   *    account must never join this list — a release frees a club resource and is
   *    safe to honour late, exactly like `auth.logout` on the door side.
   * Copy is reserved as `games.houseAccountOffline*`; the UI branch is C4.7/C4.8.
   */
  'catalog.grantHouseAccount',
])

/**
 * The writes that open a *visit* — refused without a link to the club (C2.13).
 *
 * The same shape of rule as the till above, for the same reason, one step
 * earlier: admission is a fact only the club can establish. A station that let
 * somebody in on its own would be inventing three things it cannot know — that
 * the credentials are real, that this account is not already playing on another
 * machine (C1.12), and that the seat is this arrival's to take (C1.7). Every one
 * of those is a server answer, and a local "yes" to any of them opens a visit
 * whose clock, tab and identity the club never agreed to.
 *
 * So the door is closed rather than optimistic. `useEntryGate()` already replaces
 * the form with a panel that says so, which means reaching this list is the same
 * backstop `OFFLINE_BLOCKED` is: an `Enter` on a form that was already open, a
 * click that beat a re-render, a QR ticket that arrived a frame late.
 *
 * Reads are **not** here and must not be. `auth.fetchPausedVisit`,
 * `auth.checkNickname` and `auth.requestQrChallenge` fail on their own terms when
 * the link is really down, and blocking them up front would only replace an
 * honest timeout with a refusal that pretends to know more.
 *
 * `auth.unlockWithPin` is in the list, and it is the entry that took the most
 * arguing. The visit is parked on *this* station and the four digits look like a
 * local secret, so a station could plausibly check them itself — but the PIN
 * proves who is typing, not how much time the club still owes them, and the
 * remainder is exactly what an unlock adopts (`applySnapshot`). Unlocking offline
 * would resume a visit against the client's banked seconds, which is the bug
 * C1.10 was written to kill. Better a closed door for two minutes than a visit
 * running on a clock nobody agreed to.
 *
 * `auth.logout` is deliberately absent: leaving is not admission, and a player
 * who wants their account off a public machine must never be told to wait for
 * the network.
 */
const OFFLINE_ENTRY_BLOCKED: ReadonlySet<string> = new Set([
  // The three doors of C1.2.
  'auth.login',
  'auth.continueAsGuest',
  'auth.completeRegistration',
  // The repair path ends signed in (C1.3), so it is a door too.
  'auth.completePasswordReset',
  // The phone confirmed; the club still has to hand over the session (C1.5).
  'auth.confirmQrChallenge',
  // Resuming a paused visit adopts the club's remainder (C1.10) — see above.
  'auth.unlockWithPin',
  // The dev shortcut is a door as well, and must fail the same way the real ones
  // do or the prototype would demo a recovery path the product does not have.
  'auth.loginAsDemo',
])

/**
 * Whether the link is down, as far as the transport is concerned.
 *
 * **Pushed in by the UI, never read from the bus here.** `lib/realtime/mock-bus.ts`
 * imports `serverTime()` from this file, so importing the bus back would be a
 * cycle. The direction is a feature rather than a workaround: the flag that gets
 * pushed is the *delayed* one the offline banner renders
 * (`OFFLINE_BANNER_DELAY_MS`), so the transport refuses a purchase during exactly
 * the window the player can see a banner explaining why — and a 300 ms blink of
 * packet loss never kills a checkout that would have gone through.
 */
let linkOffline = false

/** Called by the realtime provider whenever the banner's `offline` flag changes. */
export function setTransportOffline(offline: boolean): void {
  linkOffline = offline
}

/** Which of the two offline block-lists refused a write. */
export type RefusalKind = 'sales' | 'entry'

/**
 * Told when a write was refused before it left the station.
 *
 * A callback rather than a `toast()` call, because rule 2 of this file holds: the
 * mock API never produces prose. The UI registers a reporter that already knows
 * the language, so the sentence the player reads still comes from the dictionaries.
 *
 * `kind` is what lets it pick the right one, and it exists because the first
 * version did not have it: every refusal reported `realtime.salesRefused`, so a
 * sign-in attempted while the link was down told the player *nothing was charged*
 * — an answer about money over a door that never asked for any (C2.13).
 */
type RefusalReporter = (endpoint: string, kind: RefusalKind) => void

let reportRefusal: RefusalReporter | null = null

/** Registers the reporter. Returns the unsubscribe, for React cleanup. */
export function onPurchaseRefused(reporter: RefusalReporter): () => void {
  reportRefusal = reporter
  return () => {
    if (reportRefusal === reporter) reportRefusal = null
  }
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

/** Artificial round-trip time. The spec window is 200–600 ms (F3.4). */
const MIN_MS = 200
const MAX_MS = 600

function latency(): number {
  const ms = MIN_MS + Math.random() * (MAX_MS - MIN_MS)
  return Math.round(ms * faults.latencyFactor)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Deep clone of a response. `structuredClone` handles Map/Date/nested arrays,
 * with a JSON fallback for the odd environment that lacks it.
 */
function clone<T>(value: T): T {
  if (value === undefined || value === null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Read endpoint: waits, maybe fails, then returns a clone of what `read()`
 * produced. `read` runs *after* the delay so it observes the freshest store.
 */
export async function query<T>(endpoint: string, read: () => T): Promise<T> {
  await sleep(latency())
  const fault = nextFault(endpoint)
  if (fault) throw new ApiError(fault)
  return clone(read())
}

/**
 * Write endpoint: same latency and fault behaviour, plus persistence. The
 * mutation runs only when no fault fires, so a failed call never half-applies —
 * the closest a mock can get to a transactional endpoint.
 */
export async function mutate<T>(endpoint: string, write: () => T): Promise<T> {
  /**
   * Refused **before the round trip**, and before `write()` (C2.12).
   *
   * Order is the whole point. Rejecting up front means the store is never touched,
   * so there is no partial charge to unwind and no window in which the wallet has
   * been debited but the order has not been created — the client can promise
   * "nothing was charged" and be telling the truth. Doing this after the `sleep`
   * would also make the player watch a 600 ms spinner before being told the thing
   * was never going to happen.
   *
   * Non-purchase writes are untouched: a heartbeat, a locale change or a call to
   * staff still goes through and fails on its own terms if the link really is
   * down.
   */
  /**
   * Both lists throw the same `network` code — from the caller's point of view the
   * club is simply unreachable — but they report a different `kind`, because the
   * two sentences a player must read are not interchangeable: a refused purchase
   * needs "nothing was charged", and a refused sign-in needs "the door needs the
   * club". Sending the money line to a login form would answer a question nobody
   * asked and imply a charge that never existed.
   */
  if (linkOffline) {
    if (OFFLINE_BLOCKED.has(endpoint)) {
      reportRefusal?.(endpoint, 'sales')
      throw new ApiError('network')
    }
    if (OFFLINE_ENTRY_BLOCKED.has(endpoint)) {
      reportRefusal?.(endpoint, 'entry')
      throw new ApiError('network')
    }
  }

  await sleep(latency())
  const fault = nextFault(endpoint)
  if (fault) throw new ApiError(fault)
  const result = write()
  persistDb()
  return clone(result)
}

/**
 * Server clock, in ms. Anchored at the fixture instant `db.now` and **moving**
 * from there at the rate of real time.
 *
 * The movement is the point. `db.now` is a frozen Sunday evening so the dataset
 * is deterministic (`lib/mock/db.ts` rule 2), but a stamp that never advances is
 * not a clock — and `remainingSeconds()` (F3.7) uses `serverTime` as the instant
 * a snapshot was *produced*, subtracting how long the client has held it since.
 * Handed the same frozen stamp on every response, that correction re-subtracts
 * the whole visit: a member with 01:57 banked locked the station and came back to
 * 01:54:03, having lost exactly the time they had played. Fixture windows
 * (schedules, campaigns, tournament starts) still read `db.now` and stay put; only
 * response stamps move, which is what a real server does.
 */
export function serverNowMs(): number {
  return Date.parse(db.now) + (Date.now() - bootedAtMs)
}

/** Client instant the mock server "started", so its clock can run from `db.now`. */
const bootedAtMs = Date.now()

/**
 * Server clock. Endpoints must stamp responses with this rather than
 * `new Date()` at the call site, so the mock keeps one time source and
 * countdowns are derived from a server value (F3.7).
 */
export function serverTime(): string {
  return new Date(serverNowMs()).toISOString()
}

/** Throws `notFound` when a lookup came back empty — keeps endpoints to one line. */
export function required<T>(value: T | undefined | null, code: ApiErrorCode = 'notFound'): T {
  if (value === undefined || value === null) throw new ApiError(code)
  return value
}

/** Guard for endpoints that only make sense for the signed-in member. */
export function requireAuth(userId: string | null | undefined): string {
  if (!userId) throw new ApiError('unauthorized')
  return userId
}

/** Monotonic-ish id generator for records created during a demo run. */
let seq = 0
export function newId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
