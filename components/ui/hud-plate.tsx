import { cn } from '@/lib/utils'

/**
 * What the reading *means*, never how loud it is. `warning` / `danger` come from
 * the countdown thresholds (F1.17), `coin` is the loyalty balance and takes the
 * `--coin` token rather than borrowing amber from `--warning` (§1.3).
 */
type Tone = 'default' | 'coin' | 'warning' | 'danger'

const TONE: Record<Tone, { edge: string; fill: string; label: string; icon: string }> = {
  default: { edge: 'border-border', fill: 'pill', label: 'text-text-low', icon: 'text-text-medium' },
  coin: {
    edge: 'border-coin/25',
    fill: 'bg-coin/[0.07]',
    label: 'text-coin/70',
    icon: 'text-coin',
  },
  warning: {
    edge: 'border-warning/45',
    fill: 'bg-warning/[0.07]',
    label: 'text-warning/70',
    icon: 'text-warning',
  },
  danger: {
    edge: 'border-danger/50',
    fill: 'bg-danger/[0.08]',
    label: 'text-danger/80',
    icon: 'text-danger',
  },
}

interface HudPlateProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Tracked micro-label above the reading, e.g. "TIME LEFT". */
  label: React.ReactNode
  /**
   * The reading itself. Pass a primitive (`Countdown`, `Money`) when the value
   * owns a type face or a threshold colour of its own — the plate only supplies
   * the default display face for bare strings.
   */
  value: React.ReactNode
  /** Lucide icon element, sized 14 px by the caller (§5.3). */
  icon?: React.ReactNode
  tone?: Tone
  /**
   * From which width the micro-label is *printed*. It is always spoken.
   *
   * `sm` (default) drops it on narrow screens, because the bar has to fit three
   * plates and an avatar at 360 px. `xl` is for plates mounted in the launcher's
   * top bar, where the label competes with a six-section rail and the whole
   * right-hand block on a 1216 px kiosk — and the labels are the widest part of
   * the plate, since "IMBA monetos" is twice the width of the `1,250` it names
   * (C2.4). `always` keeps it — for panels where the label is the only thing
   * naming the number and there is room to say it.
   */
  labelAt?: keyof typeof LABEL_AT
}

/**
 * Printed and spoken are two halves of one switch: at every width exactly one of
 * them is in the tree, so the reading is never nameless and never announced
 * twice. Pairing them in a table is what keeps that true — the two classes were
 * written out at the call site once and drifted by a breakpoint.
 */
const LABEL_AT = {
  sm: { print: 'hidden sm:block', speak: 'sm:hidden' },
  xl: { print: 'hidden xl:block', speak: 'xl:hidden' },
  always: { print: '', speak: 'hidden' },
} as const

/**
 * Bar-mounted status plate (C2.1).
 *
 * The right-hand block of the top bar is a row of these: remaining time, coin
 * balance, open tab. Each was hand-written markup, and the three copies had
 * already diverged — one carried the shell's `pill` rung, the other two a
 * one-off `bg-white/[0.03]` that is on no rung of the depth scale (§3.3).
 *
 * Not `HudChip` (§10.3): that is the round glass capsule of the login/attract
 * seam, where label and value sit side by side and the tone is forbidden from
 * touching the surface. A HUD plate is squarer, stacks its label above the
 * reading, and *must* tint its own edge — the countdown turning amber at 15
 * minutes is the one place in the client where a surface is allowed to raise its
 * voice. Always **T3** (§4.2): the plate never carries neon, so the single
 * running ring on a launcher screen stays wherever the screen spent it, and the
 * only motion here is the `urgency-pulse` the countdown brings itself.
 */
export function HudPlate({
  label,
  value,
  icon,
  tone = 'default',
  labelAt = 'sm',
  className,
  ...props
}: HudPlateProps) {
  const t = TONE[tone]

  return (
    <div
      data-slot="hud-plate"
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-3 py-1.5',
        t.fill,
        t.edge,
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn('shrink-0', t.icon)} aria-hidden>
          {icon}
        </span>
      )}
      <div className="flex flex-col leading-none">
        <span className={cn('label-mono text-[8px]', t.label, LABEL_AT[labelAt].print)}>
          {label}
        </span>
        {/* Dropping the micro-label to save width is a *visual* economy, and until
            now it took the reading's name with it: `hidden` leaves the
            accessibility tree too, so on a phone the top bar announced a bare
            `01:23:00` with nothing saying it was time left, from a pass. The label
            comes back as a spoken copy at exactly the widths where the printed one
            is gone — one of the two is always hidden, so nothing is announced
            twice. `normal-case`, because the printed label is tracked caps and a
            reader handed "ОСТАЛОСЬ" may spell it out letter by letter. */}
        <span className={cn('sr-only normal-case', LABEL_AT[labelAt].speak)}>{label}</span>
        {/* A `div`, not a `span`: the readings that matter here are primitives
            (`Countdown` renders a block), and a span wrapping a div is invalid
            markup that React will happily ship and the browser will re-parse. */}
        <div className="font-display text-sm font-bold leading-tight tabular-nums text-text-high">
          {value}
        </div>
      </div>
    </div>
  )
}
