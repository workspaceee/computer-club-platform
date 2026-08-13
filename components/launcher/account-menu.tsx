'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Avatar } from '@/components/ui/avatar'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { icons } from '@/lib/icons'
import { useT } from '@/lib/i18n/provider'
import { navFor, type LauncherSurface } from '@/lib/launcher-nav'
import { holdSeat, releaseSeat } from '@/lib/seat'
import { unreportedSeconds, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Avatar menu of the top bar (C2.1, filled out by C2.10).
 *
 * Lifted out of `top-bar.tsx` as its own piece because it is not chrome — it is
 * the only route out of a visit. Lock and log out both hand the seat back to the
 * club, and both need a confirmation, which is why the dialogs travel with the
 * menu rather than staying behind in the bar.
 */
export function AccountMenu({ surface }: { surface: LauncherSurface }) {
  const { t } = useT()
  const isGuest = surface === 'guest'

  // Sections come from the one navigation table, so the bar, this menu and the
  // mobile bar can never drift apart (F6.2).
  const menu = navFor(surface).filter((item) => item.slot === 'menu')

  const user = useStore((s) => s.user)
  const guest = useStore((s) => s.guest)
  const setView = useStore((s) => s.setView)
  const lockPc = useStore((s) => s.lockPc)
  const logout = useStore((s) => s.logout)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  // The re-entry door for the first-run walk (C3.12): the overlay itself listens
  // to this flag, so the menu only has to raise it.
  const setTourOpen = useStore((s) => s.setTourOpen)
  const toast = useStore((s) => s.toast)

  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'lock' | 'logout' | null>(null)
  // No trigger ref: the layer's `restoreFocus` hands focus back to whatever was
  // focused when the menu opened, which is the trigger by definition.
  const menuId = useId()

  // The menu shares the shell's dismissable core instead of hand-rolling
  // Escape + outside-click (F6.7). Three of the five behaviours are wrong for a
  // popover and are off: no scroll lock (it would shift the bar it hangs from)
  // and no focus trap (a non-modal menu must let Tab leave — `closeOnOutside`
  // then closes it, so focus never ends up behind an open menu). What it does
  // take is the shared layer stack, so Escape peels the menu only when the menu
  // is the topmost layer, and the digit shortcuts know the keyboard is busy.
  //
  // The panel here is the *wrapper*, trigger included, and that is deliberate:
  // if "outside" covered the trigger, a pointer-down on it would close the menu
  // and the click that follows would immediately reopen it — the button would
  // never toggle off.
  const layerRef = useDismissableLayer({
    open,
    onClose: () => setOpen(false),
    closeOnOutside: true,
    trapFocus: false,
    // Initial focus is handled below, because the first focusable element in the
    // wrapper is the trigger, not the first item of the menu.
    autoFocus: false,
    lockScroll: false,
  })
  const itemsRef = useRovingFocus<HTMLDivElement>({
    orientation: 'vertical',
    enabled: open,
  })

  // Menu-button pattern: opening moves focus onto the first item, closing hands
  // it back to the trigger (the layer's `restoreFocus` does the second half).
  // Without this the keyboard route into the only way out of a visit — lock, log
  // out — was "open the menu, then guess that Tab still works".
  useEffect(() => {
    if (!open) return
    const first = itemsRef.current?.querySelector<HTMLElement>('[data-roving-item]')
    first?.focus({ preventScroll: true })
  }, [open, itemsRef])

  // Guests have no profile, so the shell identifies them by their tab label.
  const displayName = user?.nickname ?? guest?.label ?? t('guest.badge')
  const secondaryLine = user?.email ?? (isGuest ? t('guest.limits') : null)

  return (
    <>
      {/* The trigger was a bare `<button>` wrapping two decorative spans: no
          accessible name (a screen reader announced "button"), and no
          `aria-expanded`, so nothing told a non-visual user the menu had opened.
          It is also the only route to lock/log out, which makes it the worst
          control in the frame to leave unlabelled. */}
      <div ref={layerRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          // The level joins the name when there is one (C2.4). It has to arrive
          // this way or not at all: the chip below is a badge, and a badge is
          // decoration by definition — a screen reader would never read it.
          aria-label={
            user
              ? t('nav.accountMenuLevel', { name: displayName, level: user.level })
              : t('nav.accountMenu', { name: displayName })
          }
          // `pr-1 sm:pr-2`: below `sm` both things that used to sit right of the
          // avatar — the level chip and the caret — are gone, and the trailing
          // padding they were separating from the edge would just be dead width
          // on the one control the narrow bar must not lose (C2.9).
          className="flex items-center gap-2 rounded-md border border-border pill p-1 sm:pr-2 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          {/* `Avatar` instead of a hand-rolled initials tile: it derives the
              initials the same way everywhere (`initialsOf`, so "Alexei Petrov"
              is AP and not AL) and the ring encodes the loyalty tier the player
              sees in their profile. Hidden from the tree because the button
              above already carries the name. */}
          <Avatar aria-hidden name={displayName} size="xs" level={user?.level} square />
          {/* The printed level (C2.4). Not a `HudPlate`: a plate is a reading that
              moves — the clock every second, the balance whenever money does —
              and a number that changes a few times a season would only crowd the
              two that matter. It sits on the avatar it belongs to, and it is the
              first thing the bar drops on a narrow screen, because the ring
              around the avatar already encodes the tier. */}
          {user && (
            <span
              aria-hidden
              className="label-mono hidden text-[9px] text-text-medium sm:inline"
            >
              {`LVL ${user.level}`}
            </span>
          )}
          {/* The caret goes below `sm` (C2.9). It is an affordance hint on a
              control that is already a 38 px avatar tile, and `aria-expanded`
              above is what actually says "this opens" — so on a phone the 15 px
              buys nothing and the trigger has to be the one thing in the row
              that never gets pushed off. */}
          <icons.expand
            size={15}
            aria-hidden
            className={cn(
              'hidden text-text-medium transition-transform sm:block',
              open && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={itemsRef}
              id={menuId}
              role="menu"
              aria-label={t('nav.accountMenu', { name: displayName })}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              // `max-w-[calc(100vw-1.5rem)]` is the bar's own `px-3` doubled: the
              // panel hangs off the right edge of a trigger that is already at the
              // right edge of a phone, so without the clamp a longer nickname or a
              // wider locale would push it past the viewport and take "log out"
              // with it (C2.9).
              className="glass-strong absolute right-0 top-12 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg p-1.5"
            >
              <div className="mb-1 flex items-center gap-3 border-b border-border px-3 py-3">
                <Avatar aria-hidden name={displayName} size="sm" level={user?.level} square />
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-text-high">
                    {displayName}
                  </p>
                  {secondaryLine && (
                    <p className="text-xs leading-snug text-text-low">{secondaryLine}</p>
                  )}
                </div>
              </div>
              {menu.map(({ id, icon: Icon, labelKey }) => (
                <MenuItem
                  key={id}
                  icon={<Icon size={16} />}
                  label={t(labelKey)}
                  onClick={() => {
                    setView(id)
                    setOpen(false)
                  }}
                />
              ))}
              <MenuItem
                icon={<icons.settings size={16} />}
                label={t('common.settings')}
                onClick={() => {
                  setSettingsOpen(true)
                  setOpen(false)
                }}
              />
              {/* The first-run walk, on demand (C3.12).
                  Its home is "Help → How this works", and the Help *section* is
                  C11 — a `PendingView` today. So the door lives beside Settings
                  for now, which is the right neighbour anyway: both are things
                  the player asks the shell for rather than sections of the club.
                  Members only, because the walk's dismissal is written to an
                  account and a guest has none — the same asymmetry that keeps the
                  wallet off this surface.
                  DEBT for C11: move this item into the Help section's list and
                  keep the menu entry only if the section is more than one press
                  away. */}
              {user && (
                <MenuItem
                  // `info`, not `support`: the row above it is the Help *section*
                  // and already wears the support glyph — two identical icons in
                  // one list read as one item rendered twice.
                  icon={<icons.info size={16} />}
                  label={t('help.tourTitle')}
                  onClick={() => {
                    setTourOpen(true)
                    setOpen(false)
                  }}
                />
              )}
              <MenuItem
                icon={<icons.lock size={16} />}
                label={t('session.lockStation')}
                onClick={() => {
                  setConfirm('lock')
                  setOpen(false)
                }}
              />
              <MenuItem
                icon={<icons.signOut size={16} />}
                label={isGuest ? t('guest.endSession') : t('common.logout')}
                danger
                onClick={() => {
                  setConfirm('logout')
                  setOpen(false)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={confirm === 'lock'}
        title={t('session.lockConfirmTitle')}
        message={t('session.lockConfirmBody')}
        confirmLabel={t('session.lockStation')}
        danger
        onConfirm={() => {
          setConfirm(null)
          toast('info', t('session.lockedToast'))
          // The seat keeps the visit, so the *server* has to know it is paused:
          // that is what makes the next arrival's holder read say "paused" and
          // stops a second session being opened on top of this one (C1.7). Not
          // awaited — locking the station is instant by promise, and the store
          // transition below is what the player is waiting to see.
          //
          // The elapsed time goes with it, because the paused screen states the
          // remainder as the club's number (C1.10) and a row that was opened two
          // hours ago and never heard from still believes nothing was used.
          //
          // What travels is the span the server has *not* been told about, read
          // straight off the clock's anchors — never a total computed here. The
          // difference is not academic: this used to send
          // `SESSION_LENGTH - seconds`, which on a visit the seat *adopted* (the
          // C1.10 path — a member walking back into their own paused row) is time
          // the server already counted, so locking the station billed it twice and
          // a card that should have promised 01:23 promised 00:47.
          void holdSeat(unreportedSeconds(useStore.getState()))
          lockPc()
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'logout'}
        title={isGuest ? t('guest.endConfirmTitle') : t('session.logoutConfirmTitle')}
        message={isGuest ? t('guest.endConfirmBody') : t('session.logoutConfirmBody')}
        confirmLabel={isGuest ? t('guest.endSession') : t('common.logout')}
        danger
        onConfirm={() => {
          setConfirm(null)
          // Hand the chair back before the store forgets whose it was: the seat
          // is what the next player at this keyboard is checked against (C1.7),
          // and a visit that ended only in the client would leave the station
          // reading "occupied" until an admin cleared it by hand.
          void releaseSeat()
          logout()
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      // `role="menuitem"` matches the `role="menu"` container, and the icon is
      // hidden from the tree so the item announces its label once rather than
      // "graphic, Lock, Lock station".
      role="menuitem"
      // A menu is a composite widget: up/down move between items and the group
      // holds a single tab stop (F6.7).
      data-roving-item
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
        danger ? 'text-danger' : 'text-text-high',
      )}
    >
      <span aria-hidden className="flex shrink-0 items-center">
        {icon}
      </span>
      {label}
    </button>
  )
}
