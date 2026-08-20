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

import { AnimatePresence } from 'framer-motion'
import { GuestNotice } from '@/components/launcher/guest-notice'
import { InGameStrip } from '@/components/launcher/in-game-strip'
import { MobileNav } from '@/components/launcher/mobile-nav'
import { TopBar } from '@/components/launcher/top-bar'
import { CartDrawer } from '@/components/launcher/cart-drawer'
import { FirstRunTour } from '@/components/launcher/first-run-tour'
import { GameDetailPanel } from '@/components/launcher/game-detail-panel'
import { GameLaunchModal } from '@/components/launcher/game-launch-modal'
import { SessionDetailModal } from '@/components/launcher/session-detail-modal'
import { SettingsModal } from '@/components/launcher/settings-modal'
import { TimeWarnings } from '@/components/launcher/time-warnings'
import { ClubClosing } from '@/components/launcher/club-closing'
import { SessionPauseOverlay } from '@/components/launcher/session-pause-overlay'
import { SessionMovedOverlay } from '@/components/launcher/session-moved-overlay'
import { DuplicateWindowScreen } from '@/components/duplicate-window-screen'
import { SessionManager } from '@/components/session-manager'
import { SfxArmBridge } from '@/components/sfx-arm-bridge'
import { SfxGameBridge } from '@/components/sfx-game-bridge'
import { SfxSettingsBridge } from '@/components/sfx-settings-bridge'
import { Toaster } from '@/components/toaster'
import { useReducedMotionAttribute } from '@/hooks/use-reduced-motion'
import { useSfxPreload } from '@/hooks/use-sfx'
import { useSingleWindow } from '@/hooks/use-single-window'
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

      {/* The 6rem rung on narrow screens is the mobile bar's reserved space: the
          bar is fixed, so without it the last card would sit underneath the
          navigation. It carries the device's bottom inset for the same reason the
          bar does (C2.9) — the bar grew by that much, so the space held for it
          has to as well, or the last row hides behind it on a notched phone. */}
      <main
        id="main-content"
        // The skip link's target has to be focusable itself, or the jump moves
        // the scroll position and leaves focus in the bar — the next Tab would
        // go back to the avatar menu instead of into the section.
        tabIndex={-1}
        aria-label={t('nav.mainLandmark')}
        className="flex-1 pb-[calc(6rem+var(--frame-inset-bottom))] outline-none sm:pb-10"
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
  /**
   * `<html data-reduce-motion>` (§4.5).
   *
   * `globals.css` damps the pure-CSS loops — the marquee, the wake hint, the
   * caret, the neon ring's travelling angle — off this attribute, and nothing
   * was setting it: the launcher's "Reduce animations" switch reached only the
   * components that call the hook in JS, so a player who turned it on still got
   * a scrolling crawl and a breathing pill. It belongs here for the same reason
   * the toast host does — it has to hold on both screens and survive every
   * screen change — and it writes to the document, so it renders nothing.
   */
  useReducedMotionAttribute()

  /**
   * One launcher per PC (C1.12).
   *
   * Read here rather than in `AppShell` for the same reason the toast host lives
   * here: `AppShell` is the chrome of a *signed-in* surface, so a guard mounted
   * inside it would leave the lock screen — the one screen where a stray window
   * can claim a seat — unguarded, and would remount on every surface change,
   * dropping and re-queueing the lock each time. `false` until the browser
   * answers, so the panel never blinks on boot.
   */
  const duplicate = useSingleWindow()

  return (
    <>
      {/* Before everything else, and it renders nothing in the window that holds
          the lock. In the one that does not, it covers the whole product. */}
      <AnimatePresence>{duplicate && <DuplicateWindowScreen key="duplicate" />}</AnimatePresence>
      <SfxArmBridge />
      <SfxSettingsBridge />
      <SfxGameBridge />
      {/* One title, read about before it is started (C4.5). Mounted with the
          other global overlays and reading its own id from the UI slice, so every
          surface that shows a tile — the library, "Continue", the hero — opens the
          same panel by setting one field. It sits *before* the launch dialog in
          source order on purpose: both are on the `modal` rung, and the dialog the
          panel raises has to land on top of it. */}
      <GameDetailPanel />
      <GameLaunchModal />
      <CartDrawer />
      {/* "My session" (C2.3). Mounted with the other global overlays rather than
          in the top bar, because the HUD plate that opens it lives in chrome that
          re-renders every second — a panel parented to it would remount its own
          fetch on each tick. Reads its own `open` flag from the UI slice, so the
          trigger only has to flip one boolean. */}
      <SessionDetailModal />
      <SettingsModal />
      <SessionManager />
      {/* Running out of time, announced (C2.6). Next to `SessionManager` because
          it watches the same single clock and, like the expiry takeover, has to
          be able to cover the launcher rather than live inside it — a watcher
          mounted per screen would remount on every section change and re-arm
          marks the visit has already been told about. Renders nothing until a
          prepaid remainder crosses one. */}
      <TimeWarnings />
      {/* The club's day ending (C2.11). Next to the session watcher because it is
          the same kind of thing about a different clock — and mounted globally for
          the same two reasons: the marks must fire once per visit rather than once
          per section change, and the "Club closed" overlay has to be able to cover
          the launcher instead of living inside it. It stops no clock: closing ends
          selling, never a session. */}
      <ClubClosing />
      {/* Paused by an admin (C2.7). Mounted here, above the launcher rather than
          inside it, for the reason that makes the feature work at all: the shell
          stays put, so a pause is a scrim over a live launcher instead of a
          navigation, and lifting it hands back the exact screen — open cart,
          typed search, scroll position — the player was on. */}
      <SessionPauseOverlay />
      {/* Re-seated by an admin (C2.8). Below the pause overlay in the tree and
          below it in the stacking order too (`modal` under `blocking`), which is
          the right way round: a paused seat cannot be walked away from until the
          club unfreezes it, so the pause has to stay on top when both arrive.
          Mounted globally for the same reason as the rest of this list — the
          frame can land while the player is anywhere in the launcher, and a
          watcher mounted per screen would miss it on every section change. */}
      <SessionMovedOverlay />
      {/* The first-run walk (C3.12). Global for a reason the others share and one
          of its own: it dims the *chrome* — the session plate, the navigation rail,
          the basket — so a tour mounted inside a section could not point at four
          of its five steps. It renders nothing until the account says it has never
          been offered, and nothing at all for a guest. */}
      <FirstRunTour />
      <Toaster />
    </>
  )
}
