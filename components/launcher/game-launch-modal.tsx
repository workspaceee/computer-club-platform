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
 * The one thing to notice about the account list: it is a *choice offered* to the
 * player, not something the sequence needs. `catalog.launchGame` takes a game id
 * and the server owns availability, so the selection never leaves this component
 * — which is exactly why the "Continue" card is allowed to skip the dialog and
 * still start the same game the same way.
 */

import { motion } from "framer-motion";
import { icons } from "@/lib/icons";
import { useEffect, useId, useState } from "react";
import { DataBoundary } from "@/components/data-boundary";
import { GameCover } from "@/components/game-cover";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Overlay } from "@/components/ui/overlay";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/hooks/use-api";
import { useDismissableLayer } from "@/hooks/use-dismissable-layer";
import {
  LAUNCH_STEPS,
  LAUNCH_STEP_KEYS,
  useGameLaunch,
} from "@/hooks/use-game-launch";
import { useT } from "@/lib/i18n/provider";
import { fetchGame, fetchHouseAccounts } from "@/lib/mock/api";
import { OVERLAY_MAX_H } from "@/lib/overlay";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function GameLaunchModal() {
  const { t } = useT();
  const launchGameId = useStore((s) => s.launchGameId);
  const setLaunchGame = useStore((s) => s.setLaunchGame);
  const { launch, cancel, launchingId, stepStatus, percent } = useGameLaunch();

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
  const houseAccounts = accounts.data ?? [];

  const [account, setAccount] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

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

  useEffect(() => {
    if (launchGameId) {
      setAccount(null);
      setRemember(false);
    }
  }, [launchGameId]);

  // Preselect the first seat the club has free — the server owns availability.
  useEffect(() => {
    if (account !== null || houseAccounts.length === 0) return;
    const free = houseAccounts.find((a) => a.status !== "in-use");
    if (free) setAccount(free.id);
  }, [account, houseAccounts]);

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
                  <div className="flex flex-col gap-2">
                    {rows.map((acc) => {
                      const disabled = acc.status === "in-use";
                      const selected = account === acc.id;
                      return (
                        <button
                          key={acc.id}
                          disabled={disabled}
                          onClick={() => setAccount(acc.id)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border well-shallow hover:border-border-strong",
                            disabled && "cursor-not-allowed opacity-45",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Decoration: the same fact is written out to the
                                right of the row, so the disc is not the only
                                place availability lives (F6.6). */}
                            <span
                              aria-hidden
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                disabled ? "bg-danger" : "bg-success",
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
                            {disabled
                              ? t("games.accountInUse")
                              : t("games.accountAvailable")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </DataBoundary>

              <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-sm text-text-medium">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {t("games.rememberAccount")}
              </label>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={close}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleLaunch}
                  // `blocked`: a quick launch fired from the home surface
                  // owns the machine already, and this dialog must not queue
                  // a second title behind it.
                  disabled={!game || !account || blocked}
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
                {LAUNCH_STEPS.map((id) => {
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
