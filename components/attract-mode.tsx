'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { AssetImage } from '@/components/ui/asset-image'
import { BrandLabel } from '@/components/brand-label'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { fetchActivePromos, fetchPromoTicker } from '@/lib/mock/api'
import type { Promo, PromoKind } from '@/lib/types/promo'

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

const SLIDE_DURATION_MS = 9000

/**
 * Ticker copy of last resort (F7.3).
 *
 * Used only while `/api/promos/ticker` is loading or failed: the crawl is the one
 * part of this screen that must never be empty, because an empty strip at the
 * bottom of a kiosk reads as a broken screen from across the room. Everything
 * here is evergreen club fact, not a dated offer — a stale "prize pool tonight"
 * is worse than no line at all.
 */
const TICKER_FALLBACK = [
  'NOW OPEN · 24/7',
  'RTX 4080 + 240HZ ON EVERY STATION',
  'ASK THE COUNTER ABOUT MEMBERSHIP',
]

/**
 * Fallback mark per campaign type, mirroring the promo strip on Home so the same
 * campaign is recognisable on both screens.
 */
const KIND_ICONS: Record<PromoKind, LucideIcon> = {
  sale: icons.sale,
  tournament: icons.tournament,
  battlepass: icons.season,
  event: icons.calendar,
}

/** One Ken Burns frame: either a room shot or a campaign banner. */
interface AttractSlide {
  key: string
  src: string
  /** Set when the frame is advertising something — drives the caption. */
  promo: Promo | null
}

/**
 * Room shots and campaign banners, interleaved (F7.3).
 *
 * Interleaved rather than appended so the club itself stays on screen between
 * offers: six banners in a row would turn the idle screen into an ad break. A
 * campaign with no art (`image: ''`) is skipped here and still reaches the
 * ticker — the crawl needs a sentence, not a picture.
 */
