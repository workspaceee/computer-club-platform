"use client"

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
    <nav className="sticky bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/90 px-2 py-1.5 backdrop-blur-xl sm:hidden">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          aria-label={label}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors",
            view === id ? "text-primary" : "text-text-low",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  )
}
