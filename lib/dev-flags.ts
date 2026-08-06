/**
 * Build-time flags for prototype-only affordances (C1.9).
 *
 * Some controls in this client exist to make the prototype *demonstrable*, not
 * because a player at a station would ever need them: the demo account that
 * skips the password, and the walk-in check-in that the real product hands to an
 * admin (MVP §8.1). They are shortcuts around the product, so they must not ship
 * on a machine standing in a club — but deleting them would make the prototype
 * unreviewable.
 *
 * `NODE_ENV` is the gate, the same one the `/dev/*` routes already use: it is
 * inlined by the bundler, so the branch it guards is dropped from the production
 * bundle entirely rather than merely hidden by CSS or a runtime check somebody
 * can flip in devtools.
 *
 * Not exported as a function and not read through `useState`: the value is a
 * constant for the whole build, and treating it as one keeps the server and the
 * client render in agreement (a flag that resolves after hydration would flash
 * dev-only buttons onto a production screen).
 */
export const DEV_SHORTCUTS = process.env.NODE_ENV !== 'production'

/**
 * Standing N minutes before closing on purpose (C2.11).
 *
 * The closing behaviour is the one feature in the client nobody can review by
 * waiting: the marks are 60 / 30 / 10 minutes before a time the club picked, and
 * the screen after it only exists once a day. So the switch is a **shift of the
 * clock the schedule is read against**, not a fake status — every consumer keeps
 * asking `clubHoursStatus()` the same question, and the answer is the real one
 * for a moved "now". A forced flag would prove the overlay renders and nothing
 * about whether the arithmetic that decides to show it works.
 *
 *   `/?club=close60`   sixty minutes before today's closing
 *   `/?club=close30`   thirty
 *   `/?club=close10`   ten
 *   `/?club=closed`    one minute after closing — the "Club closed" screen
 *   `/?club=open`      mid-window, when the club is plainly trading
 *
 * `open` is the counterpart the first four were missing, and it exists for the
 * same reason they do: the mock week trades `12:00 → 02:00`, so for eleven hours
 * of every day a reviewer opening the prototype is standing in a **shut** club.
 * Every money surface is then correctly refusing — the shop's "Add", the cart's
 * checkout, the extend chips on the session card — and there is no way to tell a
 * working gate from a broken button. The alternative anyone reaches for is
 * editing the schedule in `lib/mock/db.ts` and remembering to put it back (C2.11
 * did exactly that, and had to record it as a debt); this makes that edit
 * unnecessary, and unlike the edit it cannot be forgotten in the committed file.
 *
 * A query parameter rather than a control in the UI, for two reasons: the mock db
 * lives in the tab's module instance (see `/dev/bus`), so a switch that survives
 * a reload has to live in the URL; and it costs the product no dev-only widget on
 * a screen a player uses. `DEV_SHORTCUTS` still gates it, so in production the
 * branch is dropped by the bundler and `?club=closed` does nothing.
 */
export type ClubHoursOverride =
  /** Put "now" this many minutes before the next closing. */
  | { kind: 'closeIn'; minutes: number }
  /** Put "now" just past closing. */
  | { kind: 'closed' }
  /** Put "now" inside the next open window, clear of the closing marks. */
  | { kind: 'open' }

const OVERRIDES: Record<string, ClubHoursOverride> = {
  close60: { kind: 'closeIn', minutes: 60 },
  close30: { kind: 'closeIn', minutes: 30 },
  close10: { kind: 'closeIn', minutes: 10 },
  closed: { kind: 'closed' },
  open: { kind: 'open' },
}

/**
 * Reads the switch off the current URL. `null` in production, on the server, and
 * for anything that is not one of the four values above.
 *
 * Call it from an effect, never during render: the server has no `location`, so a
 * value read while rendering would be a hydration mismatch on the one screen this
 * is meant to make reviewable.
 */
export function readClubHoursOverride(): ClubHoursOverride | null {
  if (!DEV_SHORTCUTS || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('club')
  if (!value) return null
  return OVERRIDES[value] ?? null
}
