'use client'

/**
 * The first-run tour (C3.12).
 *
 * Five steps that point at the shell the player is already looking at, rather
 * than five slides of a carousel. That is the whole design decision here: a
 * pager of screenshots teaches nothing, because the thing it describes is not on
 * screen while it describes it. So the launcher stays lit and untouched, the tour
 * dims everything except one region of it, and the caption sits next to that
 * region — "your time lives *here*" is only true if `here` is a real plate.
 *
 * Consequences of that choice, in the order they bite:
 *
 * 1. **Targets are DOM contracts, not selectors guessed from classes.** Every
 *    step names one or two `data-tour` attributes (plus `data-nav-item` for the
 *    navigation slot, which is a primitive and does not know the launcher's
 *    table). A step whose anchors are all missing is *dropped from the walk*
 *    rather than shown over a blank rectangle — that is what makes the same five
 *    steps survive a phone (where "Help" is in the avatar menu, not the bar), a
 *    guest surface (no quests, no pass) and a section that failed to render.
 *
 * 2. **The spotlight is measured, not drawn.** The hole is the union of the
 *    anchors' viewport boxes, so nothing has to duplicate the layout in CSS. It
 *    is re-measured on resize and scroll, because the shell scrolls underneath.
 *
 * 3. **No hole is cut in the DOM — the dim is a border.** Four `scrim` panels
 *    (above / below / left / right of the hole) rather than one panel with a
 *    `clip-path`: the lit region then contains no overlay pixels at all, so the
 *    element under the spotlight keeps its own colours instead of showing through
 *    a semi-transparent sheet.
 *
 * 4. **The tour is modal and the launcher behind it is inert.** The overlay traps
 *    focus and swallows clicks: the spotlight *shows* the basket, it is not an
 *    invitation to order a drink mid-tour. Pressing Escape is a skip, which is
 *    the same write as finishing (see `completeOnboarding`).
 *
 * Where it is offered from, and why the flag is not in the store: `tourOpen` is
 * "the walk is happening", while "has this player ever been offered it" is a
 * preference on the account (`onboardingCompletedAt`). Two questions, two homes —
 * so re-opening the tour by hand from Help never has to lie about the second.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { useApi, useInvalidate } from '@/hooks/use-api'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import { completeOnboarding, fetchPreferences } from '@/lib/mock/api/profile'
import { overlayZ } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** How far the lit region is opened up around the anchors it measures. */
const SPOT_PAD = 10
/** Gap between the lit region and the caption card. */
const CARD_GAP = 16
/** The caption's own width — fixed, so the card cannot reflow between steps. */
const CARD_W = 340
/** Below this the card stops being placed beside the hole and docks instead. */
const CARD_MIN_SPACE = 200
/**
 * How much of the viewport a lit region may take before the union is abandoned.
 *
 * The two-anchor steps ("the bar board *and* the basket it fills") only read as
 * one answer while both boxes are near each other. When the second anchor lives
 * in the fixed top bar and the first is a card below the fold, their union is the
 * whole screen — nothing is dimmed, and the step points at everything, which is
 * the same as pointing at nothing. Past this share the walk keeps the first
 * anchor it found and drops the rest.
 */
const SPOT_MAX_RATIO = 0.55

interface TourStep {
  id: string
  /**
   * CSS selectors, in priority order — the step lights *every* one it finds. Two
   * entries mean two halves of one answer (the bar board and the basket it
   * fills), not a fallback; a step with none of them present is skipped.
   */
  targets: string[]
  icon: LucideIcon
  titleKey: string
  bodyKey: string
}

/**
 * The five things a player has to know to use the club, in the order they need
 * them: the clock is running before anything else matters, then a game, then a
 * drink, then what the playing is worth, and finally who to shout at.
 */
