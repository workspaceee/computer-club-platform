// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/hero` — the slides of the carousel at the top of Home (C3.9).
//
// One endpoint, three kinds of slide: live campaigns, upcoming brackets and the
// club's novelty shelf. The composition happens **here rather than in the
// component** for one reason: the hero is the only block on Home whose content
// overlaps two other blocks on the same screen, and "what may the hero say"
// therefore has to be answered once, next to the rows, instead of by a carousel
// re-deriving it from three separate reads.
//
// Two rules the server owns:
//
//   1. **The home card's tournament is not the hero's business.** `TournamentCard`
//      below (C3.8) shows the nearest bracket with its wallet-checked Join button.
//      The hero drops that tournament *and* any campaign advertising it, so one
//      bracket occupies one place on the screen. The exclusion is computed from
//      `CARD_STATUSES` and the same `startsAt` sort the card uses, so the two
//      cannot disagree about which one "the nearest" is.
//   2. **Who may see a slide.** Campaigns already carry an audience. Brackets are
//      members-only here because entry costs a wallet the walk-in surface has none
//      of and `tournaments` is a launcher-only section — a guest slide would deep
//      link to a view `resolveView` refuses. The novelty shelf is for everyone: a
//      walk-in can press Play on a new title exactly like a member can.
import { query } from '@/lib/mock/api/client'
import { CARD_STATUSES, summarizeTournament, type TournamentSummary } from '@/lib/mock/api/events'
import type { PromoViewer } from '@/lib/mock/api/promo'
import { db, getActivePromos, getNewReleases } from '@/lib/mock/db'
import type { Game, GameRelease } from '@/lib/types/catalog'
import type { ID } from '@/lib/types/common'
import type { Promo } from '@/lib/types/promo'

/**
 * A campaign banner. Carries the whole `Promo` row because the copy *is* the
 * slide: badge, headline, subtitle and CTA are club content the staff writes and
 * the hero prints as written (F2.2).
 */
export interface HeroPromoSlide {
  kind: 'promo'
  id: ID
  promo: Promo
}

/**
 * An upcoming bracket. Carries the summary and the game for its art; the frame
 * around them — "Tonight", "Starts in", the way to the schedule — is interface
 * chrome and comes from the dictionaries, not from here.
 */
export interface HeroTournamentSlide {
  kind: 'tournament'
  id: ID
  tournament: TournamentSummary
  /** The title it is played on. `null` if the library no longer stocks it. */
  game: Game | null
}

/** A title from the club's novelty shelf, newest first. */
export interface HeroReleaseSlide {
  kind: 'release'
  id: ID
  game: Game
  release: GameRelease
}

export type HeroSlide = HeroPromoSlide | HeroTournamentSlide | HeroReleaseSlide

/**
 * Ceiling on the deck.
 *
 * A carousel is a queue with one thing visible, so every extra slide is content
 * the player has to wait through — and at seven seconds a slide, a ten-card deck
 * is over a minute before the first one comes back. Campaigns are already ordered
 * by the priority the club set, so the cut falls on the least important tail.
 */
const MAX_SLIDES = 6

/**
 * The bracket the home card is about, or `null` when the club has nothing
 * scheduled. Mirrors `fetchNextTournament()`'s pick exactly — same statuses, same
 * sort — because its whole job here is to name what the hero must not repeat.
 */
function cardTournamentId(): ID | null {
  const next = db.tournaments
    .filter((t) => CARD_STATUSES.includes(t.status))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  return next?.id ?? null
}

/**
 * `GET /api/hero?viewer=…` — the carousel's single read.
 *
 * Ordered campaigns first, then brackets by how soon they start, then the shelf by
 * how recently the club stocked it. That order is editorial, not arbitrary: a
 * campaign is something the club is actively selling tonight, a bracket is
 * something happening later, and a new title is something that will still be there
 * tomorrow. Within campaigns the club's own `priority` decides.
 *
 * An empty deck is a legitimate answer (`[]`) — a quiet Tuesday with no campaign,
 * no second bracket and no new titles — and the carousel renders nothing for it.
 */
export function fetchHeroSlides(
  viewer: PromoViewer = 'members',
  userId: ID = db.currentUserId,
): Promise<HeroSlide[]> {
  return query('hero.fetchHeroSlides', () => {
    const excludedId = cardTournamentId()

    const promoSlides: HeroSlide[] = getActivePromos('home', viewer)
      // The campaign for the card's bracket goes with the bracket. Without this the
      // screen would carry "Check-in open — CS2 Weekly Cup" in the hero and the very
      // same cup, with a working Join, three blocks below.
      .filter((p) => !(p.refType === 'tournament' && p.refId === excludedId))
      .map((promo) => ({ kind: 'promo', id: `promo:${promo.id}`, promo }))

    const tournamentSlides: HeroSlide[] =
      viewer === 'members'
        ? db.tournaments
            .filter((t) => CARD_STATUSES.includes(t.status) && t.id !== excludedId)
            .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
            .map((t) => ({
              kind: 'tournament',
              id: `tournament:${t.id}`,
              tournament: summarizeTournament(t, userId),
              game: db.games.find((g) => g.id === t.gameId) ?? null,
            }))
        : []

    const releaseSlides: HeroSlide[] = getNewReleases().map(({ game, release }) => ({
      kind: 'release',
      id: `release:${game.id}`,
      game,
      release,
    }))

    return [...promoSlides, ...tournamentSlides, ...releaseSlides].slice(0, MAX_SLIDES)
  })
}
