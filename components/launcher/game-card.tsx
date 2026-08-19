'use client'

/**
 * One tile of the library (C4.4): cover, genre, rating, how many people are in it
 * **in the hall right now**, and the launcher it starts through.
 *
 * Extracted from `games-view.tsx` rather than left inline: the same tile is what
 * the detail panel opens from (C4.5) and what "My games" pins (C4.9), and a card
 * that lives inside the screen that filters it cannot be reused by either without
 * dragging the filter row along.
 *
 * The two facts this card gets right, and the shapes of the bugs it used to ship:
 *
 *  1. **"In the club now" is a server answer, not a fluctuating guess.** The
 *     counter here was `Game.players` — a *lifetime* play count in the thousands —
 *     nudged by ±10 every five seconds on a `setInterval`. Under a `Users` glyph
 *     on a forty-seat club's screen that read as "1 204 people are in this game",
 *     which is off by two orders of magnitude and moving. `playersInClub` comes
 *     from `fetchGamePresence()` (seated players only), and when it is `0` the chip
 *     is *absent*: a live-looking zero on sixty idle titles is noise, and absence
 *     is what "nobody, right now" honestly looks like. It is stated as a badge
 *     that says what it counts, because the green dot it replaced spent a status
 *     colour — the club's word for *availability* — on "people".
 *  2. **The launcher is a mark, not a word.** Steam, Epic, Riot and Battle.net
 *     decide whether the start needs one of the club's shared logins (C4.7), so
 *     which one it is belongs on the tile. It is drawn as the brand's own mark
 *     (`lib/launcher-marks.tsx`), which a player identifies without reading and
 *     which fits where the boxed all-caps word cropped to "BATTLE…"; the four
 *     launchers with no mark keep the word, printed verbatim and never translated,
 *     because these are product names (F2.2).
 */

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { GameCover } from '@/components/game-cover'
import { CATEGORY_KEYS } from '@/lib/game-labels'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { LAUNCHER_MARKS, LauncherMark } from '@/lib/launcher-marks'
import { useStore } from '@/lib/store'
import type { Game } from '@/lib/types/catalog'

