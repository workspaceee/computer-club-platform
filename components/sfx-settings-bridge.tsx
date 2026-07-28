'use client'

/**
 * F8.3 — the one place the launcher's sound settings reach the mixer.
 *
 * The store owns the numbers (`settings.interfaceSounds`, `interfaceVolume`),
 * `lib/sfx.ts` owns playback, and this component is the single wire between
 * them. It renders nothing and is mounted once, next to the global overlays.
 *
 * Why a component and not a call in the settings panel:
 *
 *   **The panel is not the only writer.** `resetSettings()`, a future admin
 *   push and the panel itself all change the same two fields. If the mixer were
 *   updated from the panel's handlers, every other writer would silently fail to
 *   apply — the classic "the slider works but Reset doesn't" bug. Here the mixer
 *   follows the *state*, so anything that can change the state is honoured.
 *
 *   **One direction only.** Store → engine, never back. The engine's `volume`
 *   is a mirror, not a source; writing back would make the dev console (which
 *   pokes `sfx.setVolume` directly) fight the panel for authority, and two
 *   sources of truth for one number is how the fight is lost.
 *
 * The preview cue lives here too, in the same effect and *after* the level was
 * applied, because that ordering is the entire point of a volume control: the
 * sound you hear must be at the level you have just set. Firing it from the
 * panel's own handler would play the previous level — the effect that applies
 * the new one has not run yet at that moment.
 */

import { useEffect, useRef } from 'react'
import { sfx } from '@/lib/sfx'
import { useStore } from '@/lib/store'

/**
 * How long the slider must sit still before it demonstrates itself.
 *
 * A drag emits a value per pointer move. The engine's own suppression window
 * (F8.2) already collapses that burst into one cue — but into the *first* one,
 * which is the level the drag started at, i.e. exactly the wrong answer for a
 * volume control. Waiting for the gesture to settle plays the level the player
 * actually chose, once.
 */
const PREVIEW_SETTLE_MS = 220

export function SfxSettingsBridge() {
  // Two field-level selectors, not `s.settings`: the settings object is replaced
  // on every unrelated change (brightness, region), and this must not re-run
  // — a re-run means an unasked-for cue.
  const enabled = useStore((s) => s.settings.interfaceSounds)
  const volumePct = useStore((s) => s.settings.interfaceVolume)

  /**
   * The first run is boot, not a user changing anything. Applying the level is
   * right; demonstrating it is not — the station would greet whoever sits down
   * with a notification they did not cause (and, before any gesture, the browser
   * would refuse it anyway, F8.5).
   */
  const applied = useRef(false)

  useEffect(() => {
    // The level itself is applied immediately and unconditionally — a setting
    // must never lag its control, and the engine ramps the gain so a change
    // mid-cue does not click.
    sfx.setVolume(volumePct / 100)
    sfx.setMuted(!enabled)

    if (!applied.current) {
      applied.current = true
      return
    }

    // Muting is silent by policy (`play()` returns `'muted'`), so the preview is
    // only ever a confirmation of an *audible* level.
    if (!enabled) return

    const timer = setTimeout(() => {
      // `arm()` first: the change came from a click or a key, so user activation
      // is still in effect and this is the cheapest moment to satisfy the
      // autoplay policy (F8.5). `notify` is the neutral cue of the set — a
      // preview must not sound like an error or a reward.
      void sfx.arm().then((allowed) => {
        if (allowed) console.log('[v0] preview outcome:', sfx.play('notify'))
      })
    }, PREVIEW_SETTLE_MS)

    // Cleanup is what makes this a debounce: the next value cancels the pending
    // preview, so only the value the player stopped on is ever heard.
    return () => clearTimeout(timer)
  }, [enabled, volumePct])

  return null
}
