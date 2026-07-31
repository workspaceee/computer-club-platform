'use client'

import { AccountMenu } from '@/components/launcher/account-menu'
import { CartButton, HelpButton } from '@/components/launcher/bar-actions'
import { NotificationBell } from '@/components/launcher/notification-bell'
import { SessionHud } from '@/components/launcher/session-hud'
import { WalletHud } from '@/components/launcher/wallet-hud'
import { ImbaLogo } from '@/components/imba-logo'
import { NavRail } from '@/components/ui/nav-rail'
import { useT } from '@/lib/i18n/provider'
import { navFor, type LauncherSurface, type LauncherView } from '@/lib/launcher-nav'
import { overlayZ } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Launcher top bar (C2.1).
 *
 * Three pieces and nothing else: the mark, the navigation rail, the status
 * block. Everything that used to be written out longhand here — the sliding
 * underline, the two reading plates, the avatar menu and its confirmations — now
 * lives in a primitive or in its own component, because this file had become the
 * place where the design system was quietly re-typed: its own threshold
 * constants next to `Countdown`'s, its own initials tile next to `Avatar`'s, its
 * own `layoutId` rail next to the mobile bar's.
 *
 * What stays here is composition: the surface, the landmark, and the depth rung.
 */
export function TopBar({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t } = useT()

  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)

  // Sections come from the one navigation table, so the bar, the avatar menu and
  // the mobile bar can never drift apart (F6.2).
  const primary = navFor(surface)
    .filter((item) => item.slot === 'primary')
    .map(({ id, index, labelKey, icon }) => ({ id, index, label: t(labelKey), icon }))

  return (
    // `frame` is the lowest fixed rung on purpose: the bar owns the top-right
    // corner (clock, wallet, avatar) but yields the depth axis to every overlay,
    // including the outage banner that explains a frozen seat (F6.4).
    <header
      className={cn(
        'glass sticky top-0 flex h-16 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4 md:px-6 xl:px-8',
        overlayZ.frame,
      )}
    >
      {/* `min-w-0` and the narrower gap below `xl` are the two halves of one rule
          found by the C2.4 check: at 1216 px — the width of the kiosk this thing
          runs on — the row measured 1376 px, so the page grew a horizontal
          scrollbar and the *avatar menu* sat off the right edge. That is not a
          cosmetic overflow: the menu is the only route out of a visit (lock, log
          out), and it was unreachable without scrolling a bar that is supposed to
          be fixed chrome. The left group is the half that yields, because the
          right one is all readings and doors. */}
      <div className="flex min-w-0 items-center gap-4 xl:gap-8">
        <button
          onClick={() => setView('home')}
          aria-label="IMBA home"
          className="transition-transform hover:scale-[1.03]"
        >
          <ImbaLogo size="sm" />
        </button>
        <NavRail<LauncherView>
          items={primary}
          value={view}
          onChange={setView}
          variant="underline"
          label={t('nav.landmark')}
          className="hidden sm:flex"
        />
      </div>

      {/* The right-hand block, in the order the readings are needed (C2.4):
          what is left of the visit, what there is to spend it with, then the
          three doors — inbox, basket, help — and the identity that owns them.
          Readings before actions, because a player checks the clock and the
          balance far more often than they press anything up here. */}
      <div className="flex shrink-0 items-center gap-2">
        <SessionHud />
        <WalletHud surface={surface} />
        <NotificationBell />
        <CartButton />
        <HelpButton />
        <AccountMenu surface={surface} />
      </div>
    </header>
  )
}
