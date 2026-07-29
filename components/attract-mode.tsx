'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { AssetImage } from '@/components/ui/asset-image'
import { AttractShowcase } from '@/components/attract/showcase'
import { BrandLabel } from '@/components/brand-label'
import { StationPanel } from '@/components/station-panel'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { useAttractPlaylist, type AttractSlide } from '@/hooks/use-attract-playlist'
import { useT } from '@/lib/i18n/provider'
import { fetchPromoTicker } from '@/lib/mock/api'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

/**
 * Drop gameplay clips (muted mp4) into `public/attract/` and list them
 * here — they will play fullscreen in a rotating playlist.
 * When empty, the cinematic Ken Burns slideshow below is used instead.
 */
const ATTRACT_VIDEOS: string[] = [
  // '/attract/clip-1.mp4',
  // '/attract/clip-2.mp4',
]

const ATTRACT_FRAMES = ['/attract/frame-1.webp', '/attract/frame-2.webp', '/attract/frame-3.webp']

/**
 * How long one slide holds (C1.8).
 *
 * Two values, not one: a room photograph is understood the moment it appears,
 * while a slide that lists four zones with their free-seat counts is a small
 * table — and a table that leaves before it has been read is worse than no
 * table, because the walk-in now knows the club is hiding something from them.
 * So anything carrying data gets a third more time, and the bare frames keep the
 * rotation moving.
 */
const SLIDE_MS = 9000
const DATA_SLIDE_MS = 12_000

