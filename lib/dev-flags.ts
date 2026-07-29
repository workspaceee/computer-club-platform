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
