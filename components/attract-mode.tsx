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

  const timeStr = now
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--'
  const secStr = now ? String(now.getSeconds()).padStart(2, '0') : '--'
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
      {ATTRACT_VIDEOS.length > 0 ? <VideoPlaylist sources={ATTRACT_VIDEOS} /> : <KenBurnsSlideshow />}

      {/* readability veil so the HUD stays legible over any footage */}
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,6,10,0.65) 0%, transparent 30%, transparent 62%, rgba(5,6,10,0.85) 100%)',
        }}
      />

      {/* ---------- ambient layer ---------- */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-10">
        {/* pulsing club logo */}
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-12 w-64 md:h-14 md:w-80"
        >
          <Image
            src="/imba-logo-full.png"
            alt="IMBA Cyber Club"
            fill
            sizes="320px"
            className="object-contain drop-shadow-[0_0_32px_rgba(229,53,43,0.45)]"
          />
        </motion.div>

        {/* giant terminal clock */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-end gap-3">
            <span className="font-mono text-[6rem] font-bold leading-[0.85] tracking-tighter tabular-nums text-text-high md:text-[10rem] xl:text-[12rem]">
              {timeStr}
            </span>
            <span className="mb-3 font-mono text-3xl font-semibold tabular-nums text-primary md:mb-5 md:text-5xl">
              :{secStr}
            </span>
          </div>
          <span className="label-mono text-sm tracking-[0.3em] text-text-medium md:text-base">
            {dateStr}
          </span>

          {/* wake hint */}
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-8 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-text-medium backdrop-blur-sm"
          >
            <MousePointer2 size={13} className="text-primary" />
            Move mouse to unlock
          </motion.span>
        </motion.div>

        {/* bottom HUD: live station telemetry */}
        <div className="flex flex-wrap items-center justify-center gap-3 px-4">
          <HudChip dot label="PC #17" value="READY" accent />
          <HudChip icon={<Wifi size={13} />} label="Ping" value={`${ping} ms`} />
          <HudChip icon={<Gauge size={13} />} label="Display" value="240 Hz" />
          <HudChip icon={<Cpu size={13} />} label="GPU" value="RTX 4080" />
          <HudChip icon={<Activity size={13} />} label="Status" value="Optimal" accent />
        </div>
      </div>

      {/* ---------- promo ticker ---------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/60 backdrop-blur-md">
        <div className="marquee flex overflow-hidden py-2.5">
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
                  <span className="h-1 w-1 rounded-full bg-primary" />
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

function KenBurnsSlideshow() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % ATTRACT_FRAMES.length), SLIDE_DURATION_MS)
    return () => clearInterval(t)
  }, [])

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
    <span className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5">
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