function slideDuration(slide: AttractSlide | undefined): number {
  return slide === undefined || slide.kind === 'frame' ? SLIDE_MS : DATA_SLIDE_MS
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Idle screen (C1.8).
 *
 * This used to be three room photographs, marketing's banners and a clock — a
 * screensaver that said the club exists. It now sells: tonight's tournament, the
 * free seats per zone, the bar's promoted items, the season ladder and the
 * battle pass, rotating with the campaign art. Every number comes from the mock
 * API through `useAttractPlaylist`, so the doorway sees the same rows the
 * counter does; the crawl at the bottom still reads `GET /api/promos/ticker`.
 *
 * Everything asks as `viewer: 'everyone'` and no slide reads a viewer-specific
 * field: nobody is signed in in front of an idle kiosk, so the coin-economy
 * campaigns are filtered out server-side and "level 12" is never shown to an
 * empty chair.
 */
export function AttractMode() {
  const { t, formatFullDate } = useT()
  const now = useClock()
  const [slide, setSlide] = useState(0)

  const useVideo = ATTRACT_VIDEOS.length > 0

  const { slides } = useAttractPlaylist(ATTRACT_FRAMES)
  const ticker = useApi(['promos/ticker', 'everyone'], () => fetchPromoTicker('everyone'))

  /**
   * Crawl copy of last resort (F7.3).
   *
   * Used only while `/api/promos/ticker` is loading or failed: the crawl is the
   * one part of this screen that must never be empty, because an empty strip at
   * the bottom of a kiosk reads as a broken screen from across the room.
   * Evergreen club fact only, never a dated offer — a stale "prize pool tonight"
   * is worse than no line at all.
   */
  const tickerFallback = useMemo(
    () => [
      t('attract.fallbackHours'),
      t('attract.fallbackSpecs'),
      t('attract.fallbackMembership'),
    ],
    [t],
  )
  const tickerItems = ticker.data?.length ? ticker.data : tickerFallback

  // The rotation is built from data that arrives after the first paint, so the
  // list grows under the timer — clamp instead of pointing past the end.
  useEffect(() => {
    if (slide >= slides.length) setSlide(0)
  }, [slide, slides.length])

  const current = slides[Math.min(slide, slides.length - 1)]

  // A timeout keyed on the current slide rather than one interval for all of
  // them: the hold now depends on what is on screen (see `slideDuration`), and
  // an interval would give the tournament panel the photograph's nine seconds.
  useEffect(() => {
    if (useVideo || slides.length <= 1) return
    const timer = setTimeout(
      () => setSlide((i) => (i + 1) % slides.length),
      slideDuration(current),
    )
    return () => clearTimeout(timer)
  }, [useVideo, slides.length, current])

  const hh = now ? String(now.getHours()).padStart(2, '0') : '--'
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  // The same formatter the lock screen's clock uses, so the two screens do not
  // disagree about what day it is in Russian (F2.4) — this was `en-US`, hard
  // coded, on a screen the club can run in three languages.
  const dateStr = now ? formatFullDate(now) : ''

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1.2, ease: 'easeOut' } }}
      exit={{ opacity: 0, filter: 'blur(12px)', transition: { duration: 0.5, ease: 'easeIn' } }}
      // `veil-base` (§3), not `bg-black`: the opaque floor under the media is
      // still a black picked for a screen, so it comes from a token (F9.7b).
      className="veil-base absolute inset-0 z-40 overflow-hidden"
      aria-label={t('attract.screenLabel')}
    >
      {/* ---------- media layer: video playlist or ken burns slideshow ---------- */}
      {useVideo ? (
        <VideoPlaylist sources={ATTRACT_VIDEOS} />
      ) : (
        <KenBurnsSlideshow slide={current} durationMs={slideDuration(current)} />
      )}

      {/* Readability veils (§3.2): floor, radial scrim under the clock, edge
          gradient, CRT texture. The densities live in `globals.css`
          (`.veil-attract-*`, `.scanlines` — F9.2) rather than inline here,
          because this stack has to survive media nobody previewed: whatever the
          admin panel uploads passes through the same four layers, in this order. */}
      <div aria-hidden className="veil-attract-floor absolute inset-0" />
      <div aria-hidden className="veil-attract-scrim absolute inset-0" />
      <div aria-hidden className="veil-attract-v absolute inset-0" />
      <div aria-hidden className="scanlines absolute inset-0" />

      {/* ---------- ambient layer ---------- */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between pb-16 pt-9 md:pb-20">
        {/* top strip: live status. The lockup that used to sit above it now signs
            the bottom-right corner (see `BrandLabel`), mirroring the promo
            caption's corner and leaving the clock uncontested. */}
        <div className="flex w-full flex-col items-center gap-2.5">
          <span className="label-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-text-low">
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
            {t('attract.nowOpen')}
          </span>
        </div>

        {/* giant display clock — clean HH:MM centerpiece */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* Neon-tube digits: hollow glyphs, all the light on the contour —
              no framing box, per request. */}
          <div className="neon-digits flex items-center justify-center font-clock font-semibold leading-none tabular-nums text-text-high">
            {/* Halfway between the 5/7.5/9rem original (a marquee that ate the
                frame) and the 3.75/5.25/6.25rem correction (too small for a
                clock read from across the room). */}
            <span className="text-[4.5rem] md:text-[6.4rem] xl:text-[7.6rem]">{hh}</span>
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-0.5 -translate-y-[0.06em] text-[3.75rem] font-normal text-primary md:mx-1 md:text-[5.4rem] xl:text-[6.4rem]"
              // The hollow treatment inherits (`-webkit-text-fill-color` /
              // `-webkit-text-stroke` both cascade), and an outlined colon at
              // this size all but disappears — so the separator opts back into
              // a solid red glyph.
              style={{ WebkitTextFillColor: 'currentColor', WebkitTextStroke: '0' }}
            >
              :
            </motion.span>
            <span className="text-[4.5rem] md:text-[6.4rem] xl:text-[7.6rem]">{mm}</span>
          </div>

          {/* Date, sitting on a hairline rule that replaces the old seconds
              progress bar + numeric readout: no seconds anywhere in the
              product now, and the rule keeps the composition's horizontal
              anchor under the digits. */}
          <div className="mt-6 flex w-[20rem] items-center gap-4 md:mt-8 md:w-[30rem]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/45" />
            <span className="label-mono whitespace-nowrap text-xs tracking-[0.32em] text-text-medium md:text-sm">
              {dateStr}
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/45" />
          </div>

          {/* slideshow progress */}
          {!useVideo && (
            <div className="mt-6 flex items-center gap-2">
              {slides.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    i === slide ? 'w-8 bg-primary' : 'w-3 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Wake hint — the only instruction on the idle screen, so it gets a
              deliberate entrance (fades up once the clock lockup has landed)
              and then a permanent, legible attention loop: breathing halo,
              warming copy and a red scan beam. `overflow-hidden` clips the
              beam to the pill; the neon ring still paints over it because its
              pseudo-elements sit at z-index 3. */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: 'easeOut' }}
            // `pill-deep` (§3.3): a plate on media nobody previewed — the video
            // or the slideshow — which is why this rung exists at all.
            // `neon-ring` is T1 (§4.2) and this is the idle screen's only one:
            // the hint is the single actionable thing on a screen with no
            // controls, so the traveling light and its own attention loop
            // belong to the same element rather than competing across seven.
            className="neon-ring wake-hint pill-deep relative mt-9 flex items-center gap-2.5 overflow-hidden rounded-full border border-primary/25 px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-text-high backdrop-blur-md"
          >
            <span
              aria-hidden
              className="wake-hint-scan pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
            />
            {/* The mark mimes the gesture it is asking for — a small horizontal
                nudge reads as "move", which a static mouse icon does not. */}
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex"
            >
              <icons.controls size={13} className="text-primary" />
            </motion.span>
            <span className="wake-hint-copy relative">{t('attract.unlockHint')}</span>
          </motion.span>
        </motion.div>

        {/* Bottom HUD — the same station strip as the lock screen (C1.6), which
            is the point: this is the seam that makes the two screens one product
            (docs/DESIGN.md §5.3), so it is one component and not a twin.

            The ping here used to be `3 + Math.random() * 4` refreshed every
            2.2 s — a number invented by the screen advertising the club's
            network. It now comes from the agent or reads as a dash. */}
        <StationPanel className="justify-center px-4" />
      </div>

      {/* ---------- what the club is selling right now ---------- */}
      {/* The copy is DOM text over the art, never baked into the file: it has to
          survive translation, a screen reader and a price change (F7.3). It sits
          in the lower-left corner the banners reserve for it, clear of the
          centred clock and above the crawl — the one place on the screen a
          walk-in learns to look, which is why all six kinds of slide render into
          the same corner at the same width instead of moving per kind. */}
      <AnimatePresence mode="wait">
        {current && current.kind !== 'frame' && (
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
            // Faster out than in (`mode="wait"` holds the enter until the exit
            // finishes): at 0.6 s each the corner sat empty for a fifth of a
            // second longer than reads as a transition, which on a kiosk looks
            // like the panel failed to load rather than changed.
            exit={{ opacity: 0, y: -8, transition: { duration: 0.3, ease: 'easeIn' } }}
            // Clear of the station strip, which shares the column's `pb-16/20`:
            // at the same offset the panel covered the seat's own chip, so the
            // screen was advertising the club over the top of the club's status.
            className="absolute bottom-28 left-5 z-20 w-[22rem] max-w-[calc(100vw-2.5rem)] md:bottom-32 md:left-7 md:w-[26rem]"
          >
            <AttractShowcase slide={current} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- corner signature ---------- */}
      {/* Mirrors the promo caption's band on the opposite side, above the crawl. */}
      <BrandLabel
        named={false}
        className="absolute bottom-16 right-5 z-20 md:bottom-20 md:right-7"
      />

      {/* ---------- promo ticker ---------- */}
      {/* `scrim` (§3.3): the band's job is to erase the frame under a moving
          marquee, which is the same job a modal backdrop does — same depth. */}
      <div className="scrim absolute inset-x-0 bottom-0 z-20 backdrop-blur-md">
        {/* thin accent rule above the ticker */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <PromoTicker items={tickerItems} />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bottom crawl                                                       */
/* ------------------------------------------------------------------ */

/** Crawl speed. Constant px/s regardless of how much copy is live. */
const TICKER_PX_PER_SECOND = 80

/**
 * The strip along the bottom edge.
 *
 * Two identical tracks translated by `-100%`: the second takes over exactly as
 * the first leaves — but that is only seamless while **one track is at least as
 * wide as the screen**. Three short evergreen lines measure ~700px against
 * 2240px of kiosk glass, so the strip spent most of its cycle empty and the copy
 * arrived late, sliding in from the right edge. An empty rule at the bottom of
 * an idle screen reads as a half-drawn interface from across the room.
 *
 * So the sequence is repeated until it covers the viewport *before* it ever
 * moves: the crawl is full at the first paint and stays full. The duration is
 * derived from the resulting width instead of being a fixed `40s`, otherwise
 * filling the screen would make the copy scroll several times faster than it
 * can be read.
 */
function PromoTicker({ items }: { items: string[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [repeat, setRepeat] = useState(1)
  const [unitWidth, setUnitWidth] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current
      const track = trackRef.current
      if (!viewport || !track) return
      const cells = Array.from(track.children) as HTMLElement[]
      // Width of exactly one pass through `items`, never of the whole track:
      // measuring the track would feed its own growth back into the next
      // calculation and the repeat count would never settle.
      const unit = cells
        .slice(0, items.length)
        .reduce((width, cell) => width + cell.offsetWidth, 0)
      if (unit <= 0) return
      setUnitWidth(unit)
      setRepeat(Math.max(1, Math.ceil(viewport.clientWidth / unit)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewportRef.current as Element)
    // Webfonts land after the first measure and change every cell's width, so
    // the fill computed against fallback metrics has to be redone.
    document.fonts?.ready.then(measure).catch(() => {})
    return () => observer.disconnect()
  }, [items])

  // Flattened so both tracks render the same list; the copy index keeps keys
  // unique when a line repeats, which it does by design here.
  const sequence = useMemo(
    () =>
      Array.from({ length: repeat }, (_, pass) =>
        items.map((item) => ({ key: `${pass}-${item}`, item })),
      ).flat(),
    [items, repeat],
  )

  const trackWidth = unitWidth * repeat
  const duration = trackWidth > 0 ? trackWidth / TICKER_PX_PER_SECOND : undefined

  return (
    <div ref={viewportRef} className="marquee flex overflow-hidden py-3">
      {[0, 1].map((copy) => (
        <div
          key={copy}
          ref={copy === 0 ? trackRef : undefined}
          aria-hidden={copy === 1}
          className="marquee-track flex shrink-0 items-center"
          style={duration ? { animationDuration: `${duration}s` } : undefined}
        >
          {sequence.map(({ key, item }) => (
            <span
              key={key}
              // `uppercase` in CSS, not in the data: the campaign rows are the
              // same ones Home renders in sentence case, and the crawl's house
              // style must not force the copy writer's hand.
              className="label-mono flex items-center gap-6 whitespace-nowrap px-6 text-[11px] uppercase tracking-[0.18em] text-text-medium"
            >
              {item}
              <span className="h-1 w-1 rotate-45 bg-primary" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Media layers                                                       */
/* ------------------------------------------------------------------ */

function VideoPlaylist({ sources }: { sources: string[] }) {
  const [index, setIndex] = useState(0)

  return (
    <AnimatePresence>
      <motion.video
        key={sources[index]}
        src={sources[index]}
        autoPlay
        muted
        playsInline
        loop={sources.length === 1}
        onEnded={() => setIndex((i) => (i + 1) % sources.length)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </AnimatePresence>
  )
}

/**
 * One frame at a time, slowly zoomed. The frame may be a room shot or a campaign
 * banner (F7.3) — identical treatment on purpose: the banners were generated
 * text-free precisely so they could be scrimmed and cropped like a photograph.
 */
function KenBurnsSlideshow({
  slide,
  durationMs,
}: {
  slide: AttractSlide | undefined
  /** How long this slide holds, so the zoom is still moving when it leaves. */
  durationMs: number
}) {
  if (!slide) return null
  return (
    <AnimatePresence>
      <motion.div
        key={slide.key}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1.12 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 1.6, ease: 'easeInOut' },
          scale: { duration: (durationMs + 2000) / 1000, ease: 'linear' },
        }}
        className="absolute inset-0"
      >
        <AssetImage
          src={slide.src}
          alt=""
          // The idle screen is never the entry point of a page load — it appears
          // after minutes of inactivity, by which time nothing is competing for
          // bandwidth, so no frame needs `priority`.
          sizes="100vw"
          className="object-cover"
          // Was `slide.src || '/placeholder.svg'`, which put a pale stock glyph
          // full-bleed on a dark idle screen visible from across the room. The
          // plate is the point of F7.5: it reads as intended art, not as a fault.
          fallback="plate"
        />
      </motion.div>
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}
