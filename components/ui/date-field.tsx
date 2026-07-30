'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconButton } from '@/components/ui/button'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * Pure date helpers — no `Date` arithmetic in the render path
 * ------------------------------------------------------------------ */

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

/** `1998, 6, 15` → `'1998-06-15'`. The one wire format of the product. */
const toIso = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`

interface Ymd {
  y: number
  m: number
  d: number
}

/** Strict parse: shape *and* existence. `2001-02-30` is not a date. */
function parseIso(value: string): Ymd | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!hit) return null
  const [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  if (m < 1 || m > 12) return null
  if (d < 1 || d > daysInMonth(y, m)) return null
  return { y, m, d }
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Monday-indexed weekday of the 1st, 0 = Monday. */
const firstWeekday = (y: number, m: number) => (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7

/** Shifts an ISO day by `delta` days, staying in ISO. */
function shiftDays(value: string, delta: number): string {
  const at = parseIso(value)
  if (!at) return value
  const next = new Date(Date.UTC(at.y, at.m - 1, at.d + delta))
  return toIso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
}

/** Same month, `delta` months away — day clamped, so 31 Jan → 28 Feb. */
function shiftMonths(cursor: { y: number; m: number }, delta: number) {
  const raw = cursor.y * 12 + (cursor.m - 1) + delta
  return { y: Math.floor(raw / 12), m: (raw % 12) + 1 }
}

/**
 * ISO dates sort as strings, so range checks need no parsing at all — the whole
 * reason the wire format is `YYYY-MM-DD` and not the player's locale.
 */
const outOfRange = (value: string, min?: string, max?: string) =>
  (!!min && value < min) || (!!max && value > max)

/** How many days a month page needs — 5 rows fit most, 6 when it spills. */
const weeksIn = (y: number, m: number) => Math.ceil((firstWeekday(y, m) + daysInMonth(y, m)) / 7)

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

type View = 'days' | 'months' | 'years'

/** Years per page of the year view — 3 rows of 4, the same block as the months. */
const YEAR_PAGE = 12

interface DateFieldProps {
  /** Tracked micro-label above the frame, like `Field`. */
  label?: string
  /** `YYYY-MM-DD`, or `''` while the date is incomplete. */
  value: string
  onValueChange: (value: string) => void
  /** Inclusive bounds, `YYYY-MM-DD`. Out-of-range days are unclickable. */
  min?: string
  max?: string
  error?: string
  hint?: string
  disabled?: boolean
  /** Where the calendar opens when the field is empty. Defaults to `max`. */
  openAt?: string
  className?: string
  id?: string
}

/**
 * The date control of the product (C1.11) — typed segments plus a real calendar.
 *
 * It replaces `<input type="date">`, which the birthday field of registration had
 * been borrowing. Two things made the native control the wrong one here, and both
 * are about *this* date rather than dates in general:
 *
 *  - **It is chrome, not product.** The dropdown is drawn by the browser in the
 *    OS palette, so on the club's dark access terminal a grey Chromium calendar
 *    lands on top of the card, ignores the frame radius and cannot be told about
 *    the neon focus ring. Every other control on that card is ours.
 *  - **A birthday is a *year* problem.** The native picker opens on today and
 *    pages one month at a time; a member born in 1998 is 170 clicks away. So the
 *    calendar here has three views — days, months, years — and when the field is
 *    empty it opens on the **year grid**, because the year is the coarsest and
 *    least guessable part and everything else is fast once it is set.
 *
 * Typing stays the fastest path and is therefore the default one: three segments
 * (day / month / year) that auto-advance, take arrows for ±1 and accept a pasted
 * `15.06.1998` or `1998-06-15` whole. The calendar is the assist, not the route.
 *
 * The panel is **portalled**: the access-terminal card is `overflow-hidden`, so an
 * absolutely positioned popover inside the form would be cropped by the card.
 */
export function DateField({
  label,
  value,
  onValueChange,
  min,
  max,
  error,
  hint,
  disabled,
  openAt,
  className,
  id,
}: DateFieldProps) {
  const { t, locale } = useT()
  const autoId = useId()
  const fieldId = id ?? autoId
  const messageId = `${fieldId}-message`
  const labelId = `${fieldId}-label`
  const message = error ?? hint

  /* --- typed segments ------------------------------------------------ */

  const split = useCallback((iso: string) => {
    const at = parseIso(iso)
    return at ? { d: pad(at.d), m: pad(at.m), y: pad(at.y, 4) } : { d: '', m: '', y: '' }
  }, [])

  const [parts, setParts] = useState(() => split(value))
  /**
   * The last value this control *sent*. Without it, echoing our own `onValueChange`
   * back through the prop would rewrite `parts` mid-typing and undo a partial
   * segment (`0` in the day box becomes `''` on the next render).
   */
  const emitted = useRef(value)

  useEffect(() => {
    if (value === emitted.current) return
    emitted.current = value
    setParts(split(value))
  }, [value, split])

  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const order = useMemo(() => [dayRef, monthRef, yearRef], [])

  /**
   * Writes the segments and reports the date they spell.
   *
   * An impossible-but-complete date (`30.02.2001`) is reported as-is rather than
   * swallowed: the caller owns the rule set (`judgeBirthday`), and it can only say
   * "that is not a real date" about a value it was given.
   */
  const push = (next: { d: string; m: string; y: string }) => {
    setParts(next)
    const full = next.d.length === 2 && next.m.length === 2 && next.y.length === 4
    const iso = full ? `${next.y}-${next.m}-${next.d}` : ''
    if (iso === emitted.current) return
    emitted.current = iso
    onValueChange(iso)
  }

  /** Digits only, and only as many as the segment holds. */
  const typeInto = (key: 'd' | 'm' | 'y', raw: string) => {
    const size = key === 'y' ? 4 : 2
    const digits = raw.replace(/\D/g, '').slice(0, size)
    const next = { ...parts, [key]: digits }
    push(next)

    // Advance when the segment is full, or when no second digit could fit —
    // `4` in the day box can only be the 4th, `2` in the month box February.
    const first = Number(digits[0])
    const settled =
      digits.length === size ||
      (key === 'd' && digits.length === 1 && first > 3) ||
      (key === 'm' && digits.length === 1 && first > 1)
    if (!settled) return
    const at = key === 'd' ? 0 : key === 'm' ? 1 : 2
    const nextInput = order[at + 1]?.current
    nextInput?.focus()
    nextInput?.select()
  }

  /** Arrow keys nudge the segment; Backspace on an empty one steps back. */
  const segmentKeys = (key: 'd' | 'm' | 'y', e: React.KeyboardEvent<HTMLInputElement>) => {
    const at = key === 'd' ? 0 : key === 'm' ? 1 : 2

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const step = e.key === 'ArrowUp' ? 1 : -1
      const size = key === 'y' ? 4 : 2
      const span =
        key === 'y'
          ? { lo: 1900, hi: new Date().getUTCFullYear() }
          : key === 'm'
            ? { lo: 1, hi: 12 }
            : { lo: 1, hi: daysInMonth(Number(parts.y) || 2000, Number(parts.m) || 1) }
      const current = Number(parts[key])
      const base = Number.isNaN(current) || current === 0 ? (step > 0 ? span.lo - 1 : span.hi + 1) : current
      const wrapped = base + step > span.hi ? span.lo : base + step < span.lo ? span.hi : base + step
      push({ ...parts, [key]: pad(wrapped, size) })
      return
    }

    if (e.key === 'Backspace' && parts[key] === '' && at > 0) {
      e.preventDefault()
      const prev = order[at - 1].current
      prev?.focus()
      prev?.select()
      return
    }

    if (e.key === 'ArrowLeft' && at > 0) {
      const input = e.currentTarget
      if (input.selectionStart === 0) {
        e.preventDefault()
        order[at - 1].current?.focus()
      }
      return
    }

    if (e.key === 'ArrowRight' && at < 2) {
      const input = e.currentTarget
      if (input.selectionStart === input.value.length) {
        e.preventDefault()
        order[at + 1].current?.focus()
      }
    }
  }

  /** A pasted date arrives in one box; both common orders are understood. */
  const pasteDate = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').trim()
    const digits = text.replace(/\D/g, '')
    if (digits.length !== 8) return
    e.preventDefault()
    // `1998-06-15` and `15.06.1998` both reduce to 8 digits — the leading group
    // says which: a 4-digit head can only be a year.
    const yearFirst = /^\d{4}\D/.test(text)
    const next = yearFirst
      ? { y: digits.slice(0, 4), m: digits.slice(4, 6), d: digits.slice(6, 8) }
      : { d: digits.slice(0, 2), m: digits.slice(2, 4), y: digits.slice(4, 8) }
    push(next)
    yearRef.current?.blur()
  }

  /** On the way out, `6` becomes `06` — a half-typed segment is not a value. */
  const normalize = () => {
    const d = parts.d.length === 1 ? pad(Number(parts.d)) : parts.d
    const m = parts.m.length === 1 ? pad(Number(parts.m)) : parts.m
    if (d !== parts.d || m !== parts.m) push({ ...parts, d, m })
  }

  /* --- calendar ------------------------------------------------------ */

  const selected = parseIso(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('days')
  const fallback = useMemo(() => parseIso(openAt ?? '') ?? parseIso(max ?? '') ?? null, [openAt, max])
  const [cursor, setCursor] = useState(() => {
    const at = selected ?? fallback
    const today = new Date()
    return at
      ? { y: at.y, m: at.m }
      : { y: today.getUTCFullYear(), m: today.getUTCMonth() + 1 }
  })
  /** The day the arrow keys are on. Focus follows it, so the grid has one stop. */
  const [focusDay, setFocusDay] = useState<string>('')
  const closedAt = useRef(0)

  const panelRef = useDismissableLayer({
    open,
    onClose: () => {
      closedAt.current = Date.now()
      setOpen(false)
    },
    closeOnOutside: true,
    // A popover is not a dialog: trapping Tab strands the keyboard on a control
    // that sits in the middle of a form, and locking scroll shifts that form.
    trapFocus: false,
    autoFocus: false,
    lockScroll: false,
  })

  const openCalendar = () => {
    // `pointerdown` outside already closed us; without this the click that
    // follows would reopen the panel the same gesture just dismissed.
    if (Date.now() - closedAt.current < 250) return
    const at = selected ?? fallback
    if (at) setCursor({ y: at.y, m: at.m })
    setFocusDay(selected ? value : '')
    // Empty field → start at the year, the part that is 170 month-clicks away.
    setView(selected ? 'days' : 'years')
    setOpen(true)
  }

  /* --- placement (portalled, so it is measured, not inherited) -------- */

  const frameRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{
    left: number
    width: number
    top?: number
    bottom?: number
    maxHeight: number
  }>()

  /**
   * Placement, and what a first pass got wrong on a 693 px station.
   *
   * The field sits mid-card, so on a short screen **neither** side fits a day
   * grid. A "flip up when the gap below is too small" rule therefore flipped,
   * and the panel covered the whole form including the SIGN IN / REGISTER strip
   * — a popover that hides the page it belongs to.
   *
   * Two rules instead. **Down is the default**, so the field and its label stay
   * visible under the panel; it flips up only when the gap below cannot hold the
   * panel *and* the gap above is genuinely bigger. And the chosen side gets a
   * `maxHeight`, so a panel taller than its gap scrolls rather than growing over
   * its own field.
   *
   * The height compared is the panel's **measured** height, re-read whenever the
   * view changes: the year grid is ~200 px and the day grid ~330 px, and a single
   * constant made the short view flip for room it did not need.
   */
  const measure = useCallback(() => {
    const frame = frameRef.current
    if (!frame) return
    const r = frame.getBoundingClientRect()
    const width = Math.max(r.width, 300)
    const GAP = 8
    const needed = panelRef.current?.scrollHeight ?? 336
    const below = window.innerHeight - r.bottom - GAP * 2
    const above = r.top - GAP * 2
    const left = Math.min(Math.max(GAP, r.left), Math.max(GAP, window.innerWidth - width - GAP))
    const dropDown = below >= needed || below >= above
    setBox(
      dropDown
        ? { left, width, top: r.bottom + GAP, maxHeight: below }
        : { left, width, bottom: window.innerHeight - r.top + GAP, maxHeight: above },
    )
  }, [panelRef])

  useEffect(() => {
    if (!open) return
    // Twice on open: the first pass has no panel to measure yet (it is what
    // decides whether the panel renders at all), the second reads the real
    // height. `view` in the deps is the same rule for switching day ↔ year.
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, view, measure])

  /* --- locale names --------------------------------------------------- */

  const weekdays = useMemo(() => {
    // 1 Jan 2024 was a Monday, and the club's three locales all start there.
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))))
  }, [locale])

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2024, i, 1))))
  }, [locale])

  const monthShort = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2024, i, 1))))
  }, [locale])

  const longDate = useMemo(() => {
    if (!selected) return null
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(selected.y, selected.m - 1, selected.d)))
  }, [locale, selected])

  /* --- grids ---------------------------------------------------------- */

  const rows = weeksIn(cursor.y, cursor.m)
  const lead = firstWeekday(cursor.y, cursor.m)

  /** 5 or 6 weeks of ISO days, neighbours included — a calendar has no holes. */
  const grid = useMemo(() => {
    const start = new Date(Date.UTC(cursor.y, cursor.m - 1, 1 - lead))
    return Array.from({ length: rows * 7 }, (_, i) => {
      const at = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
      return {
        iso: toIso(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate()),
        day: at.getUTCDate(),
        outside: at.getUTCMonth() + 1 !== cursor.m,
      }
    })
  }, [cursor, lead, rows])

  const yearStart = Math.floor(cursor.y / YEAR_PAGE) * YEAR_PAGE
  const minYear = min ? Number(min.slice(0, 4)) : 1900
  const maxYear = max ? Number(max.slice(0, 4)) : new Date().getUTCFullYear()

  /** The one stop of the day grid: the selection, else the 1st in range. */
  const gridStop = useMemo(() => {
    if (focusDay && grid.some((c) => c.iso === focusDay)) return focusDay
    if (selected && selected.y === cursor.y && selected.m === cursor.m) return value
    const first = grid.find((c) => !c.outside && !outOfRange(c.iso, min, max))
    return first?.iso ?? grid.find((c) => !c.outside)?.iso ?? ''
  }, [focusDay, grid, selected, value, cursor, min, max])

  // Focus follows the arrow keys, but only once the panel has painted the day.
  useEffect(() => {
    if (!open || view !== 'days' || !focusDay) return
    const panel = panelRef.current
    panel?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true })
  }, [open, view, focusDay, cursor, panelRef])

  const pick = (iso: string) => {
    if (outOfRange(iso, min, max)) return
    const at = parseIso(iso)
    if (!at) return
    setParts({ d: pad(at.d), m: pad(at.m), y: pad(at.y, 4) })
    emitted.current = iso
    onValueChange(iso)
    closedAt.current = Date.now()
    setOpen(false)
  }

  const gridKeys = (e: React.KeyboardEvent) => {
    const step =
      e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0
    if (step !== 0) {
      e.preventDefault()
      const from = gridStop || toIso(cursor.y, cursor.m, 1)
      const next = shiftDays(from, step)
      const at = parseIso(next)
      if (!at) return
      if (at.y !== cursor.y || at.m !== cursor.m) setCursor({ y: at.y, m: at.m })
      setFocusDay(next)
      return
    }
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      page(e.key === 'PageUp' ? -1 : 1)
    }
  }

  /** One step of whatever the header is currently paging. */
  const page = (delta: number) => {
    if (view === 'days') {
      const next = shiftMonths(cursor, delta)
      setCursor(next)
      setFocusDay('')
      return
    }
    if (view === 'months') {
      setCursor({ ...cursor, y: cursor.y + delta })
      return
    }
    setCursor({ ...cursor, y: cursor.y + delta * YEAR_PAGE })
  }

  /** Is every day of this month outside the bounds? Then so is the page. */
  const monthBlocked = (y: number, m: number) =>
    outOfRange(toIso(y, m, daysInMonth(y, m)), min, undefined) || outOfRange(toIso(y, m, 1), undefined, max)

  const pageBack =
    view === 'days'
      ? monthBlocked(shiftMonths(cursor, -1).y, shiftMonths(cursor, -1).m)
      : view === 'months'
        ? cursor.y - 1 < minYear
        : yearStart - YEAR_PAGE + YEAR_PAGE - 1 < minYear
  const pageNext =
    view === 'days'
      ? monthBlocked(shiftMonths(cursor, 1).y, shiftMonths(cursor, 1).m)
      : view === 'months'
        ? cursor.y + 1 > maxYear
        : yearStart + YEAR_PAGE > maxYear

  const cell =
    'flex h-9 items-center justify-center rounded-md text-[13px] tabular-nums outline-none transition-colors ' +
    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2 ' +
    'disabled:pointer-events-none disabled:opacity-25'

  const panel = open && box && (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label={t('common.datePicker')}
      tabIndex={-1}
      initial={{ opacity: 0, y: box.top ? -6 : 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: box.top ? -6 : 6, scale: 0.98 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        left: box.left,
        width: box.width,
        top: box.top,
        bottom: box.bottom,
        maxHeight: box.maxHeight,
      }}
      className={cn(
        'fixed z-50 flex origin-top flex-col overflow-hidden rounded-xl border border-border p-3',
        // One rung above the card it floats over, with the same glass as the
        // access terminal — a popover that reads as OS chrome is the whole bug
        // this component exists to fix.
        'bg-surface-2/95 shadow-[0_28px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl',
      )}
    >
      {/* Header: what is being paged, and the two ways to change scale. */}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={t('common.datePrev')}
          size="sm"
          variant="ghost"
          disabled={pageBack}
          onClick={() => page(-1)}
        >
          <icons.back size={16} />
        </IconButton>

        <div className="flex flex-1 items-center justify-center gap-1">
          {view === 'days' && (
            <Button
              size="sm"
              variant="ghost"
              voice="plain"
              className="h-8 px-2 text-[13px] text-text-high"
              onClick={() => setView('months')}
            >
              {monthNames[cursor.m - 1]}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            voice="plain"
            className="h-8 px-2 text-[13px] tabular-nums text-text-high"
            onClick={() => setView(view === 'years' ? 'days' : 'years')}
          >
            {view === 'years' ? `${yearStart}–${yearStart + YEAR_PAGE - 1}` : cursor.y}
            <icons.expand size={13} className="text-text-low" />
          </Button>
        </div>

        <IconButton
          label={t('common.dateNext')}
          size="sm"
          variant="ghost"
          disabled={pageNext}
          onClick={() => page(1)}
        >
          <icons.forward size={16} />
        </IconButton>
      </div>

      {/* Only the grid scrolls. On a short station the header has to stay
          reachable — it is the way out of a view, and a popover whose own
          navigation scrolls off is a trap. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      {view === 'days' && (
        <div className="mt-2">
          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((w) => (
              <span
                key={w}
                className="label-mono flex h-6 items-center justify-center text-[9px] text-text-low"
              >
                {w.slice(0, 2)}
              </span>
            ))}
          </div>

          <div role="grid" className="mt-1 grid grid-cols-7 gap-1" onKeyDown={gridKeys}>
            {grid.map((c) => {
              const isSelected = c.iso === value
              const blocked = outOfRange(c.iso, min, max)
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  data-day={c.iso}
                  aria-selected={isSelected}
                  disabled={blocked}
                  tabIndex={c.iso === gridStop ? 0 : -1}
                  onClick={() => pick(c.iso)}
                  className={cn(
                    cell,
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground shadow-[0_0_18px_-6px_rgba(229,53,43,0.7)]'
                      : c.outside
                        ? 'text-text-low/50 hover:bg-white/[0.05] hover:text-text-medium'
                        : 'text-text-medium hover:bg-white/[0.07] hover:text-text-high',
                  )}
                >
                  {c.day}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {view === 'months' && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {monthShort.map((name, i) => {
            const m = i + 1
            const blocked = monthBlocked(cursor.y, m)
            return (
              <button
                key={name}
                type="button"
                disabled={blocked}
                onClick={() => {
                  setCursor({ ...cursor, m })
                  setView('days')
                }}
                className={cn(
                  cell,
                  'capitalize',
                  selected?.y === cursor.y && selected?.m === m
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-text-medium hover:bg-white/[0.07] hover:text-text-high',
                )}
              >
                {name.replace('.', '')}
              </button>
            )
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {Array.from({ length: YEAR_PAGE }, (_, i) => yearStart + i).map((y) => {
            const blocked = y < minYear || y > maxYear
            return (
              <button
                key={y}
                type="button"
                disabled={blocked}
                onClick={() => {
                  setCursor({ ...cursor, y })
                  setView('months')
                }}
                className={cn(
                  cell,
                  selected?.y === y
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-text-medium hover:bg-white/[0.07] hover:text-text-high',
                )}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}
      </div>

      {/* Footer states the parsed date in words — the check a `15.06.1998` row
          cannot do on its own — and offers the only destructive action. */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-border/70 pt-2">
        <span className="text-[11px] text-text-low">
          {longDate ?? (view === 'years' ? t('common.datePickYear') : t('common.datePickDay'))}
        </span>
        {value && (
          <Button
            size="sm"
            variant="ghost"
            voice="plain"
            className="h-7 px-2 text-[11px] text-text-low hover:text-text-high"
            onClick={() => {
              push({ d: '', m: '', y: '' })
              dayRef.current?.focus()
            }}
          >
            {t('common.dateClear')}
          </Button>
        )}
      </div>
    </motion.div>
  )

  const segment = (key: 'd' | 'm' | 'y', ref: React.RefObject<HTMLInputElement | null>, label: string) => (
    <input
      ref={ref}
      id={key === 'd' ? fieldId : undefined}
      value={parts[key]}
      onChange={(e) => typeInto(key, e.target.value)}
      onKeyDown={(e) => segmentKeys(key, e)}
      onPaste={pasteDate}
      onBlur={normalize}
      onFocus={(e) => e.currentTarget.select()}
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      placeholder={label}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      aria-describedby={message ? messageId : undefined}
      className={cn(
        'bg-transparent py-2.5 text-center text-sm tabular-nums text-text-high outline-none',
        'placeholder:text-text-low/70 disabled:cursor-not-allowed',
        // Sized for the *letter* placeholder, not the digits: `ch` is the width
        // of `0`, but the masks are uppercase letters (`ГГГГ`/`MMMM`, `ММ`/`DD`)
        // that run ~1.5× wider, so a digit-sized box clipped `MMMM`→`MMM` and
        // `MM`→`M`. These fit the widest of the three locales' masks while the
        // centered digit value still sits comfortably inside.
        key === 'y' ? 'w-[6.4ch]' : 'w-[3.4ch]',
      )}
    />
  )

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={fieldId} id={labelId} className="label-mono text-[10px] text-text-low">
          {label}
        </label>
      )}

      {/* Same frame as `Field`, deliberately identical down to the focus halo:
          this sits in a column of inputs and any other recess would read as a
          different kind of control. */}
      <div
        ref={frameRef}
        className={cn(
          'well flex items-center gap-2.5 rounded-lg border px-3.5 transition-all',
          'focus-within:border-primary focus-within:well-deep',
          'focus-within:shadow-[0_0_0_3px_rgba(229,53,43,0.14),0_0_24px_-6px_rgba(229,53,43,0.35)]',
          error ? 'border-danger' : 'border-border',
          disabled && 'opacity-50',
        )}
      >
        <span className="shrink-0 text-text-low" aria-hidden>
          <icons.calendar size={15} />
        </span>

        <div
          role="group"
          aria-labelledby={label ? labelId : undefined}
          className="flex flex-1 items-center"
        >
          {segment('d', dayRef, t('common.dateDay'))}
          <span className="text-text-low" aria-hidden>
            .
          </span>
          {segment('m', monthRef, t('common.dateMonth'))}
          <span className="text-text-low" aria-hidden>
            .
          </span>
          {segment('y', yearRef, t('common.dateYear'))}
        </div>

        <IconButton
          label={t('common.datePicker')}
          size="sm"
          variant="ghost"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openCalendar())}
          className="-mr-1.5"
        >
          <icons.calendar size={16} />
        </IconButton>
      </div>

      {message && (
        <span
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-xs', error ? 'text-danger' : 'text-text-low')}
        >
          {message}
        </span>
      )}

      {typeof document !== 'undefined' &&
        createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  )
}
