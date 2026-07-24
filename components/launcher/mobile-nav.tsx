'use client'

import { motion } from 'framer-motion'
import { Gamepad2, Home, ShoppingBag, User } from 'lucide-react'
import { useStore, type LauncherView } from '@/lib/store'
import { cn } from '@/lib/utils'

const ITEMS: { id: LauncherView; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:hidden">
      <div className="glass-strong mx-auto flex max-w-sm items-center justify-around rounded-lg p-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-label={label}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 rounded-md py-2.5 text-[10px] font-semibold transition-colors',
                active ? 'text-primary' : 'text-text-low',
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-md border border-primary/35 bg-primary/12"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-5 w-5" strokeWidth={2} />
              <span className="label-mono relative text-[8px]">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
