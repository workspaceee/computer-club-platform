'use client'

/**
 * The frame of the product (F6.4).
 *
 * Two exports, and the split is the whole point:
 *
 *   `AppShell`        the chrome that belongs to a *signed-in surface* —
 *                     ambient background, top bar, guest strip, the content
 *                     column, the mobile bar. It knows nothing about sections;
 *                     the caller passes them as children.
 *
 *   `GlobalOverlays`  everything that must outlive a screen change: dialogs,
 *                     drawers, the toast queue, the end-of-visit takeover.
 *
 * Before this split the launcher mounted its own dialogs, which meant they were
 * children of the launcher's `AnimatePresence`. A screen change unmounted them
 * mid-animation, and the lock screen simply had no overlay host at all — a toast
 * raised by a failed sign-in had nowhere to render. Mounting overlays once,
 * above the screens, is what makes them global rather than per-screen.
 *
 * Screen-space ownership is also settled here, because two features had quietly
 * claimed the same corner: the toast column and the wallet chip both lived
 * top-right, so a toast covered the balance it was announcing. The rule now is
 * one owner per edge — **top-right is the top bar's** (clock, wallet/tab,
 * avatar), the top strip is the outage banner's, and transient feedback lives
 * bottom-right, clear of the mobile bar. See `components/toaster.tsx`.
 */

import { GuestNotice } from '@/components/launcher/guest-notice'
import { MobileNav } from '@/components/launcher/mobile-nav'
import { TopBar } from '@/components/launcher/top-bar'
import { CartDrawer } from '@/components/launcher/cart-drawer'
import { GameLaunchModal } from '@/components/launcher/game-launch-modal'
import { SettingsModal } from '@/components/launcher/settings-modal'
import { SessionManager } from '@/components/session-manager'
import { Toaster } from '@/components/toaster'
import type { LauncherSurface } from '@/lib/launcher-nav'

export function AppShell({
  surface = 'launcher',
  children,
}: {
  surface?: LauncherSurface
  children: React.ReactNode
}) {
  return (
    <div className="app-ambient flex min-h-svh flex-col">
      {/* Background plate. `-z-10` keeps it below the frame without entering the
          overlay ladder — it is scenery, not a layer. */}
      <div className="hairline-grid pointer-events-none fixed inset-0 -z-10 opacity-60" />

      <TopBar surface={surface} />

      {/* The one line that explains a guest's missing sections (F6.2). */}
      {surface === 'guest' && <GuestNotice />}

      {/* `pb-24` on narrow screens is the mobile bar's reserved space: the bar is
          fixed, so without it the last card would sit underneath the navigation. */}
      <main className="flex-1 pb-24 sm:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      <MobileNav surface={surface} />
    </div>
  )
}

/**
 * Mounted once, next to the screens — never inside one.
 *
 * `SessionManager` is here rather than in the launcher because it carries the
 * single clock of the product (F6.3): mounting it per screen would restart the
 * interval on every surface change, and mounting it inside the launcher would
 * stop the end-of-visit takeover from being able to cover the launcher itself.
 */
export function GlobalOverlays() {
  return (
    <>
      <GameLaunchModal />
      <CartDrawer />
      <SettingsModal />
      <SessionManager />
      <Toaster />
    </>
  )
}
