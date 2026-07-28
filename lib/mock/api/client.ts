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
  insufficientFunds: 402,
  insufficientCoins: 402,
  outOfStock: 409,
  creditLimit: 402,
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  /** Field-level problems for `validation`, keyed by form field name. */
  readonly fields?: Record<string, ApiErrorCode>

  constructor(code: ApiErrorCode, fields?: Record<string, ApiErrorCode>) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = STATUS[code]
    this.fields = fields
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
  await sleep(latency())
  const fault = nextFault(endpoint)
  if (fault) throw new ApiError(fault)
  const result = write()
  persistDb()
  return clone(result)
}

/**
 * Server clock. Endpoints must stamp responses with this rather than
 * `new Date()` at the call site, so `db.now` stays the single time source and
 * countdowns are derived from a server value (F3.7).
 */
export function serverTime(): string {
  return db.now
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
