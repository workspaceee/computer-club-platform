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
 *   **The house account** (C4.7). A title that needs one of the club's shared
 *   logins gets it *before* anything is started, and always from the server: the
 *   dialog's list is a view of the pool, never a choice, so one click from the
 *   "Continue" card and a click in the dialog get the same account by the same
 *   rule. Two consequences are load-bearing:
 *
 *     - **A grant must never leak.** Every way out of the sequence after a
 *       successful grant — a refused endpoint, a failed agent, the player's own
 *       Cancel — releases the row. An `in-use` account nobody holds cannot be
 *       repaired from inside the product: in the club it is a guest who cannot
 *       play because a dead session still "has" the login.
 *     - **The grant needs the link, the launch does not.** `catalog.launchGame`
 *       is deliberately outside `OFFLINE_BLOCKED` (C2.12) — losing the club's
 *       network is the worst moment to take a player's game away — but
 *       `catalog.grantHouseAccount` is inside it. So the offline check below is
 *       scoped to titles that need an account, and refuses *before* the checklist
 *       appears rather than letting the player watch a start that cannot finish.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  isAgentError,
  toAgentError,
  type GameLaunchPhase,
  type GameLaunchProgress,
} from "@/lib/agent/bridge";
import { mockAgent } from "@/lib/agent/mock-agent";
import { useT } from "@/lib/i18n/provider";
import type { TKey } from "@/lib/i18n/types";
import {
  grantHouseAccount,
  isTransportOffline,
  launchGame,
  releaseHouseAccount,
  toApiError,
} from "@/lib/mock/api";
import type { HouseAccountGrant } from "@/lib/types/catalog";
import { useStore } from "@/lib/store";
import { useAgent } from "@/hooks/use-agent";
import { useInvalidate } from "@/hooks/use-api";

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

/* ------------------------------------------------------------------ *
 * "The club has no free login for this title" — shared between callers
 * ------------------------------------------------------------------ */

/**
 * The one fact this hook cannot keep per-instance (C4.7).
 *
 * Progress is local because only the surface drawing it cares, but the refusal
 * has to cross surfaces: it is raised by the "Continue" card's copy of the hook
 * and answered by the queue panel inside the launch dialog, which runs its own
 * copy. Two local flags would have meant a dialog that opened empty after a quick
 * launch was turned away — and the queue drawn twice to compensate, which is the
 * duplication C3.2 removed.
 *
 * Deliberately *not* in the global store either: it is neither a grant nor a
 * queue (the server owns both), it lives for the seconds between a refusal and
 * the player's answer, and it is cleared by the next launch of that title or by
 * leaving the line. `launchingGameId` / `runningGameId` stay the only launch facts
 * the whole shell subscribes to.
 */
let accountBusyGameId: string | null = null;
const accountBusyListeners = new Set<() => void>();

function readAccountBusy(): string | null {
  return accountBusyGameId;
}

function subscribeAccountBusy(onChange: () => void): () => void {
  accountBusyListeners.add(onChange);
  return () => accountBusyListeners.delete(onChange);
}

/** Marks (or clears) the title the club had no login for. */
export function setAccountBusyGame(gameId: string | null): void {
  if (accountBusyGameId === gameId) return;
  accountBusyGameId = gameId;
  for (const listener of accountBusyListeners) listener();
}

interface LaunchState {
  /** Index into `LAUNCH_STEPS` of the row the agent is working on. */
  index: number;
  /** 0–100 from the agent, never allowed to fall. */
  percent: number;
  /**
   * Whether *this* title needs one of the club's shared logins (C4.7). Held in
   * state rather than recomputed, because the checklist has to keep the same
   * number of rows for the whole start: a list that gained a line halfway through
   * would read as a step the launcher forgot to mention.
   */
  needsAccount: boolean;
  /** The club has handed the login over — the only source for the "account" row. */
  accountDone: boolean;
  /**
   * What was handed over, so the dialog can print the label in the same frame the
   * grant arrives. The *lasting* answer is the server's
   * (`fetchAssignedHouseAccount`), which is what the in-game strip reads.
   */
  grant: HouseAccountGrant | null;
}

const IDLE: LaunchState = {
  index: 0,
  percent: 0,
  needsAccount: false,
  accountDone: false,
  grant: null,
};

