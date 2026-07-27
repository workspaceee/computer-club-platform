// MOCK ONLY — replaced in Stage 4 (F3.4).
//
// `/api/promos/*` — the marketing campaigns behind the promo strip on Home and
// the idle screen in attract-mode (F7.3).
//
// Read-only: campaigns are club content edited in admin, so the client has no
// write endpoint here. Two things are deliberately decided *server-side* rather
// than in the components:
//
//   1. **Which campaigns are live.** The window check runs against `db.now`, the
//      single clock every countdown in the product already uses, so the strip and
//      the idle screen can never advertise a different set of offers on the same
//      evening — the exact drift F7.3 exists to remove.
//   2. **Who may see them.** `audience: 'members'` campaigns talk about coins and
//      tournament entry, which the PostPaid walk-in surface has neither of. The
//      guest surface asks with `'everyone'` and simply receives less, instead of
//      receiving everything and hiding rows in JSX.
import { query, required } from '@/lib/mock/api/client'
import { db, getActivePromos } from '@/lib/mock/db'
import type { ID } from '@/lib/types/common'
import type { Promo, PromoAudience, PromoSurface } from '@/lib/types/promo'

/**
 * Who is looking. `'members'` is the signed-in launcher, `'everyone'` the
 * walk-in guest surface — the same vocabulary as `Promo.audience`, so a caller
 * passes the viewer and the server does the matching.
 */
export type PromoViewer = PromoAudience

export interface PromoQuery {
  /** Only campaigns allowed on this surface. */
  surface?: PromoSurface
  viewer?: PromoViewer
  /** Drop campaigns outside their `startsAt`/`endsAt` window. Default `true`. */
  activeOnly?: boolean
  limit?: number
}

/**
 * `GET /api/promos` — the full campaign list for a surface, priority first.
 *
 * `activeOnly: false` returns scheduled and expired rows too; that is for an
 * admin preview, not for a player-facing screen.
 */
export function fetchPromos(params: PromoQuery = {}): Promise<Promo[]> {
  return query('promo.fetchPromos', () => {
    const { surface = 'home', viewer = 'members', activeOnly = true, limit } = params

    const items = activeOnly
      ? getActivePromos(surface, viewer)
      : db.promos
          .filter((p) => p.surfaces.includes(surface))
          .filter((p) => !(p.audience === 'members' && viewer !== 'members'))
          .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))

    return limit === undefined ? items : items.slice(0, limit)
  })
}

/**
 * `GET /api/promos/active?surface=…` — what to show right now.
 *
 * The hero strip and attract-mode both call this; a surface with no live
 * campaign gets `[]` and is expected to render nothing rather than a placeholder.
 */
export function fetchActivePromos(
  surface: PromoSurface = 'home',
  viewer: PromoViewer = 'members',
  limit?: number,
): Promise<Promo[]> {
  return query('promo.fetchActivePromos', () => {
    const items = getActivePromos(surface, viewer)
    return limit === undefined ? items : items.slice(0, limit)
  })
}

/** `GET /api/promos/:id` */
export function fetchPromo(promoId: ID): Promise<Promo> {
  return query('promo.fetchPromo', () => required(db.promos.find((p) => p.id === promoId)))
}

/**
 * `GET /api/promos/ticker` — the attract-mode crawl.
 *
 * Returns finished lines because the ticker is a single scrolling strip with no
 * layout of its own: one line per live campaign, composed from the same rows the
 * banners use, so the crawl cannot outlive an offer that ended an hour ago.
 */
export function fetchPromoTicker(viewer: PromoViewer = 'everyone'): Promise<string[]> {
  return query('promo.fetchPromoTicker', () =>
    getActivePromos('attract', viewer).map((p) => `${p.badge} — ${p.title}`),
  )
}
