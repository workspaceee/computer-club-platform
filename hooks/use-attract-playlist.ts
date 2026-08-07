'use client'

/**
 * What the idle screen advertises (C1.8).
 *
 * Attract-mode used to be three room photographs plus whatever campaign banners
 * marketing had uploaded (F7.3). That is a screensaver: it says the club exists,
 * not that there is a Valorant cup at 21:00, eleven free seats in the Main Hall
 * and a combo for €9.90. This hook is the answer to "what is worth saying to
 * somebody standing in the doorway", and it says it out of the mock API — every
 * number on that screen is a row the counter can also see.
 *
 * Six sources, one playlist:
 *
 *   tournament  `GET /api/tournaments?status=upcoming`   — what is on tonight
 *   seats       `GET /api/club/occupancy/zones`          — where they can sit now
 *   bar         `GET /api/shop/products`                 — the tagged bar offers
 *   ladder      `GET /api/loyalty/leaderboard`           — who is winning
 *   pass        `GET /api/loyalty/battlepass`            — the season on sale
 *   promos      `GET /api/promos/active?surface=attract` — marketing's own art
 *
 * Three rules that keep it honest on a screen nobody is signed in at:
 *
 *  1. **No viewer-specific field is ever read.** The tournament and battle-pass
 *     endpoints answer as the fixture's current member (`registered`, `xp`,
 *     `level`, `isCurrentUser`), because that is who the mock session belongs to.
 *     An idle kiosk has no player in front of it, so the playlist takes only
 *     club facts from those payloads: the event, the season, the ladder. A slide
 *     saying "level 12" to an empty chair is worse than no slide.
 *  2. **A slide with no data does not exist.** Every kind is conditional; an
 *     empty bar, a finished season or a failed request drops its slide out of the
 *     rotation instead of rendering a panel with dashes in it. With nothing at
 *     all left the screen falls back to the room frames, which is what it was
 *     before this task and still a valid idle screen.
 *  3. **Stale is the real failure mode here.** This screen is left running for
 *     hours, so every source refreshes: seats on the same 30 s as the station
 *     strip (C1.6), the rest every five minutes. Without that the idle screen
 *     would keep offering a seat that was taken at 19:40 and a cup that started
 *     an hour ago.
 */

import { useMemo } from 'react'
import { useApi } from '@/hooks/use-api'
import {
  fetchActivePromos,
  fetchBattlePass,
  fetchLeaderboard,
  fetchProducts,
  fetchTournaments,
  fetchZoneOccupancy,
  serverTime,
  type TournamentSummary,
} from '@/lib/mock/api'
import type { ShopEntry } from '@/lib/types/catalog'
import type { BattlePassTier, LeaderboardEntry, Season } from '@/lib/types/loyalty'
import type { ZoneOccupancy } from '@/lib/types/machine'
import type { Promo } from '@/lib/types/promo'

/** Seats change while a walk-in is reading the screen; the rest does not. */
const SEATS_REFRESH_MS = 30_000
const SLOW_REFRESH_MS = 300_000

/**
 * Rows per list slide. Small on purpose: a panel read from across a room in nine
 * seconds carries three or four lines, and a fifth one only makes the first four
 * smaller.
 */
const BAR_ITEMS = 3
const LADDER_ROWS = 4
const PASS_PERKS = 3
const ZONE_ROWS = 4

/**
 * The bar tabs of the shop (F7.2), minus merch, time and memberships: a hoodie is
 * not something a walk-in buys on the way to a seat, and passes are already sold
 * by their own campaigns.
 */
const BAR_CATEGORIES: ShopEntry['category'][] = ['drinks', 'coffee', 'snacks', 'food', 'combo']

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export type AttractSlideKind =
  | 'frame'
  | 'promo'
  | 'tournament'
  | 'seats'
  | 'bar'
  | 'ladder'
  | 'pass'

