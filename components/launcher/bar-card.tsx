'use client'

/**
 * "The bar" on the home screen (C3.6).
 *
 * A seated player who wants a cola has, until now, had to leave the screen they
 * are on, cross a three-tab shop and find one card among thirty-seven. This card
 * is the shortcut: the club's three most-ordered rows, tonight's bar campaign, and
 * the one button that matters on each of them. It is not a menu — the whole
 * catalogue is a screen, and the header's "Whole menu" is the door to it.
 *
 * The decisions worth naming, each of them a bug the card would otherwise ship:
 *
 *  1. **The server picks the three, and picks them by the club's orders.**
 *     `fetchBarBoard()` counts units sold across the club's order lines, so this
 *     component renders a ranking it did not compute and cannot reshuffle. A card
 *     that sorted the catalogue itself would be a second definition of "popular" —
 *     and one ranking by *this* player's history would be a "recently ordered"
 *     list wearing the wrong label.
 *
 *  2. **The campaign is data, not a second banner.** The promo strip higher up
 *     this same screen asks for `surface: 'home'`; this card asks for `'bar'`, so
 *     the club decides where a campaign appears and one tray can never be
 *     advertised twice on one screen (see `PromoSurface`). The promoted row is also
 *     removed from the popular three server-side, for the same reason at a smaller
 *     scale.
 *
 *  3. **No discount arithmetic.** The banner shows the club's copy and the club's
 *     price. Promotions are not modelled in `quoteCart`, so a card computing
 *     "−15 %" here would be contradicted by the cart drawer one click later — and
 *     the drawer is the number that gets charged.
 *
 *  4. **One refusal, borrowed.** `useSalesGate()` answers "may money move at all"
 *     (C2.11, C2.12), and the reason is exclusive: a club that is both shut and
 *     unreachable gets the sentence about opening hours, not two explanations for
 *     four dead buttons. The catalogue keeps rendering through both — browsing is
 *     not buying, and a player who decides what to order during an outage is served
 *     the moment the link is back.
 *
 * Unlike the dailies and the season card, this one **is** rendered for a walk-in:
 * a guest orders at the bar exactly like a member does, and the board is keyed to
 * the club rather than to an account. What a guest lacks is a wallet, and that is
 * the cart's asymmetry to state, not this card's.
 */

import { motion } from 'framer-motion'
import { DataBoundary } from '@/components/data-boundary'
import { ProductImage } from '@/components/product-image'
import { Skeleton } from '@/components/skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { useApi } from '@/hooks/use-api'
import { useSalesGate } from '@/hooks/use-sales-gate'
import { useT } from '@/lib/i18n/provider'
import { icons, type LucideIcon } from '@/lib/icons'
import type { LauncherSurface } from '@/lib/launcher-nav'
import { BAR_POPULAR_SLOTS, fetchBarBoard } from '@/lib/mock/api'
import { formatEur } from '@/lib/money'
import { useStore } from '@/lib/store'
import type { Product, ProductCategory } from '@/lib/types/catalog'
import type { Promo } from '@/lib/types/promo'
import { cn } from '@/lib/utils'

/**
 * Fallback mark per category, so a row whose photograph is missing or still
 * decoding is recognisable as a coffee rather than an empty square. Keyed on the
 * category and not the name for the reason the shop grid is: the name is club copy
 * and matching words in it breaks the day a club writes it in Lithuanian.
 */
const CATEGORY_ICONS: Partial<Record<ProductCategory, LucideIcon>> = {
  drinks: icons.drinks,
  coffee: icons.coffee,
  snacks: icons.snacks,
  food: icons.food,
  combo: icons.combo,
}

function iconFor(product: Product): LucideIcon {
  return CATEGORY_ICONS[product.category] ?? icons.drinks
}

