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
 * bottom-left, clear of both the mobile bar and the right-hand action column.
 * See `components/toaster.tsx`.
 */

import { GuestNotice } from '@/components/launcher/guest-notice'
import { InGameStrip } from '@/components/launcher/in-game-strip'
import { MobileNav } from '@/components/launcher/mobile-nav'
import { TopBar } from '@/components/launcher/top-bar'
import { CartDrawer } from '@/components/launcher/cart-drawer'
import { GameLaunchModal } from '@/components/launcher/game-launch-modal'
import { SettingsModal } from '@/components/launcher/settings-modal'
import { SessionManager } from '@/components/session-manager'
import { SfxArmBridge } from '@/components/sfx-arm-bridge'
import { SfxGameBridge } from '@/components/sfx-game-bridge'
import { SfxSettingsBridge } from '@/components/sfx-settings-bridge'
import { Toaster } from '@/components/toaster'
import { useSfxPreload } from '@/hooks/use-sfx'
import { useT } from '@/lib/i18n/provider'
import type { LauncherSurface } from '@/lib/launcher-nav'

export function AppShell({
  surface = 'launcher',
  children,
}: {
  surface?: LauncherSurface
  children: React.ReactNode
}) {
  const { t } = useT()

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      {/* Background plate. `-z-10` keeps it below the frame without entering the
          overlay ladder — it is scenery, not a layer. */}
      <div className="hairline-grid pointer-events-none fixed inset-0 -z-10 opacity-60" />

      {/* The keyboard's way past the chrome (F6.7). Roving focus already cut the
          bar to three stops, but the last of those — the avatar menu — is also
          the only thing between the page and the content, and on the library the
          content is where a player actually wants to be. `sr-only` until focused,
          then it becomes a real button pinned above the bar; `focus:not-sr-only`
          alone would leave it 1px, hence the explicit position. It sits above
          `overlayZ.frame` because the sticky bar would otherwise cover it. */}
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:outline-none focus:ring-2 focus:ring-text-high"
      >
        {t('nav.skipToContent')}
      </a>

      <TopBar surface={surface} />

      {/* The one line that explains a guest's missing sections (F6.2). */}
      {surface === 'guest' && <GuestNotice />}

      {/* The one line that explains a quiet launcher (F8.4). In the frame rather
          than in a section, because the silence outlives any section change —
          and directly under the bar, next to the session clock, because the
          clock is the exception it promises still gets through. Renders nothing
          unless a title holds the machine. */}
      <InGameStrip />

      {/* `pb-24` on narrow screens is the mobile bar's reserved space: the bar is
          fixed, so without it the last card would sit underneath the navigation. */}
      <main
        id="main-content"
        // The skip link's target has to be focusable itself, or the jump moves
        // the scroll position and leaves focus in the bar — the next Tab would
        // go back to the avatar menu instead of into the section.
        tabIndex={-1}
        aria-label={t('nav.mainLandmark')}
        className="flex-1 pb-24 outline-none sm:pb-10"
      >
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
 *
 * `useSfxPreload()` is here for the same reason (F8.2): the sound set is decoded
 * once per station, during idle time, so the first cue is instant instead of
 * arriving after its own fetch. It renders nothing and never blocks boot.
 *
 * `SfxArmBridge` (F8.5) is here because the gesture that grants a browser's
 * permission to make a sound can be *any* first touch of the station — a key on
 * the lock screen, a click on a cover — and a listener living on one screen would
 * miss the ones that happen on the others. It is mounted above both screens for
 * the same reason the toast host is.
 *
 * `SfxSettingsBridge` (F8.3) is mounted here rather than inside the settings
 * modal for the same reason: the modal is unmounted most of the time, and a mute
 * switch that only applies while its own panel is open is not a setting.
 *
 * `SfxGameBridge` (F8.4) likewise: the in-game silence has to hold on every
 * surface and across every section change, and the launch dialog — the thing
 * that starts a game — closes the instant the game comes up, so a wire living
 * inside it would be unmounted for the entire span it is meant to cover.
 */
export function GlobalOverlays() {
  useSfxPreload()

  return (
    <>
      <SfxArmBridge />
      <SfxSettingsBridge />
      <SfxGameBridge />
      <GameLaunchModal />
      <CartDrawer />
      <SettingsModal />
      <SessionManager />
      <Toaster />
    </>
  )
}