interface SlideBase {
  key: string
  /** Background art for the Ken Burns layer. `''` renders the dark plate (F7.5). */
  src: string
}

/**
 * One frame of the rotation. A discriminated union rather than a bag of optional
 * fields, so the renderer cannot forget a case and a `seats` slide cannot be
 * built without its zones.
 */
export type AttractSlide =
  | (SlideBase & { kind: 'frame' })
  | (SlideBase & { kind: 'promo'; promo: Promo })
  | (SlideBase & { kind: 'tournament'; tournament: TournamentSummary; startsInMinutes: number })
  | (SlideBase & { kind: 'seats'; zones: ZoneOccupancy[]; free: number; total: number })
  | (SlideBase & { kind: 'bar'; items: ShopEntry[] })
  | (SlideBase & { kind: 'ladder'; entries: LeaderboardEntry[] })
  | (SlideBase & { kind: 'pass'; season: Season; perks: BattlePassTier[]; daysLeft: number })

export interface AttractPlaylist {
  slides: AttractSlide[]
  /** True until at least one source has answered — the shell holds the media. */
  isLoading: boolean
}

/**
 * @param frames Room photography from `public/attract/`, used as the backdrop of
 *   every data slide in turn. Passed in rather than imported so the component
 *   keeps owning the playlist's media (an admin-editable list in Stage 4).
 */