function buildSlides(promos: Promo[]): AttractSlide[] {
  const art = promos.filter((p) => p.image !== '')
  const frames: AttractSlide[] = ATTRACT_FRAMES.map((src, i) => ({
    key: `frame-${i}`,
    src,
    promo: null,
  }))
  if (art.length === 0) return frames

  const slides: AttractSlide[] = []
  for (let i = 0; i < Math.max(frames.length, art.length); i++) {
    if (i < frames.length) slides.push(frames[i])
    if (i < art.length) slides.push({ key: art[i].id, src: art[i].image, promo: art[i] })
  }
  return slides
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Idle screen.
 *
 * The campaigns shown here come from `GET /api/promos/active?surface=attract` and
 * the crawl from `GET /api/promos/ticker` — the same rows the promo strip on Home
 * reads (F7.3). Before that both were hardcoded here, so the idle screen could
 * advertise a Friday tournament on a Sunday while Home advertised tonight's.
 *
 * It asks as `viewer: 'everyone'`: nobody is signed in in front of an idle kiosk,
 * so the coin-economy campaigns are filtered out server-side.
 */
export function AttractMode() {
  const now = useClock()
  const ping = useLivePing()
  const [slide, setSlide] = useState(0)

  const useVideo = ATTRACT_VIDEOS.length > 0

  const promos = useApi(['promos/active', 'attract', 'everyone'], () =>
    fetchActivePromos('attract', 'everyone'),
  )
  const ticker = useApi(['promos/ticker', 'everyone'], () => fetchPromoTicker('everyone'))

  const slides = useMemo(() => buildSlides(promos.data ?? []), [promos.data])
  // A failed or empty fetch must not blank the crawl (see TICKER_FALLBACK).
  const tickerItems = ticker.data?.length ? ticker.data : TICKER_FALLBACK

  // The rotation is built from data that arrives after the first paint, so the
  // list grows under the timer — clamp instead of pointing past the end.
  useEffect(() => {
    if (slide >= slides.length) setSlide(0)
  }, [slide, slides.length])

  useEffect(() => {
    if (useVideo) return
    const t = setInterval(() => setSlide((i) => (i + 1) % slides.length), SLIDE_DURATION_MS)
    return () => clearInterval(t)
  }, [useVideo, slides.length])

  const current = slides[Math.min(slide, slides.length - 1)]

  const hh = now ? String(now.getHours()).padStart(2, '0') : '--'
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const dateStr = now
    ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1.2, ease: 'easeOut' } }}
      exit={{ opacity: 0, filter: 'blur(12px)', transition: { duration: 0.5, ease: 'easeIn' } }}
      className="absolute inset-0 z-40 overflow-hidden bg-black"
      aria-label="Idle screen. Move the mouse or press any key to unlock."
    >
      {/* ---------- media layer: video playlist or ken burns slideshow ---------- */}
      {useVideo ? <VideoPlaylist sources={ATTRACT_VIDEOS} /> : <KenBurnsSlideshow slide={current} />}

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
          <span className="label-mono flex items-center gap-2 text-[10px] tracking-[0.35em] text-text-low">
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
            NOW OPEN · 24/7
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
            <span className="wake-hint-copy relative">Move mouse to unlock</span>
          </motion.span>
        </motion.div>

        {/* bottom HUD: live station telemetry */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 px-4">
          <HudChip dot label="PC #17" value="READY" accent />
          <HudChip icon={<icons.network size={13} />} label="Ping" value={`${ping} ms`} />
          <HudChip icon={<icons.display size={13} />} label="Display" value="240 Hz" />
          <HudChip icon={<icons.hardware size={13} />} label="GPU" value="RTX 4080" />
          <HudChip icon={<icons.status size={13} />} label="Status" value="Optimal" accent />
        </div>
      </div>

      {/* ---------- campaign caption for the current banner ---------- */}
      {/* The copy is DOM text over the art, never baked into the file: it has to
          survive translation, a screen reader and a price change (F7.3). It sits
          in the lower-left corner the banners reserve for it, clear of the
          centred clock and above the crawl. */}
      <AnimatePresence mode="wait">
        {current?.promo && (
          <motion.div
            key={current.promo.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute bottom-16 left-5 z-20 max-w-md md:bottom-20 md:left-7"
          >
            <PromoCaption promo={current.promo} />
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
function KenBurnsSlideshow({ slide }: { slide: AttractSlide | undefined }) {
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
          scale: { duration: (SLIDE_DURATION_MS + 2000) / 1000, ease: 'linear' },
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

/**
 * Campaign copy over the current banner.
 *
 * `aria-hidden`: the crawl below already carries every live campaign as text and
 * an idle screen has no reader in front of it — announcing the same offer twice,
 * once per rotation, would make the wake-up hint impossible to hear.
 */
function PromoCaption({ promo }: { promo: Promo }) {
  const Icon = KIND_ICONS[promo.kind]
  return (
    <div aria-hidden className="glass neon-ring rounded-xl border-l-2 border-l-primary p-5 md:p-6">
      <span className="label-mono flex items-center gap-1.5 text-[10px] tracking-[0.28em] text-primary">
        <Icon size={12} />
        {promo.badge}
      </span>
      <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-tight text-text-high text-balance md:text-2xl">
        {promo.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-text-medium text-pretty">{promo.subtitle}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  HUD bits                                                           */
/* ------------------------------------------------------------------ */

function HudChip({
  icon,
  dot,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode
  dot?: boolean
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <span className="glass neon-ring flex items-center gap-2 rounded-full px-3.5 py-1.5">
      {dot && <span className="h-2 w-2 animate-pulse rounded-full bg-success" />}
      {icon && <span className={accent ? 'text-success' : 'text-primary'}>{icon}</span>}
      <span className="text-[10px] uppercase tracking-widest text-text-low">{label}</span>
      <span
        className={`text-xs font-semibold tabular-nums ${accent ? 'text-success' : 'text-text-high'}`}
      >
        {value}
      </span>
    </span>
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

/** Ping that gently drifts between 3–6 ms to feel like live monitoring. */
function useLivePing() {
  const [ping, setPing] = useState(4)
  useEffect(() => {
    const t = setInterval(() => {
      setPing(() => 3 + Math.floor(Math.random() * 4))
    }, 2200)
    return () => clearInterval(t)
  }, [])
  return ping
}
