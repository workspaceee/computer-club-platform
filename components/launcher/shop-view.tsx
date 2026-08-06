'use client'

import { motion } from 'framer-motion'
import { icons, type LucideIcon } from '@/lib/icons'
import { useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { IconTile } from '@/components/icon-tile'
import { ProductImage } from '@/components/product-image'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useClubHours } from '@/hooks/use-club-hours'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { runsPastClosing } from '@/lib/club-hours'
import { useT } from '@/lib/i18n/provider'
import { fetchShopItems, fetchShopMemberships, fetchShopTime } from '@/lib/mock/api'
import { formatEur } from '@/lib/money'
import { cartCount, useStore } from '@/lib/store'
import type { ProductCategory, ShopEntry } from '@/lib/types/catalog'
import { cn } from '@/lib/utils'

type Tab = 'time' | 'memberships' | 'items'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'time', label: 'Gaming Time', icon: icons.timer },
  { id: 'memberships', label: 'Memberships', icon: icons.premium },
  { id: 'items', label: 'Physical Items', icon: icons.shop },
]

/** One endpoint per tab — the shop grid never slices a single big catalogue. */
const TAB_ENDPOINTS: Record<Tab, () => Promise<ShopEntry[]>> = {
  time: fetchShopTime,
  memberships: fetchShopMemberships,
  items: fetchShopItems,
}

/**
 * Icons for the two tabs that have no photography, keyed by id so each tier and
 * each pass reads as itself. Exact matches first, then the prefix rules below.
 */
const ICONS: Record<string, LucideIcon> = {
  'pass-night': icons.night,
  'pass-weekend': icons.calendar,
  'mem-bronze': icons.tierBase,
  'mem-silver': icons.tierMid,
  'mem-gold': icons.premium,
}

/** Per-category fallback for a product whose image is missing or fails. */
const CATEGORY_ICONS: Record<ProductCategory, LucideIcon> = {
  drinks: icons.drinks,
  coffee: icons.coffee,
  snacks: icons.snacks,
  food: icons.food,
  combo: icons.combo,
  merch: icons.merch,
  time: icons.timer,
  membership: icons.premium,
}

function iconFor(item: ShopEntry): LucideIcon {
  return ICONS[item.id] ?? CATEGORY_ICONS[item.category] ?? icons.shop
}

export function ShopView() {
  const { t, formatTime } = useT()
  const [tab, setTab] = useState<Tab>('time')
  const cart = useStore((s) => s.cart)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const count = cartCount(cart)

  /**
   * The club's day, read here and handed down (C2.11).
   *
   * Read once at the top of the section and passed to the cards rather than each
   * card calling `useClubHours()` for itself: the hook shares one SWR entry, so
   * that would work, but nine cards each deriving the same minute is nine chances
   * for one of them to disagree about it.
   *
   * Two different statements come out of it. Closed → nothing can be bought,
   * because there is nobody to bring it and no counter to collect it (a refusal).
   * Open but closing sooner than a pass is long → a note on that card only, and
   * *not* a refusal: the player may legitimately buy minutes that tick next
   * visit, which is the decision recorded in `runsPastClosing()`.
   */
  const club = useClubHours()

  const catalogue = useApi(['shop', tab], () => TAB_ENDPOINTS[tab]())
  const activeTab = TABS.find((t) => t.id === tab)!

  // Two composite widgets, same rule as the library (F6.7): the tab strip walks
  // with left/right, the product grid with all four arrows.
  const tabsRef = useRovingFocus<HTMLDivElement>({ orientation: 'horizontal' })
  const gridRef = useRovingFocus<HTMLDivElement>({ orientation: 'grid' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <IconTile icon={activeTab.icon} variant="primary" size="xl" ticks />
          <div>
            <p className="label-mono text-[10px] text-text-low">Store // 03</p>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tighter text-text-high">
              Shop
            </h2>
            <p className="text-sm text-text-low">Top up time, perks &amp; merch</p>
          </div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="glass relative flex w-fit items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-text-high transition-colors hover:border-border-strong"
        >
          <icons.cart size={16} />
          Cart
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(229,53,43,0.8)]">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* The refusal, stated once at the top of the section instead of nine times
          on nine disabled buttons — and it names when it ends, because "closed"
          without a time is the version a player has to go and ask about.
          `role="status"`: it is a condition of the screen they just opened, not
          an error they caused. */}
      {club.ready && !club.open && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/[0.08] px-4 py-3"
        >
          <icons.night size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <p className="font-display text-sm font-bold uppercase text-text-high">
              {t('shop.closedTitle')}
            </p>
            <p className="text-pretty text-xs leading-relaxed text-text-medium">
              {club.opensAt
                ? t('shop.closedBody', { time: formatTime(club.opensAt) })
                : t('shop.closedBodyNoTime')}
            </p>
          </div>
        </div>
      )}

      {/* Toggle buttons rather than ARIA tabs: the sections below are fetched
          per tab and swapped in place, so there is no persistent `tabpanel` to
          point `aria-controls` at. `aria-pressed` also gives the roving group its
          entry point — arriving here lands on the open section (F6.7). */}
      <div
        ref={tabsRef}
        role="group"
        aria-label={t('shop.title')}
        className="glass flex w-fit gap-1 rounded-md p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            // The label is `sm:inline` only, so on a narrow screen the button is
            // an icon with no accessible name unless one is spelled out.
            aria-label={t.label}
            data-roving-item
            className={cn(
              'flex items-center gap-2 rounded-[5px] px-4 py-2 text-sm font-semibold transition-all',
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-[0_0_18px_-4px_rgba(229,53,43,0.8)]'
                : 'text-text-medium hover:text-text-high',
            )}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <DataBoundary
        state={catalogue}
        loading={
          <Grid>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[152px] w-full" />
            ))}
          </Grid>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          <EmptyState
            icon={activeTab.icon}
            title={t('shop.sectionEmpty')}
            description={t('shop.sectionEmptyBody')}
          />
        }
      >
        {(items) => (
          <Grid ref={gridRef}>
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                clubClosed={club.ready && !club.open}
                minutesUntilClose={club.minutesUntilClose}
              />
            ))}
          </Grid>
        )}
      </DataBoundary>
    </div>
  )
}

