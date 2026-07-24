'use client'

import { motion } from 'framer-motion'
import {
  Clock,
  Coffee,
  Cookie,
  Crown,
  Medal,
  Moon,
  Plus,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Timer,
} from 'lucide-react'
import { useState } from 'react'
import { SHOP_ITEMS, SHOP_MEMBERSHIPS, SHOP_TIME } from '@/lib/mock/data'
import { cartCount, useStore } from '@/lib/store'
import type { ShopItem } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tab = 'time' | 'memberships' | 'items'

const TABS: { id: Tab; label: string }[] = [
  { id: 'time', label: 'Gaming Time' },
  { id: 'memberships', label: 'Memberships' },
  { id: 'items', label: 'Physical Items' },
]

const ICONS: Record<string, React.ElementType> = {
  'time-1h': Clock,
  'time-3h': Clock,
  'time-5h': Timer,
  'time-night': Moon,
  'mem-bronze': Shield,
  'mem-silver': Medal,
  'mem-gold': Crown,
  'item-energy': Coffee,
  'item-snack': Cookie,
  'item-tshirt': Shirt,
  'item-mousepad': ShoppingBag,
  'item-cap': ShoppingBag,
}

export function ShopView() {
  const [tab, setTab] = useState<Tab>('time')
  const cart = useStore((s) => s.cart)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const count = cartCount(cart)

  const list =
    tab === 'time' ? SHOP_TIME : tab === 'memberships' ? SHOP_MEMBERSHIPS : SHOP_ITEMS

  const tabIcon: Record<Tab, Parameters<typeof Icon3D>[0]['name']> = {
    time: 'timer',
    memberships: 'crown',
    items: 'bag',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Icon3D name={tabIcon[tab]} size={56} float />
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-text-high">
              Shop
            </h2>
            <p className="text-sm text-text-low">Top up time, perks & merch</p>
          </div>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="glass relative flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-text-high transition-colors hover:border-border-strong"
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

      <div className="glass flex w-fit gap-1 rounded-full p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-semibold transition-all',
              tab === t.id
                ? 'bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-[0_0_18px_-2px_rgba(229,53,43,0.7)]'
                : 'text-text-medium hover:text-text-high',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function ProductCard({ item }: { item: ShopItem }) {
  const addToCart = useStore((s) => s.addToCart)
  const toast = useStore((s) => s.toast)
  const Icon = ICONS[item.id] ?? ShoppingBag
  const isBest = item.tag === 'Best Value'
  const isPopular = item.tag === 'Popular'

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl border p-5 transition-shadow',
        isBest
          ? 'border-primary/50 bg-primary/[0.07] shadow-[0_0_24px_rgba(229,53,43,0.2)]'
          : 'border-border bg-surface hover:shadow-[0_0_18px_rgba(255,255,255,0.05)]',
      )}
    >
      {item.tag && (
        <motion.span
          animate={isBest ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
          className={cn(
            'absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
            isBest || isPopular
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-2 text-text-high',
          )}
        >
          {item.tag}
        </motion.span>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            isBest ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-primary',
          )}
        >
          <Icon size={20} />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-text-high">{item.name}</h3>
          {item.description && <p className="text-xs text-text-low">{item.description}</p>}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="font-display text-2xl font-black text-text-high">
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
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </motion.div>
  )
}
