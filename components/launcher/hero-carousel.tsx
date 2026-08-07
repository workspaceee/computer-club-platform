'use client'

/**
 * The hero carousel on Home (C3.9).
 *
 * It used to be a featured-games rail: `GET /api/games/featured`, five covers, a
 * "Play now" on each. That is a *shelf*, and the library screen already is one —
 * so the largest surface on Home spent 70vw of art repeating a row the player can
 * reach in one click, and nothing the club actually wanted to say tonight.
 *
 * Now the deck is what the club is highlighting: live campaigns, the brackets the
 * card below is not about, and the novelty shelf — one read, `GET /api/hero`, with
 * the composition done on the server (see `lib/mock/api/hero.ts`). That is the load
 * bearing half of this component: "may the hero say this" — which campaign, which
 * bracket, and whether a walk-in may see it — is answered next to the rows, so the
 * hero cannot advertise the very tournament `TournamentCard` is showing three
 * blocks below with a working Join.
 *
 * The four decisions this component owns, each of them a bug it would otherwise
 * ship:
 *
 *  1. **Rotation stops whenever the player engages, and can be stopped for good.**
 *     Hover, keyboard focus and reduced motion each hold the current slide;
 *     the pause button holds it until pressed again. An auto-advancing carousel
 *     whose only "stop" is holding the mouse still fails WCAG 2.2.2 — and worse,
 *     it swaps the game under the "Play now" a player is reaching for.
 *  2. **One shell, three kinds of slide.** Every slide is reduced to the same five
 *     things (art, eyebrow, headline, one line, one action) by `describe()` below,
 *     because a campaign slide 8px taller than a bracket slide reads as the page
 *     twitching every seven seconds. The club's own copy — badge, headline,
 *     tournament name, the staff's note on a new title — is printed as written
 *     (F2.2); the frame around it comes from the dictionaries.
 *  3. **Arrows walk the slides, the dots are one tab stop.** The dots are a
 *     composite widget (F6.7) and selection follows focus inside them, so a
 *     keyboard player *sees* the deck move instead of walking eight tab stops to
 *     find out. Left/Right anywhere else in the hero do the same thing, and
 *     Home/End jump the ends.
 *  4. **No clock of its own.** A bracket slide states "starts in 2 hours" from the
 *     server's own `startsInMinutes`, in whole units. The ticking countdown on this
 *     screen belongs to the session plate and to `TournamentCard`; a third running
 *     readout in the hero would spend the same attention a third time (§4.2).
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiErrorState } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { AssetImage } from '@/components/ui/asset-image'
import { useApi } from '@/hooks/use-api'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { fetchHeroSlides, type HeroSlide } from '@/lib/mock/api'
import type { Promo, PromoKind } from '@/lib/types/promo'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Seven seconds, the same beat the promo strip rotates on — and the number the
 * server's six-slide ceiling was chosen against (`MAX_SLIDES`): the deck has to
 * come back round inside a minute, or the last campaign is one nobody sees.
 */
const ROTATE_MS = 7000

