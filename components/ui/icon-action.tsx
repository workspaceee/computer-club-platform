import { cn } from '@/lib/utils'

/**
 * What the badge *counts*, never how loud it is. `primary` is a basket waiting
 * to be paid for, `danger` is the club talking to the player — the two things in
 * the bar that are allowed to ask for attention.
 */
type BadgeTone = 'primary' | 'danger'

const BADGE: Record<BadgeTone, string> = {
  primary: 'bg-primary text-primary-foreground',
  danger: 'bg-danger text-text-high',
}

interface IconActionProps extends Omit<React.ComponentProps<'button'>, 'children' | 'aria-label'> {
  /** Lucide icon element, sized 16–18 px by the caller (§5.3). */
  icon: React.ReactNode
  /**
   * The accessible name, and the whole reason this is a primitive: an icon-only
   * control has no text node to fall back on, so the name is required rather
   * than optional. Callers put the *count* in it — see `label` at the call sites.
   */
  label: string
  /** Printed beside the icon from `xl` up. Icon-only below, name unaffected. */
  text?: string
  /**
   * A number worth interrupting for: unread messages, items in the basket.
   * `0` and `undefined` both draw nothing — an empty basket is not news.
   */
  count?: number
  badgeTone?: BadgeTone
  /** Highest number the disc prints before it becomes "9+". */
  countMax?: number
  /** Overflow text, e.g. `9+`. Comes from the dictionary, never hard-coded. */
  overflowLabel?: string
  /** The panel behind this control is open — paints the resting state. */
  active?: boolean
}

/**
 * Icon-only bar control with an optional count (C2.4).
 *
 * The right-hand block of the top bar carries three of these — the bell, the
 * basket, "Help" — and they are not `HudPlate`s: a plate is a *reading* (a number
 * that means something on its own), while these are doors. Written once here
 * because the three copies would differ in exactly the places that matter and
 * nowhere a reviewer looks: the hit area, the focus ring, and whether the count
 * reaches a screen reader at all.
 *
 * Two rules the primitive enforces so no call site can forget them:
 *
 *  1. **The name is a required prop.** An icon button with no name announces
 *     "button", and the bell is where the club's messages arrive.
 *  2. **The badge is decoration.** `aria-hidden`, because the count belongs in
 *     the button's own name — a disc reading "3" is unreadable to a screen
 *     reader and a "9+" is a lie to a magnifier. The caller passes the spoken
 *     count in `label`.
 *
 * Always **T3** (§4.2): no neon. The single travelling ring on a launcher screen
 * belongs to the section's main action, not to the chrome.
 */
export function IconAction({
  icon,
  label,
  text,
  count,
  badgeTone = 'primary',
  countMax = 9,
  overflowLabel,
  active = false,
  className,
  ...props
}: IconActionProps) {
  const showBadge = typeof count === 'number' && count > 0
  const printed = showBadge
    ? count > countMax
      ? (overflowLabel ?? `${countMax}+`)
      : String(count)
    : null

  return (
    <button
      data-slot="icon-action"
      type="button"
      aria-label={label}
      className={cn(
        'relative flex h-[38px] items-center gap-2 rounded-md border px-2.5 text-text-medium transition-colors hover:border-border-strong hover:text-text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
        active
          ? 'border-border-strong bg-surface-2 text-text-high'
          : 'border-border pill',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="flex shrink-0 items-center">
        {icon}
      </span>
      {text && (
        // Hidden text rather than a second element: the button's name already
        // says it, so below `xl` the label is a visual economy and nothing else.
        // `xl` and not `md` because the bar it lives in has to fit a 1216 px
        // kiosk: the printed word is the widest optional thing in the right
        // block, and it is worth less than the avatar menu it was pushing off
        // the screen (C2.4). The glyph is a life-ring, which is the one chrome
        // icon a player already knows by shape.
        <span aria-hidden className="hidden text-sm font-semibold xl:inline">
          {text}
        </span>
      )}
      {printed && (
        <span
          aria-hidden
          className={cn(
            'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-display text-[10px] font-bold leading-none tabular-nums ring-2 ring-background',
            BADGE[badgeTone],
          )}
        >
          {printed}
        </span>
      )}
    </button>
  )
}
