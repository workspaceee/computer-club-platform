'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Coins, Lock, LogOut, Settings, Timer, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ImbaLogo } from '@/components/imba-logo'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatCoins, formatDuration } from '@/lib/format'
import { useStore, type LauncherView } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV: { id: LauncherView; label: string; index: string }[] = [
  { id: 'home', label: 'Home', index: '01' },
  { id: 'games', label: 'Games', index: '02' },
  { id: 'shop', label: 'Shop', index: '03' },
]

export function TopBar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const seconds = useStore((s) => s.sessionSeconds)
  const coins = useStore((s) => s.coins)
  const user = useStore((s) => s.user)
  const lockPc = useStore((s) => s.lockPc)
  const logout = useStore((s) => s.logout)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const toast = useStore((s) => s.toast)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'lock' | 'logout' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const low = seconds <= 15 * 60
  const critical = seconds <= 5 * 60
  const timerColor = critical ? 'var(--danger)' : low ? 'var(--warning)' : 'var(--text-high)'

  const initials = (user?.nickname ?? 'P').slice(0, 2).toUpperCase()

  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between gap-4 rounded-none border-x-0 border-t-0 px-4 md:px-8">
      <div className="flex items-center gap-8">
        <button
          onClick={() => setView('home')}
          aria-label="IMBA home"
          className="transition-transform hover:scale-[1.03]"
        >
          <ImbaLogo size="sm" />
        </button>
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-3.5 py-2 transition-colors',
                  active ? 'text-text-high' : 'text-text-low hover:text-text-medium',
                )}
              >
                <span className="label-mono text-[9px] text-primary/70 tabular-nums">
                  {item.index}
                </span>
                <span className="font-display text-sm font-semibold tracking-tight">
                  {item.label}
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
          <Timer size={14} style={{ color: timerColor }} />
          <div className="flex flex-col leading-none">
            <span className="label-mono hidden text-[8px] text-text-low sm:block">Session</span>
            <span
              className="font-display text-sm font-bold tabular-nums leading-tight"
              style={{ color: timerColor }}
            >
              {formatDuration(seconds)}
            </span>
          </div>
        </motion.div>

        {/* Coins */}
        <div className="flex items-center gap-2 rounded-md border border-warning/25 bg-warning/[0.07] px-3 py-1.5">
          <Coins size={14} className="text-warning" />
          <div className="flex flex-col leading-none">
            <span className="label-mono hidden text-[8px] text-warning/70 sm:block">Coins</span>
            <span className="font-display text-sm font-bold tabular-nums leading-tight text-text-high">
              {formatCoins(coins)}
            </span>
          </div>
        </div>

        {/* Avatar menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md border border-border bg-white/[0.03] py-1 pl-1 pr-2 transition-colors hover:border-border-strong"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-primary font-display text-xs font-bold text-primary-foreground shadow-[0_0_14px_-3px_rgba(229,53,43,0.8)]">
              {initials}
            </span>
            <ChevronDown
              size={15}
              className={cn('text-text-medium transition-transform', menuOpen && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
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
                      {user?.nickname}
                    </p>
                    <p className="truncate text-xs text-text-low">{user?.email}</p>
                  </div>
                </div>
                <MenuItem
                  icon={<User size={16} />}
                  label="Profile"
                  onClick={() => {
                    setView('profile')
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<Settings size={16} />}
                  label="Settings"
                  onClick={() => {
                    setSettingsOpen(true)
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<Lock size={16} />}
                  label="Lock PC"
                  onClick={() => {
                    setConfirm('lock')
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<LogOut size={16} />}
                  label="Logout"
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
        title="Lock this station?"
        message="Your session will be paused. Log back in to resume your remaining time."
        confirmLabel="Lock PC"
        danger
        onConfirm={() => {
          setConfirm(null)
          toast('info', 'Station locked. Session paused.')
          lockPc()
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'logout'}
        title="Log out?"
        message="You will end your session and return to the lock screen."
        confirmLabel="Logout"
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
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5',
        danger ? 'text-danger' : 'text-text-high',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
