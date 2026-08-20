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

/**
 * Standing in an outage **with a visit running** (C2.12 / C3.3).
 *
 * The bus console already cuts the link, and for the shop that was enough. It is
 * not enough for anything that needs a *second* condition set at boot: the mock
 * db and the channel live in the tab's module instance, so a reload — the only way
 * to hand the app a `?club=…` — puts the link back up. The two states a reviewer
 * has to see together, an open club and a dead link, were therefore unreachable
 * by construction, which is exactly how they ended up in the debt list of both
 * tasks.
 *
 *   `/?link=cut`    boot with the cable out — the banner, the sales gate, the
 *                   offline line on the session card
 *   `/?link=blip`   the same, then the cable goes back in after
 *                   `LINK_BLIP_MS`, so the reconnect edge (silent resync, one
 *                   "connection restored" toast) can be watched **while the clock
 *                   is running** rather than on a login screen
 *
 * It cuts the *real* link, the same call the console's button makes — status,
 * backoff, the queued backlog and the delayed banner all behave exactly as they
 * do in the product. Nothing about the outage is faked; only the moment it starts
 * is chosen for us.
 *
 * Both boot into the outage, which is the wrong moment for every scenario about
 * *time*: offline sign-in is refused (C2.13), so a page that starts with the cable
 * out never reaches a clock. Pulling it **mid-visit** is `Ctrl+Alt+L`, and it lives
 * in `hooks/use-realtime.ts` next to the same `setLinkUp` (C2.19) — a hotkey rather
 * than a flag precisely because it has to be pressed *after* the visit exists.
 */
export type LinkOverride = 'cut' | 'blip'

/** How long `?link=blip` stays down. Past the banner delay, inside the backoff. */
export const LINK_BLIP_MS = 9_000

export function readLinkOverride(): LinkOverride | null {
  if (!DEV_SHORTCUTS || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('link')
  return value === 'cut' || value === 'blip' ? value : null
}

/**
 * Failing one endpoint on purpose (C3.3).
 *
 * Every screen that reads has an error branch, and a reviewer has no way to reach
 * one: the mock never fails on its own, and `mockFaults` is a module handle with
 * no UI. So the switch names the endpoint, and the transport arms it before the
 * first read of the page:
 *
 *   `/?fail=session.fetchSessionDetail`           → `generic`
 *   `/?fail=session.fetchSessionDetail:timeout`   → any `ApiErrorCode`
 *
 * The endpoint string is the one `query()` / `mutate()` is called with, so the
 * switch needs no registry to keep in sync — an endpoint that no longer exists
 * simply never matches. The code is validated by the transport, which is the file
 * that owns the list.
 */
export interface EndpointFault {
  endpoint: string
  /** Unvalidated here on purpose — `client.ts` owns the code list. */
  code: string | null
}

export function readEndpointFault(): EndpointFault | null {
  if (!DEV_SHORTCUTS || typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('fail')
  if (!value) return null
  const [endpoint, code] = value.split(':')
  if (!endpoint) return null
  return { endpoint, code: code ?? null }
}

/**
 * Booting into a paused seat, with the launcher left readable (C3.3).
 *
 * An admin pause is the only state in the product that stops the clock with the
 * launcher still mounted, and it deliberately covers the launcher with a scrim
 * nothing dismisses (C2.7) — so the one line the session card prints about a
 * stopped clock cannot be looked at while the state that prints it is in force.
 *
 *   `/?seat=pause`   sign in, then the seat is paused for you, scrim lifted
 *
 * The console's own "Pause seat" was not a way to reach this and could not be
 * made into one. `/dev/bus` is a different route: the pause it raises lands
 * *before* anybody has signed in, so the station answers it the way it should —
 * `SessionPaused` on the lock screen, PIN to come back — and the PIN then
 * resumes the visit. Coming back the other way is no better: nothing in the
 * launcher links to the console, browser history does not re-render the route,
 * and a reload drops both the sign-in and any module state a peek was armed in.
 * So the switch had to be something the *launcher* reads once it is already up,
 * which is what this is.
 *
 * The pause itself is the product's own: the dev hook calls the same
 * `admin-sim.pauseSession()` the console button calls, the frame travels the real
 * bus, `SessionManager` adopts the snapshot, the clock stops. The only thing this
 * changes is that `SessionPauseOverlay` stands aside, because the whole point is
 * to read the launcher *underneath* — and the console still raises a pause with
 * the scrim on, which is the path that proves the overlay works.
 */
export type SeatOverride = 'pause'

export function readSeatOverride(): SeatOverride | null {
  if (!DEV_SHORTCUTS || typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('seat') === 'pause' ? 'pause' : null
}

/**
 * Whether the blocking pause overlay should step aside for the switch above.
 *
 * Module state rather than a second query parameter: it is armed by the same hook
 * that raises the pause, and the two must not be able to disagree. The console
 * disarms it around its own pause/resume buttons, so a peek left over from a
 * `?seat=pause` boot cannot quietly turn a later staff pause into a scrim-less
 * one — that would be a build lying about which overlays it shows.
 */
let scrimPeek = false

export function setScrimPeek(on: boolean): void {
  scrimPeek = DEV_SHORTCUTS && on
}

/** Read by the overlays that would otherwise cover the screen under review. */
export function scrimPeekEnabled(): boolean {
  return DEV_SHORTCUTS && scrimPeek
}
