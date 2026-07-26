'use client'

import { UserRound } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import { useStore } from '@/lib/store'

/**
 * The one-line difference a walk-in guest sees in the shell (F6.2).
 *
 * The guest surface is the same launcher, so this strip is what explains the
 * missing sections: what a guest gets, what a profile unlocks, and a direct way
 * to convert. Members never render it.
 */
export function GuestNotice() {
  const { t } = useT()
  const guest = useStore((s) => s.guest)
  // Converting ends the guest session and returns to the lock screen, where the
  // register form is one tap away. The tab is settled at the bar either way.
  const logout = useStore((s) => s.logout)

  return (
    <div className="border-b border-border bg-white/[0.02]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-8">
        <span className="label-mono flex items-center gap-1.5 rounded-sm border border-border-strong px-2 py-1 text-[9px] text-text-medium">
          <UserRound size={11} />
          {guest?.label ?? t('guest.badge')}
        </span>
        <p className="min-w-0 flex-1 text-pretty text-xs leading-relaxed text-text-low">
          {t('nav.guestLimited')}
        </p>
        <button
          onClick={logout}
          className="rounded-sm px-1 text-xs font-semibold text-primary transition-colors hover:text-text-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          {t('guest.createAccount')}
        </button>
      </div>
    </div>
  )
}
