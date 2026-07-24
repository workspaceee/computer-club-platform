"use client"

import { motion } from "framer-motion"
import { Home, Gamepad2, ShoppingBag, User } from "lucide-react"
import { useStore, type LauncherView } from "@/lib/store"
import { cn } from "@/lib/utils"

const ITEMS: { id: LauncherView; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "profile", label: "Profile", icon: User },
]

export function MobileNav() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:hidden">
      <div className="glass-strong mx-auto flex max-w-sm items-center justify-around rounded-2xl px-2 py-1.5">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-label={label}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-colors",
                active ? "text-primary-foreground" : "text-text-low",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary to-primary-hover shadow-[0_0_18px_-2px_rgba(229,53,43,0.7)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-5 w-5" />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
