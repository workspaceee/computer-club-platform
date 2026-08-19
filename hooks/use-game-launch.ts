"use client";

/**
 * Starting a title on this machine — the one door (C3.2), now driven by the
 * agent's real progress instead of a timer (C4.6).
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
 *   silenced before the process actually exists. If the club refuses, the agent
 *   is aborted in the same breath — a game must not come up behind a `402`.
 *
 *   **The checklist.** The agent reports seven steps (`mock-agent.ts`), the plan
 *   promises four lines. The grouping below is the single place that crossing
 *   lives, so the dialog and the "Continue" card cannot disagree about how far
 *   along a launch is. Percent is clamped monotonic: a bar that goes backwards
 *   reads as a failure even when the start is fine.
 *
 *   **Who is allowed to start.** `launchingGameId` in the store is the single
 *   answer to "is anything coming up right now", so a second click — on the same
 *   card, on another card, or on the dialog behind it — cannot put two titles on
 *   one machine. A local flag could only have guarded the surface it lived on.
 *
 *   **Cancellation.** The button is a client fact, not an agent error: the bridge
 *   contract keeps `AgentError.detail` for logs and admins only (never for the
 *   player), so "the player pressed Cancel" is remembered here in a ref and the
 *   `AgentErrorCode` union stays closed.
 *
 *   **The words.** Every outcome is dictionary copy (F2.2): the API answers with
 *   a code, the agent answers with a code, and turning either into a sentence is
 *   the client's job.
 *
 * What it deliberately does *not* own: the house account. The endpoint takes only
 * a game id — availability is the server's to enforce — so the dialog's account
 * list is a *choice offered to the player*, not a parameter this sequence needs.
 * That is precisely why one click is allowed to skip it. The "Assigning an
 * account" line is fed by the endpoint's own confirmation here; C4.7 replaces
 * that source with `catalog.grantHouseAccount` and its offline branch.
 *
 * There is no offline gate either, and that is on purpose: `catalog.launchGame`
 * is one of the two writes left out of `OFFLINE_BLOCKED` (C2.12), because losing
 * the club's network is the worst possible moment to take a player's game away.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAgentError,
  toAgentError,
  type GameLaunchPhase,
  type GameLaunchProgress,
} from "@/lib/agent/bridge";
import { mockAgent } from "@/lib/agent/mock-agent";
import { useT } from "@/lib/i18n/provider";
import type { TKey } from "@/lib/i18n/types";
import { launchGame, toApiError } from "@/lib/mock/api";
import { useStore } from "@/lib/store";
import { useAgent } from "@/hooks/use-agent";

/** The bridge in use. Stage 5 points this at the real agent transport. */
const agent = mockAgent;

/** Rows of the checklist, in display order — the order the plan promises. */
export type LaunchStepId = "updates" | "account" | "launcher" | "game";
export type LaunchStepStatus = "pending" | "active" | "done";

export const LAUNCH_STEPS: readonly LaunchStepId[] = [
  "updates",
  "account",
  "launcher",
  "game",
];

/**
 * Row labels. Copy, not state: the checklist is the only thing on screen during
 * a launch, so a hardcoded English "Signing in…" would be the one untranslated
 * sentence in the product's slowest moment (F2.4).
 */
export const LAUNCH_STEP_KEYS: Record<LaunchStepId, TKey> = {
  updates: "games.launchStepUpdates",
  account: "games.launchStepAccount",
  launcher: "games.launchStepLauncher",
  game: "games.launchStepStart",
};

/** Agent step → row. Seven ticks, four lines. */
const STEP_GROUP: Record<string, LaunchStepId> = {
  queued: "updates",
  checkingFiles: "updates",
  syncingCloudSaves: "updates",
  startingLauncher: "launcher",
  signingIn: "launcher",
  startingGame: "game",
  waitingForWindow: "game",
  running: "game",
};

/**
 * Fallback for a tick whose `step` we do not know. `step` is an open `string` in
 * the contract while `phase` is a closed union, so the phase is what can be
 * relied on when a newer agent invents a step name.
 */
const PHASE_GROUP: Record<GameLaunchPhase, LaunchStepId> = {
  queued: "updates",
  preparing: "updates",
  startingLauncher: "launcher",
  launching: "game",
  running: "game",
  exited: "game",
  failed: "game",
};

function groupOf(progress: GameLaunchProgress): LaunchStepId {
  return STEP_GROUP[progress.step ?? ""] ?? PHASE_GROUP[progress.phase];
}

interface LaunchState {
  /** Index into `LAUNCH_STEPS` of the row the agent is working on. */
  index: number;
  /** 0–100 from the agent, never allowed to fall. */
  percent: number;
  /** The endpoint has confirmed — the only source for the "account" row. */
  accountDone: boolean;
}

const IDLE: LaunchState = { index: 0, percent: 0, accountDone: false };

export interface GameLaunchController {
  /**
   * Start `game`, or do nothing if a start is already in flight.
   *
   * Takes the resolved game rather than an id because the confirmation names the
   * title, and a caller that has a card on screen already holds it — refetching
   * the name inside the sequence would make the toast wait on a request.
   */
  launch: (game: { id: string; name: string }) => Promise<void>;
  /** Stops the start the player is watching. No-op when nothing is in flight. */
  cancel: () => void;
  /** The title this launcher is bringing up, from anywhere in the shell. */
  launchingId: string | null;
  /** Status of one checklist row — for surfaces that draw it. */
  stepStatus: (id: LaunchStepId) => LaunchStepStatus;
  /** Monotonic 0–100 for the progress bar. */
  percent: number;
  /** `true` while any launch is in flight. */
  busy: boolean;
}

