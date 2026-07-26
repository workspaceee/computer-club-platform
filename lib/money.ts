/**
 * Money (F3.6).
 *
 * One rule, enforced by this module: **money is an integer number of EUR cents**
 * (`Cents` in `lib/types/common.ts`). Floats never appear in a price, a balance,
 * a tab total or a transaction — `0.1 + 0.2 !== 0.3` is not an acceptable
 * property for a system that tells a player how much they owe.
 *
 * Practical consequences:
 *  - The mock API, the store and every future real endpoint speak cents.
 *  - Euros exist only at the very edge, for display (`formatEur`) and for
 *    parsing what a human typed (`toCents`).
 *  - Arithmetic goes through `sumCents` / `mulCents` / `percentOfCents` so the
 *    rounding decision lives in one place instead of at 40 call sites.
 */
import type { Cents, Coins } from '@/lib/types/common'

/** Minor units per euro. Named so the intent survives a copy-paste. */
export const CENTS_PER_EUR = 100

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/**
 * Parses a human amount into integer cents.
 *
 * Accepts a number of euros (`12.5`) or a typed string in any form a European
 * keyboard produces: `"12.50"`, `"12,50"`, `"€12,50"`, `"1 234,50"`, `"-3.20"`.
 * Returns `0` for anything unparseable, so a form never explodes on input —
 * validation is the caller's job, not the formatter's.
 *
 * ```ts
 * toCents('12,50')  // 1250
 * toCents(9.99)     // 999
 * toCents('abc')    // 0
 * ```
 */
export function toCents(value: number | string): Cents {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    // `round` on the scaled value, not on the input: 19.99 * 100 is 1998.9999…
    return Math.round(value * CENTS_PER_EUR)
  }

  const cleaned = value
    .replace(/\s|\u00a0/g, '')
    .replace(/[€$]/g, '')
    // A comma is a decimal separator here; a dot may be either, but a European
    // thousands dot is always followed by exactly three digits.
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')

  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * CENTS_PER_EUR)
}

/**
 * Cents → euros as a float. **Display and third-party payloads only.** Never
 * store or compare the result: once it is a float it has stopped being money.
 */
export function fromCents(cents: Cents): number {
  return cents / CENTS_PER_EUR
}

/** Rounds a possibly fractional cents value back to a legal integer amount. */
export function roundCents(cents: number): Cents {
  return Math.round(cents)
}

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

/**
 * Total of any mix of amounts and arrays of amounts. Integer in, integer out.
 *
 * ```ts
 * sumCents(1250, 320)                       // 1570
 * sumCents(items.map((i) => i.totalCents))  // line items → order total
 * ```
 */
export function sumCents(...values: (Cents | Cents[] | undefined | null)[]): Cents {
  let total = 0
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) total += Math.round(item || 0)
      continue
    }
    total += Math.round(value || 0)
  }
  return total
}

/** `a - b`, kept as a named helper so debt maths reads the same everywhere. */
export function subCents(a: Cents, b: Cents): Cents {
  return Math.round(a) - Math.round(b)
}

/** Unit price × quantity. Quantity is a whole count, so this stays exact. */
export function mulCents(cents: Cents, quantity: number): Cents {
  return Math.round(cents * quantity)
}

/**
 * A percentage of an amount — discounts, VAT, tournament rake.
 * Rounds half-up to the nearest cent, which is what a till does.
 */
export function percentOfCents(cents: Cents, percent: number): Cents {
  return Math.round((cents * percent) / 100)
}

/** Applies a discount and never returns a negative price. */
export function discountCents(cents: Cents, percent: number): Cents {
  return Math.max(0, cents - percentOfCents(cents, percent))
}

/** Clamps to a range. Used for credit limits and top-up bounds. */
export function clampCents(cents: Cents, min: Cents, max: Cents): Cents {
  return Math.min(max, Math.max(min, Math.round(cents)))
}

/**
 * Splits an amount across `parts` payers without losing or inventing a cent:
 * `splitCents(1000, 3)` → `[334, 333, 333]`. Used by party bill splitting.
 */
export function splitCents(cents: Cents, parts: number): Cents[] {
  if (parts <= 0) return []
  const total = Math.round(cents)
  const base = Math.floor(total / parts)
  const remainder = total - base * parts
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0))
}

/** `true` when the wallet cannot cover the amount. One place, one rule. */
export function isAffordable(balanceCents: Cents, priceCents: Cents): boolean {
  return Math.round(balanceCents) >= Math.round(priceCents)
}

/* ------------------------------------------------------------------ *
 * Display
 * ------------------------------------------------------------------ */

export interface FormatEurOptions {
  /** `2` for exact amounts, `0` for compact chips ("€12"). */
  decimals?: 0 | 2
  /** Drop the € symbol when the column header already carries the unit. */
  symbol?: boolean
  /** Format the absolute value; the caller renders its own sign. */
  absolute?: boolean
}

/**
 * The single source of truth for money output (F1.18 / F3.6).
 *
 * Takes **cents**, like everything else in the system. `en-IE` gives "€12.50" —
 * symbol first, dot decimal — which fits the launcher's monospace clock face
 * better than the locale-native "12,50 €" form, and stays identical in all
 * three UI languages so a price is never ambiguous.
 */
export function formatEur(cents: Cents, options: FormatEurOptions = {}): string {
  const { decimals = 2, symbol = true, absolute = false } = options
  const value = fromCents(absolute ? Math.abs(Math.round(cents)) : Math.round(cents))

  return new Intl.NumberFormat('en-IE', {
    style: symbol ? 'currency' : 'decimal',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Signed amount for ledgers: `+€10.00` / `−€3.20` (real minus sign, U+2212,
 * so it aligns with digits instead of looking like a hyphen).
 */
export function formatEurSigned(cents: Cents, options: FormatEurOptions = {}): string {
  const rounded = Math.round(cents)
  const sign = rounded < 0 ? '\u2212' : rounded > 0 ? '+' : ''
  return `${sign}${formatEur(rounded, { ...options, absolute: true })}`
}

/** Loyalty coins: thousands-separated, never fractional. */
export function formatCoins(coins: Coins): string {
  return Math.round(coins).toLocaleString('en-US')
}