export function BarCard({
  surface = 'launcher',
  index,
}: {
  surface?: LauncherSurface
  index: string
}) {
  const { t } = useT()
  const setView = useStore((s) => s.setView)
  const addToCart = useStore((s) => s.addToCart)
  const toast = useStore((s) => s.toast)

  // The viewer travels in the request, not in a filter here — the same contract
  // the promo strip uses (F7.3): a walk-in asks as `everyone` and simply receives
  // fewer campaigns, instead of receiving a members-only one to hide in JSX. It is
  // part of the key so switching surfaces refetches rather than reusing the
  // member list.
  const viewer = surface === 'guest' ? 'everyone' : 'members'
  // `shop/…`, so a pushed `order.status` or `tab.updated` refreshes the board —
  // and with it the stock that decides whether a row may still be offered
  // (`EVENT_INVALIDATES`).
  const board = useApi(['shop/bar', viewer], () => fetchBarBoard(viewer))

  const sales = useSalesGate()

  const add = (product: Product) => {
    addToCart(product)
    // `addToCart` opens the drawer itself, so the toast only has to name the row
    // that was added — the basket is already on screen saying the rest.
    toast('success', t('home.barAddedToast', { name: product.name }))
  }

  return (
    // First anchor of the tour's bar step (C3.12). The step lights this card
    // together with the basket in the top bar, because "order at the bar" is one
    // answer in two places: the board is where a drink is chosen, and the basket
    // is where it is paid for — a spotlight on either half alone would leave the
    // player holding a cola with nowhere to take it.
    <section data-tour="bar" aria-labelledby="bar-heading">
      <SectionHeader
        index={index}
        title={t('home.barTitle')}
        headingId="bar-heading"
        subtitle={t('home.barSubtitle')}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('shop')}
            iconLeft={<icons.shop aria-hidden />}
            // Two words on screen; the reader is told which section they open.
            aria-label={t('home.barMenuLabel')}
          >
            {t('home.barMenu')}
          </Button>
        }
      />

      <div className="glass tick-corners flex flex-col gap-4 rounded-xl p-4">
        <DataBoundary
          state={board}
          errorBare
          errorSize="sm"
          loading={
            // The final height of the tiles and the banner, so the surface does not
            // resize when the board lands (C3.11).
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: BAR_POPULAR_SLOTS }).map((_, i) => (
                  <Skeleton key={i} className="h-[124px] w-full" radius="md" />
                ))}
              </div>
              <Skeleton className="h-[92px] w-full" radius="md" />
            </div>
          }
          // A sold-out row never reaches this card, so "empty" is the club having
          // put nothing on the bar at all — and it says who it is waiting on.
          isEmpty={(data) => data.items.length === 0 && data.promo === null}
          empty={
            <EmptyState
              bare
              size="sm"
              icon={icons.drinks}
              title={t('home.barEmpty')}
              description={t('home.barEmptyBody')}
            />
          }
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              <ul className="grid gap-3 sm:grid-cols-3">
                {data.items.map((product, i) => (
                  <BarRow
                    key={product.id}
                    product={product}
                    index={i}
                    canSpend={sales.canSpend}
                    onAdd={() => add(product)}
                  />
                ))}
              </ul>

              {/* Under the three, not above them: the section promised the club's
                  most-ordered rows, and the campaign is the "and tonight also
                  this" that follows — the one element on the card allowed to step
                  forward out of the panel. */}
              {data.promo && (
                <BarOffer
                  promo={data.promo}
                  product={data.promoProduct}
                  canSpend={sales.canSpend}
                  onAdd={data.promoProduct ? () => add(data.promoProduct as Product) : undefined}
                />
              )}
            </div>
          )}
        </DataBoundary>

        {/* One line, whichever pause is in force — `reason` is exclusive, so four
            dead buttons never collect two explanations. The prices above stay
            true: there is simply nobody to pour it yet. */}
        {sales.reason === 'closed' && (
          <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
            {t('home.barClosedHint')}
          </p>
        )}
        {sales.reason === 'offline' && (
          <p role="status" className="text-pretty text-xs leading-relaxed text-warning">
            {`${t('realtime.salesTitle')} — ${t('realtime.salesHint')}`}
          </p>
        )}
      </div>
    </section>
  )
}

