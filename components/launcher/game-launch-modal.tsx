"use client";

/**
 * The launch dialog (F3.4) — now one caller of the launch sequence, not the
 * sequence itself (C3.2).
 *
 * Everything about *starting* a title moved to `useGameLaunch()`: the order of
 * the endpoint and the agent's steps, the guard that keeps two titles off one
 * machine, the confirmation toast, and the hand-over into `runningGameId`. What
 * is left here is what only a dialog has — cover art large enough to confirm you
 * picked the right game, the club's house accounts, and the checklist, bar and
 * "Cancel" drawn from the hook's live view of the agent (C4.6).
 *
 * The account list stopped being a choice with C4.7. The club grants a login by
 * itself — `grantHouseAccount` takes a game id and picks the free row — so a list
 * that looked selectable would have offered the player a decision the server was
 * already making, and one click from the "Continue" card would have "skipped" a
 * step that never existed. What is left is a *view of the pool*: how many logins
 * the club has and which are busy, printed without a single handler.
 *
 * The pool being empty gets a state of this same dialog rather than an overlay of
 * its own, and that is the reason the dialog is the only home for the queue: the
 * "Continue" card has nowhere to put a panel, so a refused quick launch opens this
 * dialog (the hook does it) and the player finds the queue where it already lives.
 */

