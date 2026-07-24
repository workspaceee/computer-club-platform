'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Cpu, Gauge, MousePointer2, Wifi } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

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

const ATTRACT_FRAMES = ['/attract/frame-1.png', '/attract/frame-2.png', '/attract/frame-3.png']

const SLIDE_DURATION_MS = 9000

const TICKER_ITEMS = [
  'HAPPY HOURS 22:00 — 06:00 · −30% ON ALL TARIFFS',
  'CS2 5v5 TOURNAMENT EVERY FRIDAY · PRIZE POOL 50 000 ₽',
  'BOOTCAMP ROOM AVAILABLE · BOOK AT THE FRONT DESK',
  'NEW: RTX 4080 + 240HZ ON EVERY STATION',
  'BRING A FRIEND — BOTH GET +1 HOUR FREE',
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AttractMode() {
  const now = useClock()
  const ping = useLivePing()
  const [slide, setSlide] = useState(0)

  const useVideo = ATTRACT_VIDEOS.length > 0

  useEffect(() => {
    if (useVideo) return
    const t = setInterval(() => setSlide((i) => (i + 1) % ATTRACT_FRAMES.length), SLIDE_DURATION_MS)
    return () => clearInterval(t)
  }, [useVideo])

  const hh = now ? String(now.getHours()).padStart(2, '0') : '--'
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--'
  const ss = now ? String(now.getSeconds()).padStart(2, '0') : '--'
  const colonOn = now ? now.getSeconds() % 2 === 0 : true
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
      {useVideo ? (
        <VideoPlaylist sources={ATTRACT_VIDEOS} />
      ) : (
        <KenBurnsSlideshow index={slide} />
      )}

      {/* readability veils: base dim + radial scrim behind the clock + edge gradient */}
      <div className="absolute inset-0 bg-black/35" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 44% at 50% 47%, rgba(3,4,8,0.72) 0%, rgba(3,4,8,0.35) 55%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(3,4,8,0.8) 0%, transparent 26%, transparent 58%, rgba(3,4,8,0.92) 100%)',
        }}
      />

      {/* subtle scanline texture for the CRT / broadcast feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* ---------- corner brackets (HUD frame) ---------- */}
      <CornerBrackets />

      {/* ---------- ambient layer ---------- */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between pb-16 pt-9 md:pb-20">
        {/* top strip: logo + live status */}
        <div className="flex w-full flex-col items-center gap-2.5">
          <motion.div
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="neon-logo relative h-12 w-64 md:h-14 md:w-80"
          >
            <Image
              src="/imba-logo-full.png"
              alt="IMBA Cyber Club"
              fill
              sizes="320px"
              className="object-contain"
            />
          </motion.div>
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
          <div className="neon-text flex items-center justify-center font-display font-semibold leading-none tracking-tight tabular-nums text-text-high">
            <span className="text-[7rem] md:text-[12rem] xl:text-[14rem]">{hh}</span>
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-1 -translate-y-[0.06em] text-[6rem] font-normal text-primary md:mx-2 md:text-[10rem] xl:text-[12rem]"
            >
              :
            </motion.span>
            <span className="text-[7rem] md:text-[12rem] xl:text-[14rem]">{mm}</span>
          </div>

          {/* seconds as a thin progress line filling over the minute */}
          <div className="mt-6 flex w-56 items-center gap-3 md:mt-8 md:w-80">
            <div className="relative h-px flex-1 overflow-hidden bg-white/12">
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: now ? `${(now.getSeconds() / 59) * 100}%` : '0%' }}
              />
            </div>
            <span className="label-mono w-6 text-right text-[11px] tabular-nums tracking-widest text-primary">
              {ss}
            </span>
          </div>

          {/* date */}
          <span className="label-mono mt-5 text-xs tracking-[0.32em] text-text-medium md:mt-6 md:text-sm">
            {dateStr}
          </span>

          {/* slideshow progress */}
          {!useVideo && (
            <div className="mt-6 flex items-center gap-2">
              {ATTRACT_FRAMES.map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    i === slide ? 'w-8 bg-primary' : 'w-3 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}

          {/* wake hint */}
          <motion.span
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="neon-ring mt-9 flex items-center gap-2.5 rounded-full border border-white/12 bg-black/45 px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-text-medium shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
          >
            <MousePointer2 size={13} className="text-primary" />
            Move mouse to unlock
          </motion.span>
        </motion.div>

        {/* bottom HUD: live station telemetry */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 px-4">
          <HudChip dot label="PC #17" value="READY" accent />
          <HudChip icon={<Wifi size={13} />} label="Ping" value={`${ping} ms`} />
          <HudChip icon={<Gauge size={13} />} label="Display" value="240 Hz" />
          <HudChip icon={<Cpu size={13} />} label="GPU" value="RTX 4080" />
          <HudChip icon={<Activity size={13} />} label="Status" value="Optimal" accent />
        </div>
      </div>

      {/* ---------- promo ticker ---------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-black/70 backdrop-blur-md">
        {/* thin accent rule above the ticker */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="marquee flex overflow-hidden py-3">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="marquee-track flex shrink-0 items-center"
            >
              {TICKER_ITEMS.map((item) => (
                <span
                  key={item}
                  className="label-mono flex items-center gap-6 whitespace-nowrap px-6 text-[11px] tracking-[0.18em] text-text-medium"
                >
                  {item}
                  <span className="h-1 w-1 rotate-45 bg-primary" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Decorative HUD frame                                               */
/* ------------------------------------------------------------------ */

function CornerBrackets() {
  const base = 'pointer-events-none absolute h-10 w-10 border-white/20 md:h-14 md:w-14'
  return (
    <div aria-hidden className="absolute inset-0 z-10 m-5 md:m-7">
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
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

function KenBurnsSlideshow({ index }: { index: number }) {
  return (
    <AnimatePresence>
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1.12 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 1.6, ease: 'easeInOut' },
          scale: { duration: (SLIDE_DURATION_MS + 2000) / 1000, ease: 'linear' },
        }}
        className="absolute inset-0"
      >
        <Image
          src={ATTRACT_FRAMES[index] || '/placeholder.svg'}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
      </motion.div>
    </AnimatePresence>
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
