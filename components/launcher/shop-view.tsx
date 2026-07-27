'use client'

import { motion } from 'framer-motion'
import {
  Clock,
  Coffee,
  Cookie,
  Crown,
  CupSoda,
  type LucideIcon,
  Medal,
  Moon,
  Pizza,
  Plus,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Timer,
  UtensilsCrossed,
} from 'lucide-react'
import { useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { IconTile } from '@/components/icon-tile'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useApi } from '@/hooks/use-api'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { useT } from '@/lib/i18n/provider'
import { fetchShopItems, fetchShopMemberships, fetchShopTime } from '@/lib/mock/api'
import { cartCount, useStore } from '@/lib/store'
import type { ShopItem } from '@/lib/types/catalog'
import { cn } from '@/lib/utils'

type Tab = 'time' | 'memberships' | 'items'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'time', label: 'Gaming Time', icon: Timer },
  { id: 'memberships', label: 'Memberships', icon: Crown },
  { id: 'items', label: 'Physical Items', icon: ShoppingBag },
]

/** One endpoint per tab — the shop grid never slices a single big catalogue. */
const TAB_ENDPOINTS: Record<Tab, () => Promise<ShopItem[]>> = {
  time: fetchShopTime,
  memberships: fetchShopMemberships,
  items: fetchShopItems,
}

/** Exact matches first, then the prefix rules below. */
const ICONS: Record<string, LucideIcon> = {
  'pass-night': Moon,
  'pass-weekend': Clock,
  'mem-bronze': Shield,
  'mem-silver': Medal,
  'mem-gold': Crown,
}

/**
 * Catalogue ids are namespaced by category (`drink-`, `merch-`, …), so one
 * prefix rule covers every product the club adds later without touching the UI.
 */
const ICON_PREFIXES: [prefix: string, icon: LucideIcon][] = [
  ['pass-', Timer],
  ['drink-', CupSoda],
  ['coffee-', Coffee],
  ['snack-', Cookie],
  ['food-', Pizza],
  ['combo-', UtensilsCrossed],
  ['merch-', Shirt],
]

function iconFor(id: string): LucideIcon {
  const exact = ICONS[id]
  if (exact) return exact
  return ICON_PREFIXES.find(([prefix]) => id.startsWith(prefix))?.[1] ?? ShoppingBag
}

export function ShopView() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('time')
  const cart = useStore((s) => s.cart)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const count = cartCount(cart)

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
            <p className="text-sm text-text-low">Top up time, perks & merch</p>
          </div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="glass relative flex w-fit items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-text-high transition-colors hover:border-border-strong"
        >
          <ShoppingCart size={16} />
          Cart
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(229,53,43,0.8)]">
              {count}
            </span>
          )}
        </button>
      </div>

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
              <ProductCard key={item.id} item={item} />
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

function ProductCard({ item }: { item: ShopItem }) {
  const { t } = useT()
  const addToCart = useStore((s) => s.addToCart)
  const toast = useStore((s) => s.toast)
  const Icon = iconFor(item.id)
  const isBest = item.tag === 'Best Value'
  const isPopular = item.tag === 'Popular'

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
        <IconTile icon={Icon} size="md" variant={isBest ? 'primary' : 'default'} />
        <div>
          <h3 className="font-display text-lg font-bold text-text-high">{item.name}</h3>
          {item.description && <p className="text-xs text-text-low">{item.description}</p>}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="font-display text-2xl font-bold tabular-nums text-text-high">
          ${item.price}
          {item.id.startsWith('mem-') && (
            <span className="text-sm font-medium text-text-low">/mo</span>
          )}
        </span>
        <button
          onClick={() => {
            addToCart(item)
            toast('success', `${item.name} added to cart`)
          }}
          // Nine buttons all reading "Add" tell a screen-reader user nothing
          // about which product they are on.
          aria-label={`${t('shop.addToCart')}: ${item.name}`}
          // The card's single action, so it is the card's roving item (F6.7).
          data-roving-item
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </motion.div>
  )
}
