'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect, useId, useState } from 'react'
import { ImbaLogo } from '@/components/imba-logo'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useRovingFocus } from '@/hooks/use-roving-focus'
import { formatCoins, formatEur, sumCents } from '@/lib/money'
import { formatDuration } from '@/lib/time'
import { cartTotalCents, timeChargeCents, useStore } from '@/lib/store'
import { useT } from '@/lib/i18n/provider'
import { navFor, type LauncherSurface } from '@/lib/launcher-nav'
import { overlayZ } from '@/lib/overlay'
import { cn } from '@/lib/utils'

export function TopBar({ surface = 'launcher' }: { surface?: LauncherSurface }) {
  const { t } = useT()
  // Sections come from the one navigation table, so the bar, the avatar menu
  // and the mobile bar can never drift apart (F6.2).
  const nav = navFor(surface)
  const primary = nav.filter((item) => item.slot === 'primary')
  const menu = nav.filter((item) => item.slot === 'menu')

  const isGuest = surface === 'guest'

  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const seconds = useStore((s) => s.sessionSeconds)
  const coins = useStore((s) => s.coins)
  const user = useStore((s) => s.user)
  const guest = useStore((s) => s.guest)
  const cart = useStore((s) => s.cart)
  // What the guest owes so far: the bar order **plus** the time on the seat. On a
  // postpaid seat `seconds` is time *used*, and the counter bills it by the
  // minute, so leaving it out would show a tab that quietly understates the bill
  // (F6.3). Both terms are cents, so this is a plain sum — the basket no longer
  // has to be converted back from floats first (F7.2).
  const tabTotal = sumCents(cartTotalCents(cart), timeChargeCents(seconds))
  const lockPc = useStore((s) => s.lockPc)
  const logout = useStore((s) => s.logout)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const toast = useStore((s) => s.toast)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'lock' | 'logout' | null>(null)
  // No trigger ref: the layer's `restoreFocus` hands focus back to whatever was
  // focused when the menu opened, which is the trigger by definition.
  const menuId = useId()

  // The bar is a composite widget: one tab stop, arrows walk the sections, and
  // entering it lands on the section that is open because `aria-current` marks
  // the stop (F6.7).
  const navRef = useRovingFocus<HTMLElement>({ orientation: 'horizontal' })

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
  const menuRef = useDismissableLayer({
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    closeOnOutside: true,
    trapFocus: false,
    // Initial focus is handled below, because the first focusable element in the
    // wrapper is the trigger, not the first item of the menu.
    autoFocus: false,
    lockScroll: false,
  })
  const menuItemsRef = useRovingFocus<HTMLDivElement>({
    orientation: 'vertical',
    enabled: menuOpen,
  })

  // Menu-button pattern: opening moves focus onto the first item, closing hands
  // it back to the trigger (the layer's `restoreFocus` does the second half).
  // Without this the keyboard route into the only way out of a visit — lock, log
  // out — was "open the menu, then guess that Tab still works".
  useEffect(() => {
    if (!menuOpen) return
    const first = menuItemsRef.current?.querySelector<HTMLElement>('[data-roving-item]')
    first?.focus({ preventScroll: true })
  }, [menuOpen, menuItemsRef])

  // Thresholds only mean something when time can run out. A postpaid guest's
  // clock counts *up* into the tab, so painting it red at "5 minutes" would warn
  // them about the opposite of what is happening (F6.3).
  const low = !isGuest && seconds <= 15 * 60
  const critical = !isGuest && seconds <= 5 * 60
  const timerColor = critical ? 'var(--danger)' : low ? 'var(--warning)' : 'var(--text-high)'

  // Guests have no profile, so the shell identifies them by their tab label.
  const displayName = user?.nickname ?? guest?.label ?? t('guest.badge')
  const secondaryLine = user?.email ?? (isGuest ? t('guest.limits') : null)
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    // `frame` is the lowest fixed rung on purpose: the bar owns the top-right
    // corner (clock, wallet, avatar) but yields the depth axis to every overlay,
    // including the outage banner that explains a frozen seat (F6.4).
    <header
      className={cn(
        'glass sticky top-0 flex h-16 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4 md:px-8',
        overlayZ.frame,
      )}
    >
      <div className="flex items-center gap-8">
        <button
          onClick={() => setView('home')}
          aria-label="IMBA home"
          className="transition-transform hover:scale-[1.03]"
        >
          <ImbaLogo size="sm" />
        </button>
        <nav
          ref={navRef}
          className="hidden items-center gap-1 sm:flex"
          aria-label={t('nav.landmark')}
        >
          {primary.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                // The number printed in this button is a real shortcut
                // (`use-nav-shortcuts`), so it is announced as one.
                aria-keyshortcuts={item.index.replace(/^0/, '')}
                data-roving-item
                className={cn(
                  'group relative flex items-center gap-2 rounded-sm px-3.5 py-2 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  active ? 'text-text-high' : 'text-text-low hover:text-text-medium',
                )}
              >
                <span className="label-mono text-[9px] text-primary/70 tabular-nums">
                  {item.index}
                </span>
                <span className="font-display text-sm font-semibold tracking-tight">
                  {t(item.labelKey)}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-[21px] h-[2px] bg-primary shadow-[0_0_10px_rgba(229,53,43,0.9)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Session timer */}
        <motion.div
          animate={critical ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: critical ? Infinity : 0 }}
          className="flex items-center gap-2.5 rounded-md border bg-black/30 px-3 py-1.5"
          style={{ borderColor: low ? timerColor : 'var(--border)' }}
        >
          <icons.timer size={14} style={{ color: timerColor }} />
          <div className="flex flex-col leading-none">
            {/* The label has to say which way the number moves: a guest reading
                "TIME LEFT" next to a rising clock would be told a lie. */}
            <span className="label-mono hidden text-[8px] text-text-low sm:block">
              {isGuest ? t('session.sessionTime') : t('session.timeLeft')}
            </span>
            <span
              className="font-display text-sm font-bold tabular-nums leading-tight"
              style={{ color: timerColor }}
            >
              {formatDuration(seconds)}
            </span>
          </div>
        </motion.div>

        {/* Coins for members, the open tab for guests — a guest never earns
            coins, so showing a zero balance would be a lie (F6.2). */}
        {isGuest ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-1.5">
            <icons.bill size={14} className="text-text-medium" />
            <div className="flex flex-col leading-none">
              <span className="label-mono hidden text-[8px] text-text-low sm:block">
                {t('guest.tab')}
              </span>
              <span className="font-display text-sm font-bold tabular-nums leading-tight text-text-high">
                {formatEur(tabTotal)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-warning/25 bg-warning/[0.07] px-3 py-1.5">
            <icons.coins size={14} className="text-warning" />
            <div className="flex flex-col leading-none">
              <span className="label-mono hidden text-[8px] text-warning/70 sm:block">
                {t('wallet.coinBalance')}
              </span>
              <span className="font-display text-sm font-bold tabular-nums leading-tight text-text-high">
                {formatCoins(coins)}
              </span>
            </div>
          </div>
        )}

        {/* Avatar menu. The trigger was a bare `<button>` wrapping two decorative
            spans: no accessible name (a screen reader announced "button"), and no
            `aria-expanded`, so nothing told a non-visual user the menu had opened.
            It is also the only route to lock/log out, which makes it the worst
            control in the frame to leave unlabelled. */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={t('nav.accountMenu', { name: displayName })}
            className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] py-1 pl-1 pr-2 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-primary font-display text-xs font-bold text-primary-foreground shadow-[0_0_14px_-3px_rgba(229,53,43,0.8)]"
            >
              {initials}
            </span>
            <icons.expand
              size={15}
              aria-hidden
              className={cn('text-text-medium transition-transform', menuOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                ref={menuItemsRef}
                id={menuId}
                role="menu"
                aria-label={t('nav.accountMenu', { name: displayName })}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className="glass-strong absolute right-0 top-12 w-60 overflow-hidden rounded-lg p-1.5"
              >
                <div className="mb-1 flex items-center gap-3 border-b border-border px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-primary font-display text-xs font-bold text-primary-foreground shadow-[0_0_14px_-3px_rgba(229,53,43,0.8)]">
                    {initials}
                  </span>
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
                      setMenuOpen(false)
                    }}
                  />
                ))}
                <MenuItem
                  icon={<icons.settings size={16} />}
                  label={t('common.settings')}
                  onClick={() => {
                    setSettingsOpen(true)
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<icons.lock size={16} />}
                  label={t('session.lockStation')}
                  onClick={() => {
                    setConfirm('lock')
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<icons.signOut size={16} />}
                  label={isGuest ? t('guest.endSession') : t('common.logout')}
                  danger
                  onClick={() => {
                    setConfirm('logout')
                    setMenuOpen(false)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          logout()
        }}
        onCancel={() => setConfirm(null)}
      />
    </header>
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