export function useGameLaunch(): GameLaunchController {
  const { t } = useT();
  const { status: agentStatus, capabilities } = useAgent();
  const launchingId = useStore((s) => s.launchingGameId);
  const setLaunchingGame = useStore((s) => s.setLaunchingGame);
  const setLaunchGame = useStore((s) => s.setLaunchGame);
  const setRunningGame = useStore((s) => s.setRunningGame);
  const toast = useStore((s) => s.toast);

  /**
   * Progress stays local while the id is global: which title is coming up is a
   * fact the whole shell needs, how far along the checklist is only matters to
   * the surface drawing it. Putting seven ticks per launch in the store would
   * mean seven writes into state half the product subscribes to.
   */
  const [state, setState] = useState<LaunchState>(IDLE);

  // Guards against a tick from a launch the player walked away from writing into
  // an unmounted surface — same rule as the handshake in `use-agent.ts`.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** The live start, so "Cancel" has something to pull. */
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Whether *this* attempt was cancelled by the player. Kept here rather than
   * read off `AgentError.detail`, which the bridge reserves for logs and admins.
   */
  const cancelledRef = useRef(false);

  const launch = useCallback(
    async (game: { id: string; name: string }) => {
      // The guard reads the store, so it holds across surfaces and across a
      // double click that arrives before React has re-rendered the first one.
      if (useStore.getState().launchingGameId !== null) return;

      // No agent, no start. A seat that cannot talk to its PC must say so rather
      // than play the checklist and claim success (F5.4); "Call an admin" lands
      // with C4.8.
      if (agentStatus !== "ready" || !capabilities.launchGames) {
        toast("error", t("errors.agentUnavailable"));
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      cancelledRef.current = false;
      setLaunchingGame(game.id);
      setState(IDLE);

      const onProgress = (progress: GameLaunchProgress) => {
        if (!alive.current) return;
        const index = LAUNCH_STEPS.indexOf(groupOf(progress));
        setState((prev) => ({
          ...prev,
          index: Math.max(prev.index, index),
          percent: Math.max(prev.percent, progress.percent),
        }));
      };

      try {
        const [, handle] = await Promise.all([
          // The club's answer is what lights the "account" row. If it refuses,
          // the agent is stopped in the same breath, or a game would come up on
          // a seat the club just said no to.
          launchGame(game.id).then(
            (ok) => {
              if (alive.current) setState((prev) => ({ ...prev, accountDone: true }));
              return ok;
            },
            (err) => {
              controller.abort();
              throw err;
            },
          ),
          agent.launchGame(game.id, { onProgress, signal: controller.signal }),
        ]);

        if (alive.current) {
          setState({ index: LAUNCH_STEPS.length, percent: 100, accountDone: true });
        }
        // Raised while the launcher is still what the player is looking at: from
        // the next line on, the title holds the screen.
        toast("success", t("games.launchedToast", { name: game.name }));
        setLaunchingGame(null);
        // Closes the dialog when there was one. Quick launch never opened it, and
        // `null → null` is not a state change.
        setLaunchGame(null);
        // The only place the shell enters "a game holds the machine" (F8.4),
        // because it is the only place that knows a start succeeded — and only
        // once the agent handed back a real handle.
        setRunningGame(handle.gameId);
      } catch (err) {
        setLaunchingGame(null);
        if (alive.current) setState(IDLE);

        if (cancelledRef.current) {
          // The player's own decision, so neutral: a red toast for something you
          // just asked for reads as a bug in the launcher.
          setLaunchGame(null);
          toast("info", t("games.launchCancelled"));
          return;
        }
        // Both sides answer with a code and the sentence is ours (F2.2) — but the
        // agent's codes have their own dictionary namespace, because a local
        // failure and a club failure are not the same problem.
        if (isAgentError(err)) {
          toast("error", t(`errors.${toAgentError(err).code}` as TKey));
          return;
        }
        toast("error", t("games.launchFailed", { code: toApiError(err).code }));
      } finally {
        abortRef.current = null;
      }
    },
    [
      agentStatus,
      capabilities.launchGames,
      setLaunchingGame,
      setLaunchGame,
      setRunningGame,
      toast,
      t,
    ],
  );

  const cancel = useCallback(() => {
    if (!abortRef.current) return;
    cancelledRef.current = true;
    abortRef.current.abort();
  }, []);

  const stepStatus = useCallback(
    (id: LaunchStepId): LaunchStepStatus => {
      // The account row is not an agent step at all: the endpoint owns it, so it
      // ticks on its own clock and the rows are deliberately not continuous.
      if (id === "account") return state.accountDone ? "done" : "active";
      const index = LAUNCH_STEPS.indexOf(id);
      if (index < state.index) return "done";
      return index === state.index ? "active" : "pending";
    },
    [state],
  );

  return {
    launch,
    cancel,
    launchingId,
    stepStatus,
    percent: state.percent,
    busy: launchingId !== null,
  };
}
