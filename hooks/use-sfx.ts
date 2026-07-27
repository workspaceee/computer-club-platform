'use client'

/**
 * F8.2 — how a component plays a sound.
 *
 * Three hooks over the one engine in `lib/sfx.ts`:
 *
 *   `useSfx()` — what a screen wants: a stable `play(id)`. The identity never
 *     changes, so it can sit in a `useEffect`/`useCallback` dependency list
 *     without retriggering anything, and a component that plays a cue never
 *     re-renders because some *other* cue is sounding.
 *
 *   `useSfxPreload()` — mounted **once**, in the app shell. Decodes the set
 *     during idle time so the first cue is instant. Mounting it twice is
 *     harmless (the engine dedupes), but it is the shell's job.
 *
 *   `useSfxState()` — subscribes to engine state. For the settings panel (F8.3)
 *     and the dev console. Screens should not need it: nothing in the interface
 *     may look different because sound is unavailable.
 *
 * The split is deliberate. Sound is the most re-render-prone thing in a UI if
 * you model it as state, so playback is a call into a singleton, and only the two
 * places that genuinely *display* audio state subscribe to it.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SfxId } from '@/lib/assets/sfx'
import { sfx, type SfxOutcome, type SfxPlayOptions, type SfxSnapshot } from '@/lib/sfx'

/* ------------------------------------------------------------------ *
 * Playing
 * ------------------------------------------------------------------ */

export interface UseSfx {
  /** Play a cue. Returns why it was (or was not) heard; never throws. */
  play: (id: SfxId, options?: SfxPlayOptions) => SfxOutcome
  /** Cut every ringing cue — locking the station, ending a visit. */
  stopAll: () => void
}

/**
 * ```tsx
 * const { play } = useSfx()
 * play('success')
 * ```
 *
 * Call it in the handler that caused the thing, not in an effect watching the
 * result: an effect on derived state fires again on unrelated re-renders, and the
 * suppression window would then hide a bug instead of the burst it was built for.
 */
export function useSfx(): UseSfx {
  // The engine is a module singleton, so these are already stable; the memo
  // exists so the returned object is stable too and can be destructured or
  // passed down without invalidating consumers' memoisation.
  return useMemo<UseSfx>(() => ({ play: sfx.play, stopAll: sfx.stopAll }), [])
}

/* ------------------------------------------------------------------ *
 * Preloading
 * ------------------------------------------------------------------ */

/**
 * Decode the whole set ahead of first use. Mount once, near the root.
 *
 * Deferred to idle: during boot the station is fetching covers, fonts and the
 * session state, and none of the seven cues is needed in the first second.
 * `requestIdleCallback` where it exists, a short timeout where it does not
 * (Safari) — the point is only "not on the critical path".
 */
export function useSfxPreload(enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const run = () => {
      if (!cancelled) void sfx.preload()
    }

    const idle = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
        cancelIdleCallback?: (handle: number) => void
      }
    ).requestIdleCallback

    if (idle) {
      const handle = idle(run, { timeout: 3_000 })
      return () => {
        cancelled = true
        ;(window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(
          handle,
        )
      }
    }

    const timer = setTimeout(run, 1_200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [enabled])
}

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

/**
 * The engine's state, re-rendering on change.
 *
 * `useSyncExternalStore` rather than an effect mirroring into `useState`: the
 * engine is mutated from event handlers and from decode callbacks, and this is
 * the only subscription that cannot tear between them.
 */
export function useSfxState(): SfxSnapshot {
  return useSyncExternalStore(sfx.subscribe, sfx.getSnapshot, sfx.getSnapshot)
}

/**
 * Volume/mute control, for the settings panel that F8.3 builds.
 *
 * Exposed here so the panel never reaches into `lib/sfx.ts` itself: F8.3 owns
 * *where the numbers are stored*, this hook owns *how they reach the mixer*.
 * `volume` is `0…1`; the slider's percent is the panel's own presentation.
 */
export function useSfxVolume(): {
  volume: number
  muted: boolean
  setVolume: (value: number) => void
  setMuted: (value: boolean) => void
} {
  const { volume, muted } = useSfxState()
  return {
    volume,
    muted,
    setVolume: useCallback((value: number) => sfx.setVolume(value), []),
    setMuted: useCallback((value: boolean) => sfx.setMuted(value), []),
  }
}
