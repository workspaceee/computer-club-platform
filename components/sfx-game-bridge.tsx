'use client'

/**
 * F8.4 — the one wire that tells the sound engine a game holds the machine.
 *
 * The rule: **while a title is running the launcher is silent**, except for the
 * two cues a player would be angry to have missed — their session time running
 * out and an administrator addressing them. Anything else is a stranger's
 * notification arriving in the middle of a clutch round, and the player's fix for
 * that is to mute the launcher permanently on day one. Then `time-warning`
 * cannot reach them either, and the one cue that was worth having is gone.
 *
 * Three properties, and each is why the rule lives here rather than at the call
 * sites:
 *
 *   **The exception list is not here.** It is the `critical` flag in
 *   `lib/assets/sfx.ts`, read by the engine's gate. This file knows *when* the
 *   launcher must be quiet, never *what* is important — so adding a cue means
 *   answering the question once, in the catalogue, instead of hunting for the
 *   places a `if (running)` was pasted.
 *
 *   **One flag, mirrored one way.** Store → engine, like `SfxSettingsBridge`
 *   (F8.3). Screens that raise a toast keep calling `play()` and stay unaware
 *   the launcher is behind a game; the alternative — every call site checking
 *   `runningGameId` first — is a rule with a hole in it the week someone adds
 *   the eighth screen.
 *
 *   **Entering the state cuts what is already ringing**, non-critical voices
 *   only (`sfx.setGameRunning` does it). The moment a game takes the screen is
 *   exactly the moment the `success` cue from "Launch" is still sounding; a cue
 *   that *started* legally does not stay legal once the match is up.
 *
 * Mounted once next to the global overlays. Renders nothing.
 */

import { useEffect } from 'react'
import { sfx } from '@/lib/sfx'
import { useStore } from '@/lib/store'

export function SfxGameBridge() {
  // A field-level selector, not `s.ui`: this must not re-run because a drawer
  // opened, and a re-run at the wrong moment is a cue that chops voices.
  const runningGameId = useStore((s) => s.runningGameId)

  useEffect(() => {
    // `setGameRunning` is idempotent, so a re-render with the same id is a
    // no-op rather than a second round of voice-cutting — which matters because
    // a `time-warning` may legally be half-way through.
    sfx.setGameRunning(runningGameId !== null)
  }, [runningGameId])

  // No cleanup that clears the flag. Unmounting this component means the shell
  // itself is going away (a crash screen, a full reload); asserting "no game is
  // running" on the way out would be a guess, and the wrong one is the one that
  // lets the launcher speak over a match.
  return null
}
