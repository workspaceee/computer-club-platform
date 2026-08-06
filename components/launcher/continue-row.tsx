"use client";

/**
 * "Continue" — the last three titles, one click back into any of them (C3.2).
 *
 * The one thing that makes this card worth its place above the hero: a player who
 * sat down five minutes ago to fetch a drink should not have to cross a library
 * of sixty-seven games and a dialog to get back into the match they left. So the
 * whole card **is** the button — no hover-revealed play control, no confirmation
 * step, no account picker. One click, and `useGameLaunch()` hands the title to
 * the machine.
 *
 * Why it is compact and not three more pieces of cover art: the hero directly
 * below is 384 px of it. Three large covers stacked on top of that would make the
 * first screen of a visit entirely artwork and no information, so these are dense
 * rows — a small cover to recognise the title by, the name, and the one fact that
 * makes the row a decision rather than a link ("when did I last play this").
 *
 * Order is the server's: `GET /api/games/recent` returns titles newest-first and
 * deduplicated, so the leftmost card is always the match the player is most
 * likely to be coming back to.
 */

import { motion } from "framer-motion";
import { useCallback } from "react";
import { DataBoundary } from "@/components/data-boundary";
import { GameCover } from "@/components/game-cover";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { useApi } from "@/hooks/use-api";
import { useGameLaunch } from "@/hooks/use-game-launch";
import { useT } from "@/lib/i18n/provider";
import { icons } from "@/lib/icons";
import { fetchRecentGames, type RecentGame } from "@/lib/mock/api";
import { useStore } from "@/lib/store";
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  secondsSince,
  serverNowMs,
} from "@/lib/time";
import type { TKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Three, from the task. Kept as a named constant because it is also the column
 * count of the grid below — the row must not be able to ask for four titles and
 * then lay out three.
 */
const CONTINUE_SLOTS = 3;

/** Below this a start is "just now" — a number of minutes would read as noise. */
const JUST_NOW_SECONDS = 2 * SECONDS_PER_MINUTE;

/**
 * "When did I last play this", as a plural key plus its count.
 *
 * Elapsed time and not calendar days, unlike the inbox's "Today / Yesterday"
 * headings (C2.5): those group a list and therefore need day boundaries, while a
 * single row reads better as a distance. A match abandoned at 23:50 is "8 hours
 * ago" at 08:00 the next morning, which is what the player actually wants to
 * know — "Yesterday" would technically be true and useless.
 *
 * Measured against `serverNowMs()`, because `startedAt` was stamped by the
 * server: comparing it to a kiosk's own clock would let a machine that is an hour
 * off report a launch from ten minutes ago as an hour old.
 */
function lastPlayed(iso: string): { key: TKey; count: number } {
  const seconds = secondsSince(iso, serverNowMs());
  if (seconds < JUST_NOW_SECONDS)
    return { key: "home.playedJustNow", count: 0 };
  if (seconds < SECONDS_PER_HOUR) {
    return {
      key: "home.playedMinutesAgo",
      count: Math.floor(seconds / SECONDS_PER_MINUTE),
    };
  }
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  if (hours < 24) return { key: "home.playedHoursAgo", count: hours };
  return { key: "home.playedDaysAgo", count: Math.floor(hours / 24) };
}

/**
 * No `surface` prop, for the reason the greeting has none either (C3.1): whether
 * this is a member or a walk-in is already answered by which of `user` / `guest`
 * the store holds. Here it is not only tidier but *required* — the endpoint keys
 * the history on an account, and a guest has none, so a card on the guest surface
 * would be showing a walk-in the previous member's games.
 */
export function ContinueRow() {
  const { t, tp } = useT();
  const user = useStore((s) => s.user);
  const setView = useStore((s) => s.setView);
  const runningGameId = useStore((s) => s.runningGameId);
  const { launch, launchingId, busy } = useGameLaunch();

  // `GET /api/games/recent`, keyed by the member so a sign-out cannot leave the
  // next player looking at a cached row. Null key on the guest surface: nothing
  // is fetched for somebody who has no history to fetch.
  const recent = useApi(
    user ? ["games/recent", user.email, CONTINUE_SLOTS] : null,
    () => fetchRecentGames(undefined, CONTINUE_SLOTS),
  );

  const openLibrary = useCallback(() => setView("games"), [setView]);

  if (!user) return null;

  return (
    <section aria-labelledby="continue-heading">
      {/* `03`, matching the surface's existing run: the hero and the stat tiles
          above it carry no heading at all, but the ladder and the leaderboard
          below are already numbered 04 and 05, so this is the section that
          precedes them. */}
      <SectionHeader
        index="03"
        title={t("home.continueTitle")}
        headingId="continue-heading"
      />
      <DataBoundary
        state={recent}
        errorBare
        errorSize="sm"
        loading={
          <Row>
            {Array.from({ length: CONTINUE_SLOTS }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full" />
            ))}
          </Row>
        }
        isEmpty={(rows) => rows.length === 0}
        empty={
          // A first-visit member has nothing here, and the honest thing to offer
          // is the library rather than a shrug.
          <EmptyState
            bare
            size="sm"
            icon={icons.games}
            title={t("home.continueEmpty")}
            description={t("home.continueEmptyBody")}
            actionLabel={t("games.openLibrary")}
            onAction={openLibrary}
          />
        }
      >
        {(rows) => (
          <Row>
            {rows.map((row, i) => (
              <ContinueCard
                key={row.game.id}
                row={row}
                index={i}
                // Already on screen: there is nothing for a second launch to do,
                // and the strip in the shell already owns the way back out (F8.4).
                running={runningGameId === row.game.id}
                launching={launchingId === row.game.id}
                // Every other card goes dead while one is coming up — one machine,
                // one title.
                blocked={busy && launchingId !== row.game.id}
                onLaunch={() => void launch(row.game)}
                label={(count, key) => (count > 0 ? tp(key, count) : t(key))}
              />
            ))}
          </Row>
        )}
      </DataBoundary>
    </section>
  );
}

