'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Coins, Lock, LogOut, Settings, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ImbaLogo } from '@/components/imba-logo'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatCoins, formatDuration } from '@/lib/format'
import { useStore, type LauncherView } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV: { id: LauncherView; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Games' },
  { id: 'shop', label: 'Shop' },
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-6">
        <button onClick={() => setView('home')} aria-label="IMBA home">
          <ImbaLogo size="sm" />
        </button>
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'relative rounded-lg px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors',
                view === item.id ? 'text-text-high' : 'text-text-low hover:text-text-medium',
              )}
            >
              {item.label}
              {view === item.id && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <motion.div
          animate={critical ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: critical ? Infinity : 0 }}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5"
          style={{ borderColor: low ? timerColor : 'var(--border)' }}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-low">Session</span>
          <span className="font-display text-sm font-bold tabular-nums" style={{ color: timerColor }}>
            {formatDuration(seconds)}
          </span>
        </motion.div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5">
          <Coins size={15} className="text-warning" />
          <span className="font-display text-sm font-bold tabular-nums text-text-high">
            {formatCoins(coins)}
          </span>
        </div>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2 transition-colors hover:border-border-strong"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-xs font-bold text-primary-foreground">
              {initials}
            </span>
            <ChevronDown size={16} className="text-text-medium" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-border bg-surface-2 p-1.5 shadow-xl"
              >
                <div className="border-b border-border px-3 py-2">
                  <p className="font-display text-sm font-bold text-text-high">{user?.nickname}</p>
                  <p className="truncate text-xs text-text-low">{user?.email}</p>
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
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5',
        danger ? 'text-danger' : 'text-text-high',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
