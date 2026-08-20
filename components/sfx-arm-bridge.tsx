'use client'

/**
 * F8.5 — the one wire that turns the player's first action into permission to
 * make a sound.
 *
 * Browsers refuse audio to a page nobody has touched: an `AudioContext` created
 * during boot starts `suspended`, and `resume()` only succeeds while a real
 * interaction is being handled. Without this component the launcher satisfies
 * that policy *by accident* — the first cue of a station calls `resume()` and is
 * itself refused, so the confirmation of the very first action is always the one
 * lost, and it is lost on a station where nobody can tell "sound is off here"
 * from "this build has no sound".
 *
 * So arming is separated from playing: this bridge listens for the first gesture
 * anywhere on the page and hands it to the engine, which then only has to decide
 * whether a cue is *wanted* (F8.3, F8.4) rather than whether it is *allowed*.
 *
 * Four decisions, each of them a bug in the naive one-liner:
 *
 *   **It keeps listening until it actually worked.** Not `{ once: true }`: not
 *   every key grants activation (a bare `Shift`, a browser shortcut), a refused
 *   `resume()` resolves with the context still suspended, and iOS suspends an
 *   already-running context when a call or another app takes audio. The effect
 *   depends on `armed`, so the listeners come back by themselves whenever the
 *   engine reports it is not armed — arming is a state to maintain, not an event
 *   that happened once.
 *
 *   **Capture phase.** The launcher is full of dismissable layers that call
 *   `stopPropagation()` on `pointerdown` to keep a click from reaching the layer
 *   below (`hooks/use-dismissable-layer.ts`). A bubbling listener on `window`
 *   would miss exactly those gestures — the first click on a station that boots
 *   with a dialog open would arm nothing.
 *
 *   **Only events that a browser counts as activation.** `pointerdown`,
 *   `keydown`, `touchstart`. Not `mousemove`, not `scroll`, not `focus`: they
 *   grant nothing, and treating them as a gesture would make "armed" a lie that
 *   the next `blocked` cue quietly contradicts. A cleaner has to be able to wipe
 *   a screen without the station starting to answer them.
 *
 *   **It plays nothing.** Arming is silent on purpose. A station that greets
 *   whoever sits down with a `notify` it invented has broken the rule it was
 *   written to enforce — the first sound must belong to something the player
 *   *did*, and the click that arms is served by the engine's own grace window
 *   (`ARM_GRACE_MS`), not by a cue from here.
 *
 * Mounted once next to the global overlays, like `SfxSettingsBridge` (F8.3) and
 * `SfxGameBridge` (F8.4). Renders nothing.
 */

import { useEffect } from 'react'
import { useSfxState } from '@/hooks/use-sfx'
import { sfx } from '@/lib/sfx'

/**
 * The events browsers accept as user activation. Pointer covers mouse, pen and
 * touch; `touchstart` is kept for older iOS Safari, which grants activation
 * there and not on `pointerdown`.
 */
const GESTURES = ['pointerdown', 'keydown', 'touchstart'] as const

/**
 * Keys that never grant activation on their own, so a press of one must not be
 * mistaken for the gesture we were waiting for — the listener stays up for the
 * real keystroke that follows.
 */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock'])

export function SfxArmBridge() {
  // Only two fields matter, and both come from the engine rather than the store:
  // permission is the browser's answer, not a setting. Note that `muted` is
  // deliberately *not* consulted — a muted station still arms, so that switching
  // sound back on in the settings panel is audible immediately instead of
  // costing the player one more click to discover.
  const { supported, armed } = useSfxState()

  useEffect(() => {
    // Nothing to arm where there is no Web Audio (the launcher is simply silent,
    // F8.2), and nothing to do once the context is running.
    if (!supported || armed) return

    const onGesture = (event: Event) => {
      if (event.type === 'keydown' && MODIFIER_KEYS.has((event as KeyboardEvent).key)) return
      // Fire-and-forget: the result reaches this component through the engine
      // snapshot, and a failed attempt costs nothing because the listeners are
      // still up. `arm()` dedupes concurrent calls, so a drag that emits many
      // pointer events asks the browser once.
      void sfx.arm()
    }

    for (const type of GESTURES) {
      window.addEventListener(type, onGesture, { capture: true, passive: true })
    }

    return () => {
      for (const type of GESTURES) {
        window.removeEventListener(type, onGesture, { capture: true })
      }
    }
  }, [supported, armed])

  return null
}