/** Mirrors the promo strip, so a campaign is the same glyph in both places. */
const KIND_ICONS: Record<PromoKind, LucideIcon> = {
  sale: icons.sale,
  tournament: icons.tournament,
  battlepass: icons.season,
  event: icons.calendar,
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = MINUTES_PER_HOUR * 24

/** What the shell renders. Every kind of slide is flattened to exactly this. */
interface SlideView {
  /** Full-bleed art layer. Never carries text — the copy below is DOM text. */
  art: ReactNode
  eyebrow: string
  eyebrowIcon: LucideIcon
  /** The club's own headline, printed as written (F2.2). */
  title: string
  /** One line under it: the campaign's pitch, the game, the staff's note. */
  body: string
  /** A fact worth a line of its own — the countdown, how many are playing. */
  meta?: string
  /** The single action. `null` for an informational campaign (no `cta`). */
  action: { label: string; ariaLabel?: string; icon: LucideIcon; run: () => void } | null
}

export function HeroCarousel({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t, tp } = useT()
  const setView = useStore((s) => s.setView)
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const reduced = useReducedMotion()

  // The surface asks as a *viewer* and the server returns fewer rows, rather than
  // the component receiving a members-only slide to hide in JSX. The viewer is
  // part of the key for the reason the promo strip's is: a guest must not be
  // served the member deck out of the cache.
  const viewer = surface === 'guest' ? 'everyone' : 'members'
  const deck = useApi(['hero', viewer], () => fetchHeroSlides(viewer))
  const slides = useMemo<HeroSlide[]>(() => deck.data ?? [], [deck.data])
  const count = slides.length

  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  /** Hover or keyboard focus: rotation is held while the player is engaged. */
  const [held, setHeld] = useState(false)
  /** The explicit stop (WCAG 2.2.2). Survives the mouse leaving the hero. */
  const [paused, setPaused] = useState(false)

  // The dots are one tab stop; the arrows walk them (F6.7).
  const dotsRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })

  // A campaign can expire between revalidations and shorten the deck under us —
  // and `tournament.call` invalidates this key on purpose, so it does.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0)
  }, [count, index])

  const go = useCallback(
    (next: number) => {
      if (count === 0) return
      const target = (next + count) % count
      setDir(target === index ? dir : target > index ? 1 : -1)
      setIndex(target)
    },
    [count, dir, index],
  )

  useEffect(() => {
    if (count < 2 || held || paused || reduced) return
    const timer = setInterval(() => {
      setDir(1)
      setIndex((i) => (i + 1) % count)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [count, held, paused, reduced])

  const slide = count > 0 ? slides[Math.min(index, count - 1)] : null

  /**
   * Slide → the five things the shell draws.
   *
   * A switch rather than three components: the shell's geometry is the promise
   * ("this corner of the screen is where the club talks to me"), and three
   * components would be three chances to break it.
   */
  const view = useMemo<SlideView | null>(() => {
    if (!slide) return null

    switch (slide.kind) {
      case 'promo': {
        const promo: Promo = slide.promo
        return {
          art: (
            <AssetImage
              src={promo.image}
              alt=""
              sizes="(min-width: 1280px) 70vw, 100vw"
              priority={index === 0}
              // The campaign *is* the image here, and a club that shipped a
              // banner without art still needs something for the copy to sit on.
              fallback="plate"
              className="object-cover object-right"
            />
          ),
          eyebrow: promo.badge,
          eyebrowIcon: KIND_ICONS[promo.kind],
          title: promo.title,
          body: promo.subtitle,
          action:
            // `cta` and `target` are set or null together, so one check covers both.
            promo.cta !== null && promo.target !== null
              ? {
                  label: promo.cta,
                  icon: icons.forward,
                  run: () => setView(promo.target as NonNullable<Promo['target']>),
                }
              : null,
        }
      }

      case 'tournament': {
        const { tournament, game } = slide
        const minutes = Math.max(0, tournament.startsInMinutes)
        const when =
          minutes >= MINUTES_PER_DAY
            ? tp('common.days', Math.round(minutes / MINUTES_PER_DAY))
            : minutes >= MINUTES_PER_HOUR
              ? tp('common.hours', Math.floor(minutes / MINUTES_PER_HOUR))
              : tp('common.minutes', Math.max(1, minutes))

        return {
          art: game ? (
            // `hideTitle`: the club's *tournament* name is this slide's headline,
            // so the cover must not anchor the game's name to the same edge.
            <GameCover
              game={game}
              hideTitle
              priority={index === 0}
              className="h-full w-full"
              sizes="(min-width: 1280px) 70vw, 100vw"
            />
          ) : (
            // The library no longer stocks the title. The bracket is still real,
            // so the slide keeps its frame instead of collapsing.
            <div className="well-shallow flex h-full w-full items-center justify-center">
              <IconTile icon={icons.tournament} size="lg" variant="primary" ticks />
            </div>
          ),
          eyebrow: t('home.heroTournamentLabel'),
          eyebrowIcon: icons.tournament,
          title: tournament.name,
          body: tournament.gameName,
          meta: `${t('home.tournamentStartsIn')} ${when}`,
          action: {
            // The hero does not take entries: the fee, the wallet check and the
            // five states of a seat belong to `TournamentCard` and to the
            // tournaments screen. This is a door, not a second Join button.
            label: t('home.heroSeeTournaments'),
            icon: icons.tournament,
            run: () => setView('tournaments'),
          },
        }
      }

      case 'release': {
        const { game, release } = slide
        return {
          art: (
            <GameCover
              game={game}
              hideTitle
              priority={index === 0}
              className="h-full w-full"
              sizes="(min-width: 1280px) 70vw, 100vw"
            />
          ),
          eyebrow: t('home.heroNewLabel'),
          eyebrowIcon: icons.games,
          title: game.name,
          // The staff's own one-line reason for the shelf (F2.2).
          body: release.note,
          meta: tp('home.heroPlayers', game.players, { n: game.players.toLocaleString() }),
          action: {
            label: t('home.heroPlayNow'),
            // Two words on screen, so the accessible name carries the title.
            ariaLabel: t('home.heroPlayLabel', { name: game.name }),
            icon: icons.play,
            run: () => setLaunchGame(game.id),
          },
        }
      }
    }
  }, [index, setLaunchGame, setView, slide, t, tp])

  // Loading and failure are the carousel's own, because it owns slide state above
  // the fetch and cannot hand that to <DataBoundary>.
  if (deck.isLoading) return <Skeleton className="h-72 w-full rounded-xl md:h-96" />
  if (deck.error) return <ApiErrorState state={deck} className="h-72 md:h-96" />
  // A quiet Tuesday — no campaign, no second bracket, nothing new on the shelf —
  // is a legitimate answer (`[]`). This is the club talking, not data the player
  // asked for, so an "Empty" plate would be noise: the hero simply is not there.
  if (!slide || !view) return null

  const announce = t('home.heroAnnounce', {
    n: index + 1,
    total: count,
    body: [view.eyebrow, view.title, view.body, view.meta].filter(Boolean).join('. '),
  })

  return (
    <section
      aria-label={t('home.heroLabel')}
      aria-roledescription="carousel"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        // `relatedTarget` is where focus is going: still inside the hero means the
        // player is moving between the arrows, the dots and the CTA, not leaving.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
      onKeyDown={(e) => {
        // The dots' own roving handler runs first (native listener) and claims the
        // key it used; anything it left is the deck's to interpret. Modifiers are
        // the browser's — Ctrl+Home is "top of page", not "first slide".
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
        if (count < 2) return
        if (e.key === 'ArrowRight') go(index + 1)
        else if (e.key === 'ArrowLeft') go(index - 1)
        else if (e.key === 'Home') go(0)
        else if (e.key === 'End') go(count - 1)
        else return
        e.preventDefault()
      }}
      className="glass tick-corners relative h-72 overflow-hidden rounded-xl md:h-96"
    >
      <AnimatePresence custom={dir} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={dir}
          initial={{ opacity: 0, x: reduced ? 0 : dir * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduced ? 0 : dir * -60 }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="absolute inset-0"
        >
          {view.art}
          {/* §3 veil, not a gradient written here (F9.7b): the hero has its own
              rung because it is 70vw of art, not a 12rem caption. */}
          <div aria-hidden className="veil-hero-v absolute inset-0" />

          {/* `pb-16` / `pr-32`: the controls own the bottom-right corner, and a
              long headline or a CTA must not run underneath them. */}
          <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 pb-16 md:p-8 md:pb-16">
            <div className="flex flex-wrap items-center gap-3">
              <span className="label-mono flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                <view.eyebrowIcon size={12} aria-hidden />
                {view.eyebrow}
              </span>
              {view.meta && (
                <span className="text-sm font-medium text-white/80">{view.meta}</span>
              )}
              {/* A stopped carousel must not look like a broken one. */}
              {paused && (
                <span className="label-mono rounded-md bg-white/10 px-2 py-1 text-[9px] text-white/70 backdrop-blur">
                  {t('home.heroPaused')}
                </span>
              )}
            </div>

            <h2 className="max-w-2xl pr-4 font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-white text-balance drop-shadow-md md:pr-32 md:text-5xl">
              {view.title}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-white/80 text-pretty md:pr-32">
              {view.body}
            </p>

            {view.action && (
              <button
                onClick={view.action.run}
                aria-label={view.action.ariaLabel}
                className="mt-1 flex w-fit items-center gap-2 rounded-md bg-primary px-7 py-3 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_-4px_rgba(229,53,43,0.8)] transition-all hover:scale-[1.03] hover:bg-primary-hover"
              >
                <view.action.icon size={17} aria-hidden />
                {view.action.label}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          {/* Vertically centred from `sm` up, pinned to the top corners below it
              (C2.9). The copy column is bottom-anchored and its height is fixed by
              the type, so as the frame narrows the column climbs and a centred
              arrow lands straight across the eyebrow and the headline. At the top
              edge there is nothing but veil at any width. */}
          <button
            onClick={() => go(index - 1)}
            className="glass absolute left-3 top-3 rounded-md p-2.5 text-white transition-colors hover:bg-white/15 sm:left-4 sm:top-1/2 sm:-translate-y-1/2"
            aria-label={t('home.heroPrev')}
          >
            <icons.back size={20} aria-hidden />
          </button>
          <button
            onClick={() => go(index + 1)}
            className="glass absolute right-3 top-3 rounded-md p-2.5 text-white transition-colors hover:bg-white/15 sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
            aria-label={t('home.heroNext')}
          >
            <icons.forward size={20} aria-hidden />
          </button>

          <div className="absolute bottom-5 right-6 flex items-center gap-3 md:bottom-6 md:right-8">
            <div ref={dotsRef} role="group" aria-label={t('home.heroSlides')} className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => go(i)}
                  // Selection follows focus inside the group: an arrow press that
                  // only moved a dot's ring would leave a keyboard player pressing
                  // Enter to see the slide they are already pointing at.
                  onFocus={() => go(i)}
                  aria-label={t('home.heroGoTo', { n: i + 1, title: titleOf(s) })}
                  aria-current={i === index ? 'true' : undefined}
                  data-roving-item
                  className={cn(
                    // A 1px-tall dot is a 1px-tall focus ring, so the hit and
                    // focus target is padded out to something a player can see.
                    'h-1 rounded-full transition-all focus-visible:outline-offset-4',
                    i === index
                      ? 'w-8 bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]'
                      : 'w-1.5 bg-white/40',
                  )}
                />
              ))}
            </div>

            {/* The stop that does not require holding the mouse still, and the
                readout of which state rotation is in. Hidden under reduced motion:
                there is no rotation to stop, and a button that toggles nothing is
                worse than no button. */}
            {!reduced && (
              <button
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                aria-label={paused ? t('home.heroPlay') : t('home.heroPause')}
                className="glass rounded-md p-1.5 text-white transition-colors hover:bg-white/15"
              >
                {paused ? (
                  <icons.play size={14} aria-hidden />
                ) : (
                  <icons.pause size={14} aria-hidden />
                )}
              </button>
            )}
          </div>
        </>
      )}

      {/* Rotation moves no focus and changes no heading, so a reader is never told
          the content under it was replaced. One sentence, politely. */}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  )
}

/**
 * The headline of a slide, for the dot that jumps to it — a dot labelled
 * "Highlight 3" names a position, not a destination.
 */
function titleOf(slide: HeroSlide): string {
  switch (slide.kind) {
    case 'promo':
      return slide.promo.title
    case 'tournament':
      return slide.tournament.name
    case 'release':
      return slide.game.name
  }
}