export function useAttractPlaylist(frames: string[]): AttractPlaylist {
  // `viewer: 'everyone'` — the coin-economy campaigns are filtered out server
  // side, because nobody is signed in in front of an idle kiosk (F7.3).
  const promos = useApi(
    ['promos/active', 'attract', 'everyone'],
    () => fetchActivePromos('attract', 'everyone'),
    { refreshInterval: SLOW_REFRESH_MS },
  )

  const tournaments = useApi(
    ['attract', 'tournaments'],
    () => fetchTournaments({ status: 'upcoming', limit: 1 }),
    { refreshInterval: SLOW_REFRESH_MS },
  )

  const seats = useApi(['attract', 'zone-occupancy'], () => fetchZoneOccupancy(), {
    refreshInterval: SEATS_REFRESH_MS,
  })

  const bar = useApi(['attract', 'bar'], () => fetchProducts({ inStockOnly: true }), {
    refreshInterval: SLOW_REFRESH_MS,
  })

  const ladder = useApi(['attract', 'ladder'], () => fetchLeaderboard({ limit: LADDER_ROWS }), {
    refreshInterval: SLOW_REFRESH_MS,
  })

  const pass = useApi(['attract', 'battlepass'], () => fetchBattlePass('free'), {
    refreshInterval: SLOW_REFRESH_MS,
  })

  const isLoading =
    promos.isLoading &&
    tournaments.isLoading &&
    seats.isLoading &&
    bar.isLoading &&
    ladder.isLoading &&
    pass.isLoading

  const slides = useMemo(() => {
    const content: AttractSlide[] = []

    /* ---- tonight's event ------------------------------------------------ */
    // `cancelled` and `finished` never reach here (`status: 'upcoming'`), but an
    // event that started an hour ago still does — and a club advertising a cup
    // that is already in its third round sends the walk-in to a closed door.
    const tournament = tournaments.data?.[0]
    if (tournament) {
      const startsInMinutes = Math.round(
        (Date.parse(tournament.startsAt) - Date.parse(serverTime())) / MINUTE_MS,
      )
      if (startsInMinutes > -15) {
        content.push({
          kind: 'tournament',
          key: `tournament-${tournament.id}`,
          src: '',
          tournament,
          startsInMinutes,
        })
      }
    }

    /* ---- free seats ------------------------------------------------------ */
    // Zones with no hardware at all are dropped: an empty zone is a row the club
    // has not finished setting up, not an offer. Fullest-last so the eye lands on
    // somewhere it can actually sit.
    const zones = (seats.data ?? [])
      .filter((zone) => zone.total > 0)
      .sort((a, b) => b.free - a.free)
    if (zones.length > 0) {
      content.push({
        kind: 'seats',
        key: 'seats',
        src: '',
        zones: zones.slice(0, ZONE_ROWS),
        // Totals over *every* zone, including any past the four shown: the
        // headline is the club's, not the list's.
        free: zones.reduce((n, z) => n + z.free, 0),
        total: zones.reduce((n, z) => n + z.total, 0),
      })
    }

    /* ---- bar offers ----------------------------------------------------- */
    // `tag` is the admin's marketing badge ("Popular", "New", "Save 15%"), so a
    // tagged row *is* the club's promoted item — the slide advertises what the
    // counter is pushing instead of the cheapest thing in the fridge.
    const barItems = (bar.data ?? []).filter(
      (item) => BAR_CATEGORIES.includes(item.category) && item.tag !== undefined,
    )
    if (barItems.length > 0) {
      content.push({
        kind: 'bar',
        key: 'bar',
        src: '',
        items: barItems.slice(0, BAR_ITEMS),
      })
    }

    /* ---- season ladder -------------------------------------------------- */
    // Under three names the board reads as a private club rather than a ladder
    // worth entering, and the fixture can legitimately return one row once
    // privacy opt-outs (F2.5) are applied.
    const entries = ladder.data ?? []
    if (entries.length >= 3) {
      content.push({ kind: 'ladder', key: 'ladder', src: '', entries })
    }

    /* ---- battle pass ---------------------------------------------------- */
    // Season facts only — never `userSeason`. `daysLeft` is the whole pitch: a
    // season with a month to run is an invitation, one with two days is urgency.
    const season = pass.data?.season
    if (season) {
      const daysLeft = Math.max(
        0,
        Math.ceil((Date.parse(season.endsAt) - Date.parse(serverTime())) / DAY_MS),
      )
      // Free-track rungs the club is giving away, highest first: the top of the
      // ladder is what sells it, not level 2's five coins.
      const perks = (pass.data?.tiers ?? [])
        .filter((tier) => tier.track === 'free')
        .sort((a, b) => b.level - a.level)
        .slice(0, PASS_PERKS)
        .reverse()
      if (daysLeft > 0 && perks.length > 0) {
        content.push({ kind: 'pass', key: `pass-${season.id}`, src: '', season, perks, daysLeft })
      }
    }

    /* ---- marketing's own banners ---------------------------------------- */
    // A campaign with no art still reaches the crawl at the bottom of the screen
    // — that needs a sentence, not a picture (F7.3).
    const promoSlides: AttractSlide[] = (promos.data ?? [])
      .filter((promo) => promo.image !== '')
      .map((promo) => ({ kind: 'promo', key: promo.id, src: promo.image, promo }))

    /* ---- interleave ----------------------------------------------------- */
    // Club inventory first, then a banner, then inventory again. Grouping them
    // would give the screen an ad break: five data panels, then five posters.
    const ordered: AttractSlide[] = []
    for (let i = 0; i < Math.max(content.length, promoSlides.length); i++) {
      if (i < content.length) ordered.push(content[i])
      if (i < promoSlides.length) ordered.push(promoSlides[i])
    }

    // Nothing to sell — the screen is the room again.
    if (ordered.length === 0) {
      return frames.map((src, i) => ({ kind: 'frame', key: `frame-${i}`, src }) as AttractSlide)
    }

    // Data slides borrow the room photography in turn, so the club is still on
    // screen behind every offer and no two neighbours share a backdrop.
    let frame = 0
    return ordered.map((slide) =>
      slide.kind === 'promo'
        ? slide
        : { ...slide, src: frames.length > 0 ? frames[frame++ % frames.length] : '' },
    )
  }, [frames, promos.data, tournaments.data, seats.data, bar.data, ladder.data, pass.data])

  return { slides, isLoading }
}