function BarRow({
  product,
  index,
  canSpend,
  onAdd,
}: {
  product: Product
  index: number
  /** From the section's one `useSalesGate()` read — never re-derived per row. */
  canSpend: boolean
  onAdd: () => void
}) {
  const { t } = useT()

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      // Recessed into the panel — the shallow rung of the well family (§3.3). The
      // row is a promise; the thing that steps forward on this card is the offer
      // below it.
      className="well-shallow flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <div className="flex items-start gap-3">
        {/* A fixed box, so a row's height is decided before any photograph
            resolves (F7.2). */}
        <ProductImage
          src={product.image}
          alt={product.name}
          fallbackIcon={iconFor(product)}
          className="size-12 shrink-0"
          sizes="48px"
        />
        <div className="min-w-0">
          {/* Club copy, printed as the club wrote it (F2.2). */}
          <p className="text-pretty text-sm font-semibold leading-snug text-text-high">
            {product.name}
          </p>
          {product.description && (
            <p className="truncate text-[11px] leading-relaxed text-text-low">
              {product.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="font-display text-base font-bold tabular-nums text-text-high">
          {formatEur(product.priceCents)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          // A club that is shut or unreachable can neither charge for this nor
          // bring it, so the button is off rather than posting an order that will
          // be refused. The reason is stated once under the card.
          disabled={!canSpend}
          onClick={onAdd}
          iconLeft={<icons.add aria-hidden />}
          // Four "Add" buttons in one card are four identical names, so the reader
          // is given the row this one fills the basket with.
          aria-label={t('home.barAddLabel', { name: product.name })}
        >
          {t('home.barAdd')}
        </Button>
      </div>
    </motion.li>
  )
}

/**
 * Tonight's bar campaign.
 *
 * Its art is the promoted product's own photograph rather than a banner file: the
 * thing being sold is a tray of food, and the club has a picture of it already.
 * A campaign that names no single row (`product === null`) is copy with no button —
 * legitimate, and the reason `onAdd` is optional rather than a no-op handler.
 */
function BarOffer({
  promo,
  product,
  canSpend,
  onAdd,
}: {
  promo: Promo
  product: Product | null
  canSpend: boolean
  onAdd?: () => void
}) {
  const { t } = useT()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.18 }}
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-primary/45 bg-primary/[0.07] p-4',
        'shadow-[0_0_24px_-8px_rgba(229,53,43,0.45)] sm:flex-row sm:items-center',
      )}
    >
      {product && (
        <ProductImage
          src={product.image}
          alt={product.name}
          fallbackIcon={iconFor(product)}
          highlight
          className="size-16 shrink-0"
          sizes="64px"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="label-mono flex w-fit items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[9px] text-primary-foreground">
          <icons.sale size={11} aria-hidden />
          {promo.badge}
        </span>
        {/* Campaign copy is club content, not interface chrome (F2.2) — headline
            and subtitle are printed exactly as the staff wrote them. */}
        <p className="text-pretty font-display text-base font-bold uppercase leading-tight tracking-tight text-text-high">
          {promo.title}
        </p>
        <p className="text-pretty text-xs leading-relaxed text-text-medium">{promo.subtitle}</p>
      </div>

      {product && onAdd && (
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <span className="font-display text-xl font-bold tabular-nums text-text-high">
            {formatEur(product.priceCents)}
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={!canSpend}
            onClick={onAdd}
            iconLeft={<icons.add aria-hidden />}
            aria-label={t('home.barAddLabel', { name: product.name })}
          >
            {t('home.barAdd')}
          </Button>
        </div>
      )}
    </motion.div>
  )
}