const STEPS: TourStep[] = [
  {
    id: 'time',
    targets: ['[data-tour="time"]'],
    icon: icons.timer,
    titleKey: 'help.tourTimeTitle',
    bodyKey: 'help.tourTimeBody',
  },
  {
    id: 'games',
    // The rail slot, on whichever of the two bars the breakpoint is showing.
    // `data-nav-item` rather than a `data-tour` on the launcher's side, because
    // the rail is a primitive rendered from the navigation table — the id it
    // prints back is the only name the slot has.
    targets: ['[data-nav-item="games"]'],
    icon: icons.games,
    titleKey: 'help.tourGamesTitle',
    bodyKey: 'help.tourGamesBody',
  },
  {
    id: 'bar',
    targets: ['[data-tour="bar"]', '[data-tour="cart"]'],
    icon: icons.cart,
    titleKey: 'help.tourBarTitle',
    bodyKey: 'help.tourBarBody',
  },
  {
    id: 'loyalty',
    targets: ['[data-tour="quests"]', '[data-tour="pass"]'],
    icon: icons.rewards,
    titleKey: 'help.tourLoyaltyTitle',
    bodyKey: 'help.tourLoyaltyBody',
  },
  {
    id: 'help',
    targets: ['[data-tour="help"]'],
    icon: icons.support,
    titleKey: 'help.tourHelpTitle',
    bodyKey: 'help.tourHelpBody',
  },
]

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/** Is the element actually on screen — rendered, laid out, not display:none? */
function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/**
 * The union of every anchor a step can find, padded — or `null` when the step has
 * nothing on this screen to point at.
 *
 * A union rather than one box per anchor: the bar board and the basket are one
 * answer, and two separate holes would read as two unrelated instructions.
 */
function measure(targets: string[]): Box | null {
  /** The visible boxes of one selector, in document order. */
  const rectsOf = (selector: string) =>
    Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map((el) => el.getBoundingClientRect())

  const groups = targets.map(rectsOf).filter((rects) => rects.length > 0)
  if (groups.length === 0) return null

  const hull = (rects: DOMRect[]): Box => {
    const top = Math.max(0, Math.min(...rects.map((r) => r.top)) - SPOT_PAD)
    const left = Math.max(0, Math.min(...rects.map((r) => r.left)) - SPOT_PAD)
    const bottom = Math.min(window.innerHeight, Math.max(...rects.map((r) => r.bottom)) + SPOT_PAD)
    const right = Math.min(window.innerWidth, Math.max(...rects.map((r) => r.right)) + SPOT_PAD)
    return { top, left, width: right - left, height: bottom - top }
  }

  const union = hull(groups.flat())
  // Too much of the screen lit means the union spans a scroll distance (a card
  // below the fold plus its counterpart in the fixed bar). Fall back to the
  // step's primary anchor, which is the one the caption is written about.
  if (groups.length > 1 && union.height > window.innerHeight * SPOT_MAX_RATIO) {
    return hull(groups[0])
  }
  return union
}

/**
 * Bring the step's primary anchor onto the screen before it is measured.
 *
 * Four of the five steps point at home-screen cards, and the bar board sits below
 * the fold on a kiosk window — a spotlight on an element the player cannot see is
 * a dimmed screen with a caption. The walk scrolls the shell itself rather than
 * moving the overlay, so what the player ends the tour looking at is the real
 * layout, already in the place the step described.
 */
function revealTarget(targets: string[], reduced: boolean) {
  for (const selector of targets) {
    const el = Array.from(document.querySelectorAll(selector)).find(isVisible)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    // Only when it is actually out of the comfortable band: scrolling a plate
    // that is already centred would jitter the frame on every step.
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    }
    return
  }
}

