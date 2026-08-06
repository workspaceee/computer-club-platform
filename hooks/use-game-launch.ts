'use client'

/**
 * Starting a title on this machine — the one door (C3.2).
 *
 * Until quick launch existed there was exactly one way into a game, so the whole
 * sequence lived inside `GameLaunchModal`: call the endpoint, wait for the
 * agent's steps, raise the confirmation, hand the machine over. The moment the
 * "Continue" card could start a game *without* that dialog, keeping the sequence
 * there would have meant two copies of it — and the copies would have drifted in
 * the places that matter most, because each of them decides when the launcher
 * goes quiet (F8.4) and what the player is told when a start fails.
 *
 * So the sequence moved here and the dialog became one of its callers. What the
 * hook owns:
 *
 *   **The order of the two slow things.** `catalog.launchGame` answers in a few
 *   hundred ms; the machine takes seconds. Both are awaited together so the
 *   checklist is never cut short by a fast endpoint, and the launcher is never
 *   silenced before the process actually exists.
 *
 *   **Who is allowed to start.** `launchingGameId` in the store is the single
 *   answer to "is anything coming up right now", so a second click — on the same
 *   card, on another card, or on the dialog behind it — cannot put two titles on
 *   one machine. A local flag could only have guarded the surface it lived on.
 *
 *   **The words.** Both outcomes are dictionary copy (F2.2): the mock API answers
 *   with a code, and turning that code into a sentence is the client's job.
 *
 * What it deliberately does *not* own: the house account. The endpoint takes only
 * a game id — availability is the server's to enforce — so the dialog's account
 * list is a *choice offered to the player*, not a parameter this sequence needs.
 * That is precisely why one click is allowed to skip it.
 *
 * There is no offline gate either, and that is on purpose: `catalog.launchGame`
 * is one of the two writes left out of `OFFLINE_BLOCKED` (C2.12), because losing
 * the club's network is the worst possible moment to take a player's game away.
 */

import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { launchGame, toApiError } from '@/lib/mock/api'
import { useStore } from '@/lib/store'

/**
 * The agent's own steps, in order.
 *
 * Copy, not state: the checklist is the only thing on screen during a launch, so
 * a hardcoded English "Injecting session..." would be the one untranslated
 * sentence in the product's slowest moment (F2.4).
 */
export const LAUNCH_STEP_KEYS: readonly TKey[] = [
  'games.launchStepAccount',
  'games.launchStepSession',
  'games.launchStepStart',
]

/** How long each step is shown. The mock's stand-in for agent telemetry. */
const STEP_MS = 1000

/** Total length of the simulated hand-over. */
export const LAUNCH_TOTAL_MS = LAUNCH_STEP_KEYS.length * STEP_MS

export interface GameLaunchController {
  /**
   * Start `game`, or do nothing if a start is already in flight.
   *
   * Takes the resolved game rather than an id because the confirmation names the
   * title, and a caller that has a card on screen already holds it — refetching
   * the name inside the sequence would make the toast wait on a request.
   */
  launch: (game: { id: string; name: string }) => Promise<void>
  /** The title this launcher is bringing up, from anywhere in the shell. */
  launchingId: string | null
  /** Index into `LAUNCH_STEP_KEYS` — for surfaces that draw the checklist. */
  step: number
  /** `true` while any launch is in flight. */
  busy: boolean
}

export function useGameLaunch(): GameLaunchController {
  const { t } = useT()
  const launchingId = useStore((s) => s.launchingGameId)
  const setLaunchingGame = useStore((s) => s.setLaunchingGame)
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const setRunningGame = useStore((s) => s.setRunningGame)
  const toast = useStore((s) => s.toast)

  /**
   * The step index stays local while the id is global: which title is coming up
   * is a fact the whole shell needs, how far along the checklist is only matters
   * to the surface drawing it. Putting the index in the store would add a write
   * per second to state that half the product subscribes to.
   */
  const [step, setStep] = useState(0)

  // Driven off the store flag rather than from inside `launch()`, so the timers
  // are cleaned up if the surface unmounts mid-launch — a dialog closing must not
  // leave three `setTimeout`s writing into a dead component.
  useEffect(() => {
    if (launchingId === null) return
    setStep(0)
    const timers = LAUNCH_STEP_KEYS.map((_, i) => setTimeout(() => setStep(i), i * STEP_MS))
    return () => timers.forEach(clearTimeout)
  }, [launchingId])

  const launch = useCallback(
    async (game: { id: string; name: string }) => {
      // The guard reads the store, so it holds across surfaces and across a
      // double click that arrives before React has re-rendered the first one.
      if (useStore.getState().launchingGameId !== null) return
      setLaunchingGame(game.id)

      try {
        await Promise.all([
          launchGame(game.id),
          new Promise((resolve) => setTimeout(resolve, LAUNCH_TOTAL_MS)),
        ])
        // Raised while the launcher is still what the player is looking at: from
        // the next line on, the title holds the screen.
        toast('success', t('games.launchedToast', { name: game.name }))
        setLaunchingGame(null)
        // Closes the dialog when there was one. Quick launch never opened it, and
        // `null → null` is not a state change.
        setLaunchGame(null)
        // The only place the shell enters "a game holds the machine" (F8.4),
        // because it is the only place that knows a start succeeded.
        setRunningGame(game.id)
      } catch (err) {
        setLaunchingGame(null)
        // The API answers with a code; the sentence is ours (F2.2).
        toast('error', t('games.launchFailed', { code: toApiError(err).code }))
      }
    },
    [setLaunchingGame, setLaunchGame, setRunningGame, toast, t],
  )

  return { launch, launchingId, step, busy: launchingId !== null }
}
