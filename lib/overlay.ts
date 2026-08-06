/**
 * The stacking ladder of the shell (F6.4).
 *
 * Every fixed layer in the product picks its rung here instead of inventing a
 * `z-[97]` at the call site. That matters because stacking bugs are invisible
 * until two features are open at once: before this table the product had ten
 * independent numbers (40, 60, 60, 70, 80, 80, 90, 95, 100, 110) and two of them
 * collided — the offline banner and the modal both claimed 60, so which one won
 * depended on render order.
 *
 * The order is a product decision, not a taste one:
 *
 *   frame     the top bar and the mobile bar. The lowest fixed layer, because
 *             every overlay is allowed to cover the chrome.
 *   banner    a sustained outage outranks the chrome: it explains why the seat
 *             looks frozen, so it must not slide under the header.
 *   drawer    side panels (cart) — they cover the page but yield to dialogs.
 *   modal     dialogs that own the screen.
 *   confirm   confirmations sit *above* the dialog that raised them, otherwise
 *             "are you sure?" would be hidden behind the thing it is asking about.
 *   takeover  the last minute of the visit (C2.6). Above every dialog, because
 *             at 60 seconds nothing the player was doing matters more than the
 *             clock — but still under `toast`, so the outcome of pressing
 *             "Extend" is readable on top of the screen that offered it.
 *   toast     feedback has to be readable **while a dialog is open** — a failed
 *             launch reports into a toast while the launch dialog is still up.
 *   blocking  the end of the visit. Nothing may cover it, and it covers
 *             everything, including a half-finished checkout.
 *
 * Tooltips are deliberately not on this ladder: they are `absolute` next to
 * their trigger, so they only compete with their own siblings.
 *
 * The values are literal class strings so Tailwind sees them here.
 */
export const overlayZ = {
  frame: 'z-[40]',
  banner: 'z-[50]',
  drawer: 'z-[60]',
  modal: 'z-[70]',
  confirm: 'z-[80]',
  takeover: 'z-[85]',
  toast: 'z-[90]',
  blocking: 'z-[100]',
} as const

export type OverlayLayer = keyof typeof overlayZ

/**
 * How tall a centred dialog may grow.
 *
 * `svh`, not `vh`: on a kiosk in a browser with visible UI (and on the tablet
 * self-service surface) `vh` measures the *largest* possible viewport, so a
 * `max-h-[88vh]` card is taller than the space it actually has and its header
 * ends up under the address bar. The `2rem` is the `p-4` gutter the overlay
 * frame keeps on the short axis.
 */
export const OVERLAY_MAX_H = 'max-h-[calc(100svh-2rem)]'