import { motion } from "framer-motion";
import { icons } from "@/lib/icons";
import { useId, useState } from "react";
import { DataBoundary } from "@/components/data-boundary";
import { GameCover } from "@/components/game-cover";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Overlay } from "@/components/ui/overlay";
import { Progress } from "@/components/ui/progress";
import { useApi, useInvalidate } from "@/hooks/use-api";
import { useDismissableLayer } from "@/hooks/use-dismissable-layer";
import { LAUNCH_STEP_KEYS, useGameLaunch } from "@/hooks/use-game-launch";
import { useT } from "@/lib/i18n/provider";
import type { TKey } from "@/lib/i18n/types";
import {
  fetchGame,
  fetchHouseAccountQueueTicket,
  fetchHouseAccounts,
  joinHouseAccountQueue,
  leaveHouseAccountQueue,
  toApiError,
} from "@/lib/mock/api";
import { OVERLAY_MAX_H } from "@/lib/overlay";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function GameLaunchModal() {
  const { t } = useT();
  const launchGameId = useStore((s) => s.launchGameId);
  const setLaunchGame = useStore((s) => s.setLaunchGame);
  const toast = useStore((s) => s.toast);
  const invalidate = useInvalidate();
  const {
    launch,
    cancel,
    launchingId,
    steps,
    stepStatus,
    percent,
    grant,
    accountBusyId,
    clearAccountBusy,
  } = useGameLaunch();

  // `GET /api/games/:id` and `GET /api/club/house-accounts` (F3.4). Both are
  // conditional on the modal being open, so nothing is fetched while it is shut.
  const { data: game } = useApi(
    launchGameId ? ["game", launchGameId] : null,
    () => fetchGame(launchGameId as string),
  );
  const accounts = useApi(
    launchGameId ? "catalog/house-accounts" : null,
    fetchHouseAccounts,
  );

  const open = launchGameId !== null;

  /**
   * The pool has nothing free for this title (C4.7) — set by whichever copy of the
   * hook was refused, so a quick launch turned away on the home surface lands here
   * with the panel already showing.
   */
  const queueing = launchGameId !== null && accountBusyId === launchGameId;

  /**
   * `GET /api/club/accounts/queue`. The ticket and its position are the server's:
   * a client that counted "you are third" would be inventing the one number only
   * the club can know, and it would disagree with the counter's screen the moment
   * somebody ahead left the line.
   */
  const ticket = useApi(
    queueing ? ["catalog/house-queue", launchGameId] : null,
    () => fetchHouseAccountQueueTicket(launchGameId as string),
  );
  const [queuePending, setQueuePending] = useState(false);

  /**
   * Read from the store rather than kept locally, so "a launch is running" is the
   * same fact here and on the "Continue" card. A local flag would have let this
   * dialog stay dismissable — and its Launch button live — while a quick launch
   * fired from the home surface was already talking to the machine.
   *
   * Scoped to *this* game: another title coming up is not a reason to freeze this
   * dialog into a checklist that is not about it.
   */
  const launching = launchGameId !== null && launchingId === launchGameId;
  // A launch anywhere blocks this button, because the machine takes one title.
  const blocked = launchingId !== null && !launching;

  /**
   * Taking a place in line and leaving it (C4.7). Both write, so both go through
   * `invalidate('catalog')` rather than storing a position locally — the number
   * belongs to the club, and a client that kept its own copy would keep showing
   * "you are third" after the two guests ahead had left.
   */
  const handleJoinQueue = async () => {
    if (!launchGameId) return;
    setQueuePending(true);
    try {
      await joinHouseAccountQueue(launchGameId);
      invalidate("catalog");
      toast("success", t("games.houseAccountQueueJoined"));
    } catch (err) {
      toast("error", t(`errors.${toApiError(err).code}` as TKey));
    } finally {
      setQueuePending(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!launchGameId) return;
    setQueuePending(true);
    try {
      await leaveHouseAccountQueue(launchGameId);
      invalidate("catalog");
      // Leaving the line is also leaving the panel: the refusal that opened it is
      // spent, and the dialog goes back to being a launch dialog with a pool view.
      clearAccountBusy();
    } catch (err) {
      toast("error", t(`errors.${toApiError(err).code}` as TKey));
    } finally {
      setQueuePending(false);
    }
  };

  const close = () => {
    if (launching) return;
    setLaunchGame(null);
  };

  // Escape, the focus trap and the body scroll lock all come from the shared
  // layer core. This dialog used to hand-roll a scrim click instead, so it was
  // dismissable by mouse only — and Tab walked straight out of it into the game
  // grid behind. `closeOnEscape` follows `launching` because a sequence already
  // running on the machine must not be abandoned by a stray keypress (F6.4).
  const titleId = useId();
  const panelRef = useDismissableLayer({
    open,
    onClose: close,
    closeOnEscape: !launching,
  });

  // No `setLaunching`, no timers, no toast: the hook closes this dialog itself
  // when the start succeeds, because closing it is part of handing the machine
  // over and not a separate thing the caller decides.
  const handleLaunch = () => {
    if (!game) return;
    void launch(game);
  };

  return (
    <Overlay
      open={open}
      layer="modal"
      blur="md"
      // No dismiss while the agent is mid-launch: a stray click on the scrim
      // would hide a sequence that is still running on the machine.
      onDismiss={launching ? undefined : close}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        // The visible title is painted inside `GameCover`, so the name is given
        // through `aria-labelledby` on a screen-reader-only line rather than
        // referenced from art — a reader still opens with "Launch Civilization
        // VII" instead of an unnamed dialog.
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        // The cap + inner scroll: this card carries a 160px cover, a list of
        // house accounts and a footer, so it was the tallest dialog in the
        // product and the first to lose its cover art off the top of a short
        // window (F6.4).
        className={cn(
          "tick-corners flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-2",
          OVERLAY_MAX_H,
        )}
      >
        <p id={titleId} className="sr-only">
          {game
            ? t("games.launchDialog", { name: game.name })
            : t("games.launchDialogPending")}
        </p>
        <div className="relative shrink-0">
          {game ? (
            <GameCover
              game={game}
              className="h-40 w-full"
              titleClassName="text-2xl"
              // The panel is capped at `max-w-md`, so the cover never renders
              // wider than that regardless of viewport.
              sizes="448px"
            />
          ) : (
            <Skeleton className="h-40 w-full" radius="sm" />
          )}
          <button
            onClick={close}
            disabled={launching}
            // A plate sitting directly on cover art, so `pill` — and the
            // hover goes to `pill-deep`, the rung the depth scale keeps for
            // exactly this (a plate on unvetted media, §3.3).
            className="pill absolute right-3 top-3 rounded-lg p-1.5 text-text-high transition-colors hover:pill-deep disabled:opacity-40"
            aria-label={t("common.close")}
          >
            <icons.close size={18} />
          </button>
        </div>

        {/* Only the account list scrolls; the cover stays pinned so the
                guest can always see which game they are about to start. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {!launching ? (
            <>
              {queueing ? (
                /* The pool is empty: a state of this dialog, drawn *instead of*
                   the list rather than under it — this card is the tallest in the
                   product and a panel stacked below the pool would push the cover
                   art off a 693px window. */
                <div className="flex flex-col gap-4">
                  <EmptyState
                    bare
                    size="sm"
                    icon={icons.accountMissing}
                    title={t("games.noAccounts")}
                    description={t("games.houseAccountQueueBody")}
                  />
                  <DataBoundary
                    state={ticket}
                    errorBare
                    errorSize="sm"
                    loading={<Skeleton className="h-10 w-full" />}
                  >
                    {(row) =>
                      row ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border well-shallow px-4 py-3">
                          <p className="flex items-center gap-2 text-sm text-text-high">
                            <icons.timer
                              size={14}
                              aria-hidden
                              className="text-primary"
                            />
                            {/* The club's number, printed as it arrived. */}
                            {t("games.houseAccountQueuePosition", {
                              n: row.position,
                            })}
                          </p>
                          <button
                            onClick={() => void handleLeaveQueue()}
                            disabled={queuePending}
                            className="shrink-0 text-xs font-semibold text-text-medium underline-offset-2 transition-colors hover:text-text-high hover:underline disabled:opacity-50"
                          >
                            {t("games.houseAccountQueueLeave")}
                          </button>
                        </div>
                      ) : (
                        /* One action, and no second neon: the glow in this dialog
                           belongs to "Launch" (§3.3), so the queue button borrows
                           the primary fill without it. */
                        <button
                          onClick={() => void handleJoinQueue()}
                          disabled={queuePending}
                          className="w-full rounded-lg bg-primary py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("games.houseAccountQueueJoin")}
                        </button>
                      )
                    }
                  </DataBoundary>
                </div>
              ) : (
                <>
                  <p className="label-mono mb-3 text-[10px] text-text-low">
                    {t("games.selectAccount")}
                  </p>
                  <DataBoundary
                    state={accounts}
                    errorBare
                    errorSize="sm"
                    loading={
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-[58px] w-full" />
                        ))}
                      </div>
                    }
                    isEmpty={(rows) => rows.length === 0}
                    empty={
                      <EmptyState
                        bare
                        size="sm"
                        icon={icons.accountMissing}
                        title={t("games.noAccounts")}
                        description={t("games.noAccountsBody")}
                      />
                    }
                  >
                    {(rows) => (
                      <ul className="flex flex-col gap-2">
                        {rows.map((acc) => {
                          const busy = acc.status === "in-use";
                          return (
                            /* A row, not a button (C4.7): the club picks the
                               login, so anything clickable here would offer a
                               decision the server has already made. */
                            <li
                              key={acc.id}
                              className={cn(
                                "flex items-center justify-between rounded-lg border border-border well-shallow px-4 py-3",
                                busy && "opacity-60",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Decoration: the same fact is written out to
                                    the right of the row, so the disc is not the
                                    only place availability lives (F6.6). */}
                                <span
                                  aria-hidden
                                  className={cn(
                                    "h-2.5 w-2.5 rounded-full",
                                    busy ? "bg-danger" : "bg-success",
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-text-high">
                                    {acc.label}
                                  </p>
                                  {acc.linkedUser && (
                                    <p className="text-xs text-text-low">
                                      {t("games.accountLinked", {
                                        name: acc.linkedUser,
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs font-medium text-text-medium">
                                {busy
                                  ? t("games.accountInUse")
                                  : t("games.accountAvailable")}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </DataBoundary>
                </>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={close}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleLaunch}
                  // No longer waits on a pick — the grant is the server's
                  // (C4.7). `blocked`: a quick launch fired from the home
                  // surface owns the machine already, and this dialog must not
                  // queue a second title behind it.
                  disabled={!game || blocked}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_18px_rgba(229,53,43,0.4)] transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("games.launch")}
                </button>
              </div>
            </>
          ) : (
            // Every row, the bar and the button come from the hook, so this
            // dialog and the "Continue" card cannot disagree about how far
            // along a launch is — the ticks are the agent's, not a timer's.
            <div className="flex flex-col items-center gap-4 py-2">
              <icons.pending size={36} className="animate-spin text-primary" />
              {/* The only thing on screen for the seconds a start takes, so
                      it is announced rather than only painted. */}
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-start gap-2"
              >
                {/* The hook's subset, not the full vocabulary: a Steam title
                    gets three rows, because an "Assigning an account…" line it
                    never needed would be a step the launcher invents (C4.7). */}
                {steps.map((id) => {
                  const status = stepStatus(id);
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex items-center gap-2 text-sm transition-colors",
                        status === "pending"
                          ? "text-text-low"
                          : "text-text-high",
                      )}
                    >
                      {status === "done" ? (
                        <icons.check
                          size={14}
                          aria-hidden
                          className="text-success"
                        />
                      ) : status === "active" ? (
                        <icons.pending
                          size={14}
                          aria-hidden
                          className="animate-spin text-primary"
                        />
                      ) : (
                        <span aria-hidden className="h-3.5 w-3.5" />
                      )}
                      {t(LAUNCH_STEP_KEYS[id])}
                    </div>
                  );
                })}
              </div>

              {/* The label the club just attached to this visit (C4.7). One line
                  under the checklist, not a card: it is a fact about the session,
                  and the lasting copy of it is the strip's, read off the server. */}
              {grant && (
                <p className="flex items-center gap-2 text-sm text-text-medium">
                  <icons.check size={14} aria-hidden className="text-success" />
                  {t("games.houseAccountAssigned", { label: grant.label })}
                </p>
              )}

              {/* The agent's own percent, clamped monotonic by the hook: a bar
                      that slips backwards reads as a failed start. */}
              <Progress
                value={percent}
                label={t("games.launchProgress")}
                className="w-full"
              />

              {/* Escape and the scrim stay inert during a launch (F6.4), so
                      abandoning a start that is already running on the machine
                      has to be a deliberate press. */}
              <button
                onClick={cancel}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5"
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </Overlay>
  );
}