/**
 * Three cards side by side from `sm` up, stacked below it.
 *
 * Not a roving-focus group (F6.7): that pattern is for a homogeneous *set of
 * options* walked with arrow keys — nine category chips, sixty-seven grid tiles —
 * and it costs a keyboard player a mode to learn. Three separate primary actions
 * are three tab stops, which is cheaper than the mode.
 */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
  );
}

function ContinueCard({
  row,
  index,
  running,
  launching,
  blocked,
  onLaunch,
  label,
}: {
  row: RecentGame;
  index: number;
  running: boolean;
  launching: boolean;
  blocked: boolean;
  onLaunch: () => void;
  label: (count: number, key: TKey) => string;
}) {
  const { t } = useT();
  const { game } = row;
  const when = lastPlayed(row.lastPlayedAt);
  const whenText = label(when.count, when.key);

  // Three mutually exclusive states, and each one changes what the row *says*
  // rather than only how it looks: the meta line is the only line a player reads
  // twice.
  const status = running
    ? t("home.continueRunning")
    : launching
      ? t("home.continueLaunching")
      : whenText;

  const disabled = running || blocked || launching;

  return (
    <motion.button
      type="button"
      onClick={onLaunch}
      disabled={disabled}
      // The visible text says the title and the state; the verb does not appear
      // on screen because the whole card is the control. Given to the reader
      // explicitly so the button announces an action and not just a name.
      aria-label={t("home.continueLaunch", { name: game.name, when: status })}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={cn(
        "glass group relative flex items-center gap-3 overflow-hidden rounded-lg p-2 pr-3 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled
          ? "cursor-default"
          : "hover:border-primary/45 hover:shadow-[0_0_24px_-10px_rgba(229,53,43,0.6)] active:translate-y-px",
        blocked && "opacity-45",
      )}
    >
      <span className="relative shrink-0 overflow-hidden rounded-md">
        <GameCover
          game={game}
          hideTitle
          className="size-14"
          // Fixed 56 px box at every breakpoint, so the browser is told that
          // rather than left to guess from the grid.
          sizes="56px"
        />
        {/* `scrim` (§3.3) — a plate over cover art, the same rung the library
            card's launch overlay uses. Follows focus as well as hover, because a
            keyboard player has to see which card is armed. */}
        <span
          aria-hidden
          className={cn(
            "scrim absolute inset-0 flex items-center justify-center transition-opacity",
            launching
              ? "opacity-100"
              : running || blocked
                ? "opacity-0"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          {launching ? (
            <icons.pending size={18} className="animate-spin text-primary" />
          ) : (
            <icons.play
              size={18}
              fill="currentColor"
              className="text-primary"
            />
          )}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-display text-sm font-semibold text-text-high">
          {game.name}
        </span>
        <span className="label-mono flex items-center gap-1.5 text-[9px] text-text-low">
          {running ? (
            <icons.games size={11} aria-hidden className="text-warning" />
          ) : launching ? (
            <icons.pending
              size={11}
              aria-hidden
              className="animate-spin text-primary"
            />
          ) : (
            <icons.clock size={11} aria-hidden />
          )}
          <span className={cn("truncate", running && "text-warning")}>
            {status}
          </span>
        </span>
      </span>

      {/* Direction glyph, not a second button: the card is one control, so this
          is decoration that points at what clicking it does. */}
      {!running && !launching && (
        <icons.forward
          size={16}
          aria-hidden
          className="shrink-0 text-text-low transition-colors group-hover:text-primary"
        />
      )}
    </motion.button>
  );
}
