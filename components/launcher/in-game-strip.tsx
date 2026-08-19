'use client'

/**
 * F8.4 — the strip that **names** the silence.
 *
 * The rule itself lives in the engine (`lib/sfx.ts` gates on `gameRunning`) and
 * is wired by `SfxGameBridge`. This component exists because a rule the player
 * cannot see is indistinguishable from a fault: a launcher that simply stops
 * making sounds reads as broken, and the player's fix for broken sound is the
 * mute switch — which then takes `time-warning` with it, the one cue the whole
 * feature was worth building for.
 *
 * So the state gets a face, and it carries exactly three things:
 *
 *   **That a title holds the machine**, by name. `Playing Cyberpunk 2077` is a
 *   sentence the player can agree or disagree with; a bare "in game" badge is
 *   one they can only wonder about.
 *
 *   **Why the launcher went quiet, and what still gets through.** Naming the two
 *   exceptions is the load-bearing half: "sounds are paused" alone invites the
 *   player to mute us permanently as insurance, while "time warnings and admin
 *   messages still come through" is a promise that makes staying unmuted the
 *   rational choice.
 *
 *   **The way out.** In the prototype nothing else can clear the state — the
 *   launch is open-ended (`endedAt: null` in `catalog.launchGame`) until a real
 *   station agent reports the process exited, and there is no such report yet.
 *   Without this button the launcher is silent for the rest of the visit, with
 *   nothing on screen to explain it. That makes the control a correctness
 *   requirement, not a convenience.
 *
 * Where the name comes from: the store keeps only `runningGameId`, and the title
 * is read back through the same `['game', id]` cache entry `GameLaunchModal`
 * filled a moment earlier — so this renders from a warm cache in practice, and
 * no copy of the name has to be kept in the store where it could go stale.
 *
 * Not a toast, deliberately. A toast is the wrong shape for a state that lasts
 * as long as a match: it would expire while the condition it describes is still
 * true, leaving the silence unexplained again for anyone who alt-tabs back later.
 */

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { mockAgent } from '@/lib/agent/mock-agent'
import { useApi } from '@/hooks/use-api'
import { useT } from '@/lib/i18n/provider'
import { fetchGame } from '@/lib/mock/api'
import { useStore } from '@/lib/store'

export function InGameStrip() {
  const { t } = useT()
  const runningGameId = useStore((s) => s.runningGameId)
  const setRunningGame = useStore((s) => s.setRunningGame)
  const toast = useStore((s) => s.toast)

  // Same key the launch dialog used, so this is normally a cache read rather
  // than a request. Conditional on the state, so nothing is fetched while no
  // game is running.
  const { data: game } = useApi(runningGameId ? ['game', runningGameId] : null, () =>
    fetchGame(runningGameId as string),
  )

  if (!runningGameId) return null

  // The strip appears the instant the state is entered, so it must read
  // correctly before the title resolves — the *rule* is what matters here, and
  // it is true with or without a name.
  const label = game ? t('games.inGameNow', { name: game.name }) : t('games.inGame')

  return (
    <motion.div
      // `role="status"`: entering the state is an announcement, not something
      // the player triggered a dialog for. `polite` because it must not cut
      // across whatever a screen reader is already saying.
      role="status"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-b border-warning/25 bg-warning/[0.07]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 md:px-8">
        <icons.games size={15} aria-hidden className="shrink-0 text-warning" />
        <p className="font-display text-sm font-semibold text-text-high">{label}</p>
        {/* The promise, and the reason the player should leave sound on. Hidden
            on the narrowest widths, where the name plus the button already fill
            the row — the label above still says the launcher is behind a game. */}
        <p className="hidden min-w-0 flex-1 text-xs leading-relaxed text-text-medium sm:block">
          {t('games.inGameQuiet')}
        </p>
        <button
          onClick={() => {
            /**
             * The agent has to hear about it too, or the seat it claimed in
             * `launchGame` stays claimed: from C4.6 on the launch is a real
             * bridge call, so a player who pressed this button and started the
             * same title again was answered with `gameAlreadyRunning` while the
             * launcher itself showed nothing running. Fire-and-forget on
             * purpose — the state is the player's to leave, and a station that
             * already lost the process (`gameNotRunning`) must not turn that
             * into an error the player has to dismiss.
             */
            void mockAgent.killGame(runningGameId).catch(() => {})
            setRunningGame(null)
            // Sound is back, and the toast that says so is itself the proof —
            // it is the first cue heard since the launch, so the player learns
            // the state ended by hearing it end.
            toast('info', t('games.backToLauncher'))
          }}
          // `pill` (§3.3): a plate on the warning-tinted strip. It reads as the
          // same object as the timer chip in the bar above it, which the old
          // one-off 25 % black did not.
          className="pill ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-high transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <icons.close size={13} aria-hidden />
          {t('games.backToLauncher')}
        </button>
      </div>
    </motion.div>
  )
}