export function FirstRunTour() {
  const open = useStore((s) => s.tourOpen)
  const setTourOpen = useStore((s) => s.setTourOpen)
  const user = useStore((s) => s.user)
  const view = useStore((s) => s.view)

  // Mounted flag for the same reason `Overlay` carries one: `document` does not
  // exist during the server render, and the tour is never part of the first
  // paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /**
   * Whether the club has ever offered this player the walk.
   *
   * A read, not a client flag: the answer belongs to the account, so a member who
   * took the tour last week at another station is not walked around the shell
   * again — and a `localStorage` boolean would have got that exactly backwards on
   * a shared kiosk. Members only: a walk-in has no account to remember it in, and
   * offering a tour that cannot be marked as offered would re-open it on every
   * reload of the guest surface.
   */
  const prefs = useApi(user ? 'profile/preferences' : null, fetchPreferences)

  /**
   * Offered on **home**, and only there.
   *
   * Four of the five steps point at things that exist on the home screen; the
   * launcher opens on home, so in practice this is "on arrival". Guarding on the
   * section anyway is what stops the walk from ambushing a player who has already
   * navigated into the library — and the offer is a one-shot: `tourOpen` flips
   * once, and the finish writes the preference this effect reads.
   */
  const offered = prefs.data ? prefs.data.onboardingCompletedAt !== null : true
  useEffect(() => {
    if (!offered && view === 'home') setTourOpen(true)
    // `offered` alone: re-running on every section change would re-open a walk the
    // player skipped, because the preference write lands a tick after the close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offered])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>{open && <TourWalk key="tour" onClose={() => setTourOpen(false)} />}</AnimatePresence>,
    document.body,
  )
}

/**
 * Split from the host so every measurement, key handler and step index is born
 * with the walk and dies with it — a step counter that outlived the overlay would
 * re-open the tour on step 4.
 */
function TourWalk({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const reduced = useReducedMotion()
  const invalidate = useInvalidate()

  // Which steps this screen can actually show. Measured once at open: the shell
  // does not change breakpoint or surface mid-walk, and a list that shrank
  // between two clicks would renumber "Step 3 of 5" under the player.
  const [steps] = useState(() => STEPS.filter((step) => measure(step.targets) !== null))
  const [i, setI] = useState(0)
  const step = steps[i]

  const [box, setBox] = useState<Box | null>(null)

  // Re-measured on every step and whenever the page moves under it. `scroll` is
  // captured, because the thing that scrolls is the content column, not `window`.
  useEffect(() => {
    if (!step) return
    const sync = () => setBox(measure(step.targets))
    // Scroll first, measure after: the scroll listener below keeps the box on the
    // anchor for the rest of the (possibly smooth) travel.
    revealTarget(step.targets, reduced)
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [step, reduced])

  /**
   * Finishing and skipping are the same write (`completeOnboarding`): both mean
   * "this player has been offered the walk", and a skip that recorded nothing
   * would re-open the overlay on the next screen they opened. Not awaited — the
   * overlay closes on the player's press, and the preference is the club's
   * bookkeeping, not something to wait on.
   */
  const finish = useCallback(() => {
    // Awaited only by the invalidation: the host's "has this been offered" read is
    // the same row this writes, and refreshing it is what stops the offer from
    // firing again the moment the overlay closes.
    void completeOnboarding().then(() => invalidate('profile'))
    onClose()
  }, [onClose, invalidate])

  const last = i === steps.length - 1
  const next = useCallback(() => {
    if (last) finish()
    else setI((v) => v + 1)
  }, [last, finish])

  // The walk is a dialog, so it owns the keyboard while it is up: Escape skips,
  // and the arrows walk the steps for the same reason the rails accept them —
  // this is a sequence, and a player who found the arrows should not have to go
  // back to the mouse.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        finish()
      } else if (e.key === 'ArrowRight') {
        next()
      } else if (e.key === 'ArrowLeft') {
        setI((v) => Math.max(0, v - 1))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [finish, next])

  // Nothing on this screen is pointable — a guest on a phone with the section
  // still loading. The walk closes rather than showing five empty frames, and it
  // still counts as offered: re-opening it from Help is one press away, and a
  // tour that kept trying on every render would be a loop.
  useEffect(() => {
    if (steps.length === 0) finish()
  }, [steps.length, finish])

  if (!step) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      // `takeover`, not `modal`: the walk has to dim the chrome and the dialogs'
      // own rung would let a stray drawer sit on top of the spotlight. Still
      // under `toast`, so feedback stays readable (`lib/overlay.ts`).
      className={cn('fixed inset-0', overlayZ.takeover)}
      // The launcher underneath is scenery for the duration: the spotlight shows
      // the basket, it does not invite an order mid-walk.
      onClick={(e) => e.stopPropagation()}
    >
      <Spotlight box={box} reduced={reduced} />
      <TourCard
        box={box}
        step={step}
        index={i}
        total={steps.length}
        reduced={reduced}
        onBack={() => setI((v) => Math.max(0, v - 1))}
        onNext={next}
        onSkip={finish}
        t={t}
      />
    </motion.div>
  )
}

/**
 * The dim, as four panels around the lit region.
 *
 * `scrim` is the one darkening depth in the product (§3.3), so the tour borrows
 * it rather than inventing an opacity — and using four of them instead of a
 * clipped sheet is what keeps the lit element's own colour intact.
 *
 * With no box (the anchors vanished mid-step) the whole screen dims: the caption
 * is still readable, which is better than a hole in an arbitrary place.
 */
function Spotlight({ box, reduced }: { box: Box | null; reduced: boolean }) {
  const spring = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 320, damping: 34 } as const)

  if (!box) return <div aria-hidden className="scrim absolute inset-0" />

  const panels: Box[] = [
    { top: 0, left: 0, width: window.innerWidth, height: box.top },
    {
      top: box.top + box.height,
      left: 0,
      width: window.innerWidth,
      height: Math.max(0, window.innerHeight - box.top - box.height),
    },
    { top: box.top, left: 0, width: box.left, height: box.height },
    {
      top: box.top,
      left: box.left + box.width,
      width: Math.max(0, window.innerWidth - box.left - box.width),
      height: box.height,
    },
  ]

  return (
    <div aria-hidden className="absolute inset-0">
      {panels.map((panel, idx) => (
        <motion.div
          key={idx}
          className="scrim absolute"
          animate={{ ...panel }}
          transition={spring}
        />
      ))}
      {/* The lit edge. The single **T1** of the frame (§4.2): the walk has one
          subject per step, and the travelling ring is exactly the thing that says
          which. Nothing else on screen is allowed a live ring while it is up —
          the launcher below is dimmed. */}
      <motion.div
        className="neon-ring pointer-events-none absolute rounded-md"
        animate={{ ...box }}
        transition={spring}
      />
    </div>
  )
}

