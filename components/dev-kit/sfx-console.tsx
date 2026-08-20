'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { icons } from '@/lib/icons'
import { SFX, SFX_IDS, type SfxId } from '@/lib/assets/sfx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

/**
 * Audition console for the F8.1 sound set.
 *
 * This exists because every other check on these files is arithmetic: the
 * verifier can prove a cue is under 450 ms and below −12 dBFS, but not that it
 * sounds like the launcher rather than like a phone. Only ears settle that, so
 * the set needs a place to be heard next to its own claims.
 *
 * Deliberately *not* the playback engine (F8.2). This component talks to
 * `Audio` directly and keeps its own volume, so nothing here becomes load-bearing
 * for the product — when `lib/sfx.ts` lands it replaces this page's guts without
 * the asset contract moving. What the page does share with the product is the
 * catalogue: ids, paths and `critical` all come from `lib/assets/sfx.ts`, so a
 * cue that plays here is a cue that exists there.
 */

interface Measured {
  ms: number
  peakDb: number
  rmsDb: number
  /** Normalised envelope, 96 buckets — enough to read shape, cheap to draw. */
  envelope: number[]
}

export function SfxConsole() {
  const [volume, setVolume] = useState(60)
  const [measured, setMeasured] = useState<Partial<Record<SfxId, Measured>>>({})
  const [playing, setPlaying] = useState<SfxId | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [sequencing, setSequencing] = useState(false)

  /** Live volume for cues already constructed, so the slider affects the tail too. */
  const active = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    if (active.current) active.current.volume = volume / 100
  }, [volume])

  /**
   * Decode once for the waveform + readouts. Done in the browser rather than
   * shipped as numbers on purpose: a measurement copied from the generator
   * would agree with the generator by construction and prove nothing about the
   * bytes actually being served.
   */
  useEffect(() => {
    let cancelled = false
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    void (async () => {
      for (const id of SFX_IDS) {
        try {
          const res = await fetch(SFX[id].src)
          const buf = await ctx.decodeAudioData(await res.arrayBuffer())
          if (cancelled) return

          const data = buf.getChannelData(0)
          const buckets = 96
          const per = Math.max(1, Math.floor(data.length / buckets))
          const envelope: number[] = []
          let peak = 0
          let sumSq = 0

          for (let b = 0; b < buckets; b++) {
            let local = 0
            for (let i = b * per; i < Math.min((b + 1) * per, data.length); i++) {
              const v = Math.abs(data[i])
              if (v > local) local = v
            }
            envelope.push(local)
          }
          for (let i = 0; i < data.length; i++) {
            const v = Math.abs(data[i])
            if (v > peak) peak = v
            sumSq += data[i] * data[i]
          }

          const norm = peak || 1
          setMeasured((prev) => ({
            ...prev,
            [id]: {
              ms: Math.round(buf.duration * 1000),
              peakDb: 20 * Math.log10(peak || 1e-9),
              rmsDb: 20 * Math.log10(Math.sqrt(sumSq / data.length) || 1e-9),
              envelope: envelope.map((v) => v / norm),
            },
          }))
        } catch {
          // A decode failure is the verifier's business, not this page's.
        }
      }
      void ctx.close()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const play = useCallback(
    async (id: SfxId) => {
      // Restarting from zero rather than overlapping: overlap suppression is
      // F8.2's job, and faking it here would hide what the raw file does.
      active.current?.pause()
      const audio = new Audio(SFX[id].src)
      audio.volume = volume / 100
      active.current = audio
      setPlaying(id)
      audio.addEventListener('ended', () => {
        setPlaying((cur) => (cur === id ? null : cur))
      })
      try {
        await audio.play()
        setBlocked(false)
      } catch {
        // Autoplay policy — the reason F8.5 has to arm sound on a real gesture.
        setBlocked(true)
        setPlaying(null)
      }
    },
    [volume],
  )

  /** Hear the set as a set: seven cues in a row expose a stranger among them. */
  const playAll = useCallback(async () => {
    setSequencing(true)
    for (const id of SFX_IDS) {
      await play(id)
      await new Promise((r) => setTimeout(r, (measured[id]?.ms ?? 450) + 260))
    }
    setSequencing(false)
    setPlaying(null)
  }, [play, measured])

  return (
    <div className="flex flex-col gap-6">
      <Panel variant="strong" radius="lg" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-56 flex-1">
            <Slider
              label="Preview volume"
              value={volume}
              onChange={setVolume}
              suffix="%"
              min={0}
              max={100}
            />
            <p className="mt-2 text-xs leading-relaxed text-text-low">
              {
                'Page-local, not the F8.3 setting. The files themselves peak at −20…−14 dBFS, so at 100% here they are still quieter than a game.'
              }
            </p>
          </div>
          <Button variant="primary" size="md" onClick={playAll} disabled={sequencing}>
            {sequencing ? <icons.pending className="animate-spin" /> : <icons.play />}
            {sequencing ? 'Playing set…' : 'Play all in order'}
          </Button>
        </div>

        {blocked && (
          <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
            <icons.warning className="mt-0.5 size-4 shrink-0" />
            {
              'The browser refused playback until you interact with the page — click any cue below. This is exactly the autoplay policy F8.5 has to work around on a freshly booted station.'
            }
          </p>
        )}
      </Panel>

      <div className="flex flex-col gap-3">
        {SFX_IDS.map((id) => {
          const entry = SFX[id]
          const m = measured[id]
          const isPlaying = playing === id

          return (
            <Panel
              key={id}
              data-cue={id}
              data-playing={isPlaying || undefined}
              variant={isPlaying ? 'strong' : 'flat'}
              radius="lg"
              className={cn('transition-colors', isPlaying && 'ring-1 ring-primary/60')}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  variant={isPlaying ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => void play(id)}
                  aria-label={`Play ${id}`}
                  className="shrink-0"
                >
                  <icons.play />
                  Play
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="label-mono text-xs text-text-high">{id}</span>
                    {entry.critical ? (
                      <Badge tone="warning" variant="soft" size="sm">
                        interrupts a game
                      </Badge>
                    ) : (
                      <Badge tone="neutral" variant="outline" size="sm">
                        silent in game
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-text-medium">{entry.purpose}</p>
                </div>

                <Waveform envelope={m?.envelope} playing={isPlaying} />

                <dl className="flex shrink-0 gap-4 text-right sm:w-36 sm:flex-col sm:gap-1">
                  <div className="flex gap-1.5 sm:justify-end">
                    <dt className="label-mono text-[10px] text-text-low">len</dt>
                    <dd className="label-mono text-[10px] tabular-nums text-text-medium">
                      {m ? `${m.ms} ms` : '—'}
                    </dd>
                  </div>
                  <div className="flex gap-1.5 sm:justify-end">
                    <dt className="label-mono text-[10px] text-text-low">peak</dt>
                    <dd className="label-mono text-[10px] tabular-nums text-text-medium">
                      {m ? `${m.peakDb.toFixed(1)} dB` : '—'}
                    </dd>
                  </div>
                  <div className="flex gap-1.5 sm:justify-end">
                    <dt className="label-mono text-[10px] text-text-low">rms</dt>
                    <dd className="label-mono text-[10px] tabular-nums text-text-medium">
                      {m ? `${m.rmsDb.toFixed(1)} dB` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Envelope bars, peak-normalised.
 *
 * Normalised on purpose: at true scale a −20 dBFS cue is a flat line, and the
 * useful question here is the *shape* — where the attack sits, how fast it
 * decays, whether the tail reaches zero. Absolute level is the dB readout's job.
 */
function Waveform({ envelope, playing }: { envelope?: number[]; playing: boolean }) {
  return (
    <div
      className="flex h-10 min-w-0 flex-1 items-center gap-px sm:max-w-64"
      aria-hidden="true"
    >
      {(envelope ?? Array.from({ length: 96 }, () => 0)).map((v, i) => (
        <span
          key={i}
          className={cn(
            'flex-1 rounded-full transition-colors',
            playing ? 'bg-primary' : 'bg-steel/70',
          )}
          style={{ height: `${Math.max(2, v * 100)}%` }}
        />
      ))}
    </div>
  )
}
