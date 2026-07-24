'use client'

import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  Clock,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Lock,
  type LucideIcon,
  Moon,
  Settings,
  Shirt,
  Sparkles,
  Target,
  Trophy,
  Zap,
  ShoppingBag,
} from 'lucide-react'
import { IconTile } from '@/components/icon-tile'
import { useStore } from '@/lib/store'
import { ACHIEVEMENTS, ACTIVITY } from '@/lib/mock/data'

const ACH_ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  target: Target,
  flame: Flame,
  coins: Coins,
  moon: Moon,
  shirt: Shirt,
  crown: Crown,
  calendar: Calendar,
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  game: Gamepad2,
  purchase: ShoppingBag,
  achievement: Award,
}

const ACTIVITY_ACCENT: Record<string, string> = {
  game: 'text-info',
  purchase: 'text-success',
  achievement: 'text-warning',
}

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: LucideIcon
  label: string
  value: string
  delay: number
}) {
  const Icon = icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-surface px-4 py-4"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
      <Icon className="absolute -right-2 -top-2 h-16 w-16 text-white/[0.03]" strokeWidth={1.5} />
      <IconTile icon={icon} size="sm" variant="primary" />
      <p className="mt-3 font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-text-high">
        {value}
      </p>
      <p className="label-mono mt-2 text-[9px] text-text-low">{label}</p>
    </motion.div>
  )
}

function XpRing({ pct, initials, level }: { pct: number; initials: string; level: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(229,53,43,0.6))' }}
        />
      </svg>
      <div className="absolute inset-2.5 flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-display text-2xl font-bold text-primary">
        {initials}
      </div>
      <span className="label-mono absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-primary/40 bg-surface-2 px-2.5 py-1 text-[9px] text-text-high shadow-lg">
        <Sparkles className="h-3 w-3 text-primary" />
        LVL {level}
      </span>
    </div>
  )
}

export function ProfileView() {
  const user = useStore((s) => s.user)
  const coins = useStore((s) => s.coins)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  if (!user) return null

  const xpPct = Math.min(100, Math.round((user.xp / user.xpMax) * 100))
  const initials = user.nickname.slice(0, 2).toUpperCase()
  const achPct = Math.round((user.achievementsUnlocked / user.achievementsTotal) * 100)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
      {/* Header card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="tick-corners relative overflow-hidden rounded-xl border border-border-strong bg-surface-2"
      >
        <div className="imba-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,53,43,0.2),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8">
          <XpRing pct={xpPct} initials={initials} level={user.level} />

          <div className="flex-1">
            <p className="label-mono mb-1 text-[9px] text-primary">Player Profile</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold uppercase tracking-tighter text-text-high">
                {user.nickname}
              </h1>
              <span className="label-mono rounded-md border border-success/30 bg-success/15 px-2.5 py-1 text-[9px] text-success">
                Online
              </span>
            </div>
            <p className="mt-1 text-sm text-text-medium">{user.email}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-text-low">
              <Calendar className="h-3.5 w-3.5" />
              Member since {user.memberSince}
            </p>

            <div className="mt-4 max-w-md">
              <div className="label-mono mb-1.5 flex items-center justify-between text-[9px] text-text-medium">
                <span className="tabular-nums">
                  {user.xp.toLocaleString()} / {user.xpMax.toLocaleString()} XP
                </span>
                <span className="text-primary tabular-nums">{xpPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-3 md:flex-col">
            <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-warning/25 bg-warning/10 px-4 py-3">
              <Coins className="h-5 w-5 text-warning" />
              <div>
                <p className="font-display text-lg font-bold leading-none tabular-nums text-text-high">
                  {coins.toLocaleString()}
                </p>
                <p className="label-mono mt-1 text-[8px] text-text-low">IMBA Coins</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-high transition-colors hover:border-border-strong hover:bg-white/5"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock} label="Total hours" value={`${user.totalHours}h`} delay={0.05} />
        <StatCard icon={Gamepad2} label="Games played" value={String(user.gamesPlayed)} delay={0.1} />
        <StatCard icon={Calendar} label="Sessions" value={String(user.sessions)} delay={0.15} />
        <StatCard
          icon={Trophy}
          label="Achievements"
          value={`${user.achievementsUnlocked}/${user.achievementsTotal}`}
          delay={0.2}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Achievements */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 className="label-mono text-[11px] text-text-high">Achievements</h2>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${achPct}%` }} />
              </div>
              <span className="font-display text-xs font-bold tabular-nums text-text-medium">
                {user.achievementsUnlocked}/{user.achievementsTotal}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACHIEVEMENTS.map((a, i) => {
              const Icon = ACH_ICONS[a.icon] ?? Award
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  title={`${a.name} — ${a.description}`}
                  className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border px-3 py-4 text-center transition-all ${
                    a.unlocked
                      ? 'border-primary/40 bg-primary/[0.08] hover:border-primary/70 hover:bg-primary/[0.12]'
                      : 'border-border bg-surface opacity-60'
                  }`}
                >
                  {a.unlocked && (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-[radial-gradient(circle_at_top,rgba(229,53,43,0.25),transparent)]" />
                  )}
                  <span
                    className={`relative flex h-12 w-12 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                      a.unlocked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-low'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {!a.unlocked && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-text-low">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <p className="text-xs font-bold leading-tight text-text-high">{a.name}</p>
                  <p className="text-[10px] leading-tight text-text-low">{a.condition}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Activity timeline */}
        <section className="lg:col-span-2">
          <h2 className="label-mono mb-3 text-[11px] text-text-high">Recent activity</h2>
          <ol className="relative flex flex-col">
            <span className="absolute bottom-4 left-[15px] top-4 w-px bg-border" aria-hidden />
            {ACTIVITY.map((e, i) => {
              const Icon = ACTIVITY_ICONS[e.type] ?? Gamepad2
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="relative flex items-start gap-3 py-2 pl-0"
                >
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 ${
                      ACTIVITY_ACCENT[e.type] ?? 'text-text-medium'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="truncate text-sm text-text-high">{e.label}</p>
                    <p className="label-mono text-[8px] text-text-low">{e.time}</p>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}