export interface GameLaunchController {
  /**
   * Start `game`, or do nothing if a start is already in flight.
   *
   * Takes the resolved game rather than an id because the confirmation names the
   * title, and a caller that has a card on screen already holds it — refetching
   * the name inside the sequence would make the toast wait on a request.
   */
  launch: (game: {
    id: string;
    name: string;
    needsHouseAccount: boolean;
  }) => Promise<void>;
  /** Stops the start the player is watching. No-op when nothing is in flight. */
  cancel: () => void;
  /** The title this launcher is bringing up, from anywhere in the shell. */
  launchingId: string | null;
  /**
   * The rows to draw for the launch on screen (C4.7).
   *
   * `LAUNCH_STEPS` is the full vocabulary; this is the subset that is true for
   * *this* title. A Steam game never gets a shared club login, so drawing an
   * "Assigning an account…" row for it would be a step the launcher invents and
   * then ticks off without doing anything — the exact fiction C4.6 removed from
   * the timer.
   */
  steps: readonly LaunchStepId[];
  /** Status of one checklist row — for surfaces that draw it. */
  stepStatus: (id: LaunchStepId) => LaunchStepStatus;
  /**
   * The login handed to the launch on screen, or `null`. For the dialog's line
   * only; anything that has to survive the dialog reads the server instead.
   */
  grant: HouseAccountGrant | null;
  /**
   * The title the club had no free login for, from either entry point — the
   * dialog draws its queue panel on this and nothing else (C4.7).
   */
  accountBusyId: string | null;
  /** Drops that mark, e.g. once the player has taken or left the queue. */
  clearAccountBusy: () => void;
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
   * Every read about the pool lives under the `catalog` prefix
   * (`catalog/house-accounts`, `catalog/assigned-account`, `catalog/house-queue`),
   * so one call after a grant or a release refreshes the dialog's list, the strip's
   * line and any queue on screen — the server stays the only owner of all three.
   */
  const invalidate = useInvalidate();
  // Same value in every copy of the hook, so the dialog's queue panel reacts to a
  // refusal raised by the "Continue" card (C4.7).
  const accountBusyId = useSyncExternalStore(
    subscribeAccountBusy,
    readAccountBusy,
    readAccountBusy,
  );

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
    async (game: { id: string; name: string; needsHouseAccount: boolean }) => {
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

      // Scoped to titles that need a shared login, and checked *before* anything
      // starts: `catalog.launchGame` works offline on purpose, but the grant is in
      // `OFFLINE_BLOCKED`, so without this the player would watch a checklist that
      // could not finish. The copy is the pool's own, not "nothing was charged".
      if (game.needsHouseAccount && isTransportOffline()) {
        toast("error", t("games.houseAccountOfflineBody"));
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      cancelledRef.current = false;
      setLaunchingGame(game.id);
      setState({ ...IDLE, needsAccount: game.needsHouseAccount });
      // A fresh attempt outranks the last refusal: if the club has a login now,
      // the queue panel must not survive into a start that is working.
      setAccountBusyGame(null);

      const onProgress = (progress: GameLaunchProgress) => {
        if (!alive.current) return;
        const index = LAUNCH_STEPS.indexOf(groupOf(progress));
        setState((prev) => ({
          ...prev,
          index: Math.max(prev.index, index),
          percent: Math.max(prev.percent, progress.percent),
        }));
      };

      // Kept outside the `try` so the failure path can hand it back: a row lent
      // out for a start that never happened stays `in-use` with nobody holding it,
      // and nothing inside the product can repair that.
      let grant: HouseAccountGrant | null = null;

      try {
        if (game.needsHouseAccount) {
          // A precondition, not one of the parallel tasks: the title must not come
          // up without a login, and a login must not go out for a start that is
          // already doomed. The "account" row is active for exactly this await.
          grant = await grantHouseAccount(game.id);
          void invalidate("catalog");
          if (alive.current) {
            setState((prev) => ({ ...prev, accountDone: true, grant }));
          }
        }

        const [, handle] = await Promise.all([
          // If the club refuses, the agent is stopped in the same breath, or a
          // game would come up on a seat the club just said no to.
          launchGame(game.id).catch((err) => {
            controller.abort();
            throw err;
          }),
          agent.launchGame(game.id, {
            onProgress,
            signal: controller.signal,
            // The label the club chose, passed on so the station signs into the
            // launcher with the account the player was just told about.
            houseAccountId: grant?.accountId,
          }),
        ]);

        if (alive.current) {
          setState((prev) => ({
            ...prev,
            index: LAUNCH_STEPS.length,
            percent: 100,
            accountDone: true,
          }));
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

        // Every way out of the sequence lands here — a refused endpoint, a failed
        // agent, the player's own Cancel — so this is the single place a grant is
        // handed back. Fire-and-forget with its own swallow: a release that fails
        // is not a sentence the player can act on, and the toast below is about the
        // launch, not about the pool.
        if (grant) {
          void releaseHouseAccount(grant.accountId)
            .then(() => invalidate("catalog"))
            .catch(() => {});
        }

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

        /**
         * The pool is empty (C4.7) — the one API refusal with an answer instead of
         * an apology. The queue panel lives in the launch dialog and nowhere else,
         * so a quick launch from the "Continue" card *opens* that dialog rather than
         * growing a second copy of the queue in a card with no room for it. `info`,
         * not `error`: the club being full is not a fault, and the panel that just
         * appeared explains it properly.
         */
        if (toApiError(err).code === "noFreeAccount") {
          setAccountBusyGame(game.id);
          toast("info", t("games.houseAccountBusy"));
          setLaunchGame(game.id);
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
      invalidate,
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

  const clearAccountBusy = useCallback(() => setAccountBusyGame(null), []);

  const stepStatus = useCallback(
    (id: LaunchStepId): LaunchStepStatus => {
      // The account row is not an agent step at all: the club owns it, so it ticks
      // on its own clock and the rows are deliberately not continuous.
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
    steps: state.needsAccount
      ? LAUNCH_STEPS
      : LAUNCH_STEPS.filter((id) => id !== "account"),
    stepStatus,
    grant: state.grant,
    accountBusyId,
    clearAccountBusy,
    percent: state.percent,
    busy: launchingId !== null,
  };
}