/** Only the results grid is a roving group — the skeleton has nothing to focus. */
function Grid({
  children,
  ref,
}: {
  children: React.ReactNode
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

function ProductCard({
  item,
  clubClosed,
  minutesUntilClose,
}: {
  item: ShopEntry
  clubClosed: boolean
  /** `null` is "nothing closes", never "closing now" — see `lib/club-hours.ts`. */
  minutesUntilClose: number | null
}) {
  const { t } = useT()
  const addToCart = useStore((s) => s.addToCart)
  const toast = useStore((s) => s.toast)
  const isBest = item.tag === 'Best Value'
  const isPopular = item.tag === 'Popular'
  const soldOut = !item.inStock

  /**
   * How much of this pass will not fit into today (C2.11).
   *
   * `null` on anything that is not time, on a pass sold to span the club's edge
   * (a night pass), and while the pass still fits — three different reasons for
   * the same "say nothing", all of which end up as one absent line rather than a
   * card explaining itself for no reason.
   */
  const spillMinutes =
    item.time && !item.time.crossesClosing && runsPastClosing(item.time.minutes, minutesUntilClose)
      ? item.time.minutes - (minutesUntilClose ?? 0)
      : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        'relative flex flex-col gap-4 rounded-lg border p-5 transition-shadow',
        isBest
          ? 'border-primary/50 bg-primary/[0.06] shadow-[0_0_24px_-6px_rgba(229,53,43,0.4)]'
          : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      {item.tag && (
        <motion.span
          animate={isBest ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
          className={cn(
            'label-mono absolute -top-2.5 right-4 rounded-md px-2.5 py-1 text-[9px]',
            isBest || isPopular
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-2 text-text-high',
          )}
        >
          {item.tag}
        </motion.span>
      )}

      <div className="flex items-center gap-3">
        {/* Fixed 56px box whether it resolves to a photo, an icon or nothing:
            the thumbnail must not be the reason a row of cards changes height
            once the images land. */}
        <ProductImage
          src={item.image}
          alt={item.name}
          fallbackIcon={iconFor(item)}
          highlight={isBest}
          className="size-14 shrink-0"
          sizes="56px"
        />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-text-high">{item.name}</h3>
          {item.description && <p className="text-xs text-text-low">{item.description}</p>}
        </div>
      </div>

      {/* Not a warning and not a refusal: the pass is still on sale, and the
          sentence says where the spare minutes go instead of implying they are
          lost. Above the price rather than under the button so it is read before
          the decision, not after it. */}
      {spillMinutes !== null && (
        <p className="text-pretty rounded-md border border-border bg-surface-sunken px-3 py-2 text-[11px] leading-relaxed text-text-medium">
          {t('shop.closingPassNote', { n: spillMinutes })}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between">
        <span className="font-display text-2xl font-bold tabular-nums text-text-high">
          {formatEur(item.priceCents)}
          {item.category === 'membership' && (
            <span className="text-sm font-medium text-text-low">/mo</span>
          )}
        </span>
        <button
          // A closed club can neither charge for this nor bring it, so the button
          // is off rather than raising an error the player cannot act on. The
          // reason is stated once in the banner above, not repeated here.
          disabled={soldOut || clubClosed}
          onClick={() => {
            addToCart(item)
            toast('success', `${item.name} added to cart`)
          }}
          // Nine buttons all reading "Add" tell a screen-reader user nothing
          // about which product they are on.
          aria-label={`${t('shop.addToCart')}: ${item.name}`}
          // The card's single action, so it is the card's roving item (F6.7).
          data-roving-item
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-low"
        >
          {soldOut ? (
            'Sold out'
          ) : (
            <>
              <icons.add size={16} />
              Add
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