export function GameCard({
  game,
  playersInClub,
  query,
}: {
  game: Game
  /**
   * Seated players in this title right now. `0` covers both "nobody is in it" and
   * "the presence read has not answered yet" — deliberately the same case, because
   * the card's only correct move in either is to claim nothing.
   */
  playersInClub: number
  query: string
}) {
  const { t, tp, formatNumber } = useT()
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const setDetailGame = useStore((s) => s.setDetailGame)

  return (
    <motion.div
      whileHover={{ y: -6 }}
      // Lifting the card used to add a second red bloom directly under the
      // launch button's own halo, so the hovered tile glowed twice for one
      // action. The raise is depth now — a black elevation shadow, the same
      // language every other floating surface uses — and the red is left to the
      // control (§4.4).
      className="glass group relative overflow-hidden rounded-lg transition-shadow hover:border-border-strong hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)]"
    >
      {/* `aspect-video`, not a fixed height: the covers are generated at 800×450,
          so a 16:9 box is the one shape that neither crops the art nor
          letterboxes it, and it holds its own space before the file decodes —
          the tile reserves its slot in the grid whether the image arrives,
          arrives late, or never arrives at all. */}
      <GameCover
        game={game}
        className="aspect-video w-full"
        // The card writes the name into its own copy strip three lines down, so
        // the cover's built-in caption printed it twice per tile —
        // "CIVILIZATION VII" burned across the art with "Civilization VII"
        // directly beneath it. `hideTitle` is the documented way out: this
        // caller owns the heading, the cover stays pure art.
        hideTitle
        // Mirrors the breakpoints of the grid — in pixels at the top end,
        // not `20vw`, because the shell caps its content at `max-w-6xl`: past
        // ~1150px the column stops growing with the window, so a tile on the
        // club's 2560px display is ~205px wide and not the 512px `20vw` claims.
        // Wrong `sizes` is not a cosmetic bug — it makes the browser pick a
        // candidate for a width the tile never has, and the station downloads a
        // 2× file for every one of 67 covers.
        sizes="(min-width: 1536px) 210px, (min-width: 1024px) 265px, (min-width: 640px) 33vw, 50vw"
      />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Genre: a filled tint. Two badges of the same weight side by side
              would read as one two-word label, so the pair is separated by
              material — tint for the club's own taxonomy, outline for the
              third-party name. */}
          {/* This is the badge that gives way when the row is too narrow, not the
              launcher one: at two columns on a 390px phone the pair did not fit,
              and the strip that yielded was the third-party name — "BATTLE…",
              which names no launcher at all. The genre survives truncation
              because it is the club's own taxonomy and it is stated in full one
              scroll up, in the filter row that is on the same screen. */}
          <span
            className="label-mono min-w-0 truncate rounded-[4px] bg-white/5 px-2 py-0.5 text-[8px] text-text-medium"
            title={t(CATEGORY_KEYS[game.category])}
          >
            {t(CATEGORY_KEYS[game.category])}
          </span>
          {/* Which launcher the title starts through (C4.4) — the club runs Steam,
              Epic, Riot and Battle.net side by side, and which one it is decides
              whether the start needs a house account at all (C4.7), so it belongs
              on the tile and not only in the launch modal.
              Stated as the brand's own mark where one exists: a player recognises
              the Steam cog without reading it, which is the whole reason the strip
              can be 12 px wide instead of the 60 px the boxed word needed — and
              the word is what cropped to "BATTLE…" at two columns. No frame and no
              tint around it; the mark is already a distinct shape, and a box would
              put it back to arguing with the genre chip beside it.
              The name is never dropped, only moved: the four launchers with no mark
              in the registry keep printing it, and every mark carries it in `title`
              and for screen readers — verbatim, since these are product names
              (F2.2). */}
          {LAUNCHER_MARKS[game.launcher] ? (
            <span
              className="flex shrink-0 items-center text-text-low transition-colors group-hover:text-text-medium"
              title={`${t('games.launcherLabel')}: ${game.launcher}`}
            >
              <LauncherMark launcher={game.launcher} size={13} />
              <span className="sr-only">{`${t('games.launcherLabel')}: ${game.launcher}`}</span>
            </span>
          ) : (
            <span
              className="label-mono shrink-0 text-[8px] text-text-low"
              title={`${t('games.launcherLabel')}: ${game.launcher}`}
            >
              {game.launcher}
            </span>
          )}
        </div>
        <h3 className="truncate font-display text-sm font-semibold text-text-high">
          <Highlight text={game.name} query={query} />
        </h3>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex shrink-0 items-center gap-1 text-warning">
            <icons.rating size={12} fill="currentColor" aria-hidden />
            {/* Through the provider's formatter, not `toFixed(1)`: the decimal
                separator is a comma in both Russian and Lithuanian, and "4.8"
                is a foreign-looking number on a screen where every other figure
                is localised. */}
            <span aria-hidden>
              {formatNumber(game.rating, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            {/* A star and a number read as a rating only if you can see the
                star. Spoken, it is the bare figure "4.8" — so the sentence is
                stated once, for the reader who has no glyph. */}
            <span className="sr-only">
              {t('games.ratingOutOf', {
                v: formatNumber(game.rating, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
              })}
            </span>
          </span>
          {/* Absent at zero, on purpose — see the header. Stated as a badge with
              the words in it, not as a green dot beside a bare number: the dot
              borrowed a status colour to mean "people", which is the club's
              *availability* language (a free seat, a machine that is up), and it
              made the tile's only live fact the loudest thing on a shelf of sixty
              — while still needing the reader to guess what the number counted.
              The badge says it. It does not pulse; the club's motion rules make
              animation opt-out (§4.4–4.5), and sixty animated dots would be sixty
              things moving behind one decision. */}
          {playersInClub > 0 && (
            <span className="label-mono flex min-w-0 shrink-0 items-center gap-1 rounded-[4px] bg-white/5 px-1.5 py-0.5 text-[8px] tracking-[0.1em] text-text-medium">
              <span className="tabular-nums text-text-high" aria-hidden>
                {formatNumber(playersInClub)}
              </span>
              <span aria-hidden>{t('games.inClubShort')}</span>
              {/* The badge reads "2 in club"; spoken it should be a sentence, and
                  a plural one — Russian and Lithuanian inflect the noun. */}
              <span className="sr-only">
                {tp('games.inClubNow', playersInClub, {
                  n: formatNumber(playersInClub),
                })}
              </span>
            </span>
          )}
        </div>
      </div>
      {/* `group-focus-within` is not a nicety here: the launch button — the only
          action on a card — was revealed by hover alone, so a keyboard player
          focused a control they could not see press. The overlay now follows
          focus as well as the pointer. */}
      {/* Spans the whole card, not just the cover. Scoped to the art, the bottom
          third of every tile — the strip carrying the name, the rating and the
          live counter, i.e. the part a player reads before deciding — was a dead
          zone that dismissed the only action on the card the moment the pointer
          reached it. */}
      {/* `scrim` (§3.3): the tile is darkened so a raised control on top of it
          reads — the same job a modal backdrop does, so the same depth. */}
      {/* `pointer-events-none` while it is invisible, `auto` once it is shown: at
          `opacity-0` the layer is still a layer, so an untouched tile had a
          transparent sheet over its whole face swallowing every click and
          text selection. It only becomes a surface when it is actually visible —
          and because the trigger is `group-hover`, the same pointer that reveals
          it is the one that then reaches the button. */}
      {/* `group-has-[:focus-visible]`, not `group-focus-within`: focus-within
          fires for a *mouse* click too, so the tile a player launched from kept
          its overlay after they cancelled the dialog — the browser restores
          focus to the button that opened it — and the next tile they hovered lit
          up as well, two launch buttons on screen for one decision. Keyboard
          focus still reveals it, which is the reason the variant exists. */}
      <div className="scrim pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100">
        <button
          onClick={() => setLaunchGame(game.id)}
          // The card carries the title, but a button announcing just "Play"
          // repeats itself sixty times in the accessibility tree.
          aria-label={`${t('games.launch')} ${game.name}`}
          // Both controls are roving items (F6.7): the grid stays one tab stop,
          // and the arrows reach the second action too. Marking only the launch
          // button would have left "Details" either unreachable by keyboard or —
          // as a plain tab stop — sixty-seven extra stops between the library and
          // the top bar, which is the exact counting problem the hook exists for.
          data-roving-item
          className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_24px_-4px_rgba(229,53,43,0.9)] transition-transform hover:scale-105"
        >
          <icons.play size={15} fill="currentColor" aria-hidden />
          {t('games.launch')}
        </button>
        {/* The way into the detail panel (C4.5), and deliberately the quieter of
            the two: a player who already knows the title starts it from here, and
            one who does not reads about it first. Stated as its own control rather
            than as a click on the tile's body — an unlabelled clickable card is a
            surface a keyboard player cannot find and a screen reader announces as
            a picture. T1 stays with the launch button; this is plain text on the
            scrim (§4.4). */}
        <button
          onClick={() => setDetailGame(game.id)}
          aria-label={t('games.detailOpenLabel', { name: game.name })}
          data-roving-item
          className="flex items-center gap-1.5 rounded-sm px-3 py-1 text-[11px] font-medium text-text-medium transition-colors hover:bg-white/10 hover:text-text-high"
        >
          <icons.info size={13} aria-hidden />
          {t('games.detailOpen')}
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Marks the searched term inside a title (C4.3).
 *
 * Plain substring matching on a case-folded copy, and the slice comes out of the
 * *original* string — replacing the matched text with the query itself would
 * reprint "elden ring" in the player's own casing over the catalogue's
 * "Elden Ring". No regex either: titles carry `:`, `.` and `(` and a player
 * typing "PUBG:" would otherwise build an invalid pattern out of their own input.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim()
  // Every occurrence, not just the first: "Counter-Strike 2" against "st" left
  // one of two matches marked, which reads as the mark meaning something other
  // than "you typed this". Built with `useMemo` because it runs once per card
  // per keystroke — sixty titles on a club shelf.
  const parts = useMemo(() => {
    if (!term) return null
    const haystack = text.toLowerCase()
    const needle = term.toLowerCase()
    const out: { text: string; hit: boolean }[] = []
    let from = 0
    for (;;) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      if (at > from) out.push({ text: text.slice(from, at), hit: false })
      // The slice comes out of the *original* string — replacing the matched
      // text with the query itself would reprint "elden ring" in the player's
      // own casing over the catalogue's "Elden Ring".
      out.push({ text: text.slice(at, at + needle.length), hit: true })
      from = at + needle.length
    }
    if (out.length === 0) return null
    if (from < text.length) out.push({ text: text.slice(from), hit: false })
    return out
  }, [text, term])

  if (!parts) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          // `mark` for the meaning, restyled because the UA default is a black-
          // on-yellow block that belongs to no palette here. The term is stated
          // in the brand red over a faint wash of it — the same "this is what
          // you asked for" colour the active filter uses.
          <mark key={i} className="rounded-[2px] bg-primary/20 text-primary">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