/**
 * The caption.
 *
 * Placed **below or above the hole**, never left/right: the anchors are full-width
 * cards and bar plates, so a card beside them would either overlap the thing it
 * is describing or be pushed off the viewport. When neither side has room — a
 * spotlight filling the height on a short kiosk window — it docks to the bottom
 * centre, which is the one place that never collides with a top-bar anchor.
 */
function TourCard({
  box,
  step,
  index,
  total,
  reduced,
  onBack,
  onNext,
  onSkip,
  t,
}: {
  box: Box | null
  step: TourStep
  index: number
  total: number
  reduced: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const Icon = step.icon
  const last = index === total - 1

  const place = useMemo(() => {
    if (!box) return { bottom: 24, left: '50%', x: '-50%' as const }

    const below = window.innerHeight - (box.top + box.height)
    const above = box.top
    // Kept inside the viewport on the cross axis, and pinned to the hole rather
    // than centred on it: a caption that drifts to the middle of the screen stops
    // pointing at anything.
    const left = Math.min(
      Math.max(16, box.left),
      Math.max(16, window.innerWidth - CARD_W - 16),
    )

    if (below >= CARD_MIN_SPACE) return { top: box.top + box.height + CARD_GAP, left }
    if (above >= CARD_MIN_SPACE) return { bottom: window.innerHeight - box.top + CARD_GAP, left }
    return { bottom: 24, left: '50%', x: '-50%' as const }
  }, [box])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t('help.tourLabel')}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      style={{ ...place, width: CARD_W, maxWidth: 'calc(100vw - 2rem)' }}
      className="glass-strong absolute flex flex-col gap-3 rounded-lg p-5"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md pill text-primary">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          {/* The counter is the progress bar of this widget: five steps do not
              need a rail, they need to be countable. */}
          <p className="label-mono text-[9px] text-text-low tabular-nums">
            {t('help.tourStep', { step: index + 1, total })}
          </p>
          <h2 className="font-display text-base font-bold leading-tight text-text-high text-balance">
            {t(step.titleKey)}
          </h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-medium text-pretty">{t(step.bodyKey)}</p>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        {/* Skip is the tour's escape hatch and stays in the same place on every
            step — a player who wants out should not have to read the row again. */}
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {t('help.tourSkip')}
        </Button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button variant="secondary" size="sm" onClick={onBack} iconLeft={<icons.back aria-hidden />}>
              {t('help.tourBack')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            iconRight={last ? undefined : <icons.forward aria-hidden />}
          >
            {last ? t('help.tourDone') : t('help.tourNext')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
