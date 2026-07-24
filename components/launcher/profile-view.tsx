"use client"

import { motion } from "framer-motion"
import {
  Clock,
  Gamepad2,
  Trophy,
  Coins,
  Zap,
  Target,
  Flame,
  Moon,
  Shirt,
  Crown,
  Calendar,
  Lock,
  ShoppingBag,
  Award,
  type LucideIcon,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { ACHIEVEMENTS, ACTIVITY } from "@/lib/mock/data"

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

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-none text-text-high">{value}</p>
        <p className="mt-1 truncate text-xs text-text-low">{label}</p>
      </div>
    </div>
  )
}

export function ProfileView() {
  const user = useStore((s) => s.user)
  const coins = useStore((s) => s.coins)
  if (!user) return null

  const xpPct = Math.min(100, Math.round((user.xp / user.xpMax) * 100))
  const initials = user.nickname.slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
      {/* Header card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface-2 p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,53,43,0.18),transparent_55%)]" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 font-display text-2xl font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-text-high">{user.nickname}</h1>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                LVL {user.level}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-low">{user.email}</p>
            <p className="mt-0.5 text-xs text-text-low">Member since {user.memberSince}</p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-text-medium">
                <span>
                  XP {user.xp.toLocaleString()} / {user.xpMax.toLocaleString()}
                </span>
                <span>{xpPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-surface px-4 py-3">
            <Coins className="h-5 w-5 text-primary" />
            <div>
              <p className="font-display text-lg font-bold leading-none text-text-high">{coins.toLocaleString()}</p>
              <p className="text-[11px] text-text-low">IMBA Coins</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock} label="Total hours" value={`${user.totalHours}h`} />
        <StatCard icon={Gamepad2} label="Games played" value={String(user.gamesPlayed)} />
        <StatCard icon={Calendar} label="Sessions" value={String(user.sessions)} />
        <StatCard
          icon={Trophy}
          label="Achievements"
          value={`${user.achievementsUnlocked}/${user.achievementsTotal}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Achievements */}
        <section className="lg:col-span-3">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-text-medium">
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACHIEVEMENTS.map((a) => {
              const Icon = ACH_ICONS[a.icon] ?? Award
              return (
                <div
                  key={a.id}
                  title={`${a.name} — ${a.description}`}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors ${
                    a.unlocked
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-surface opacity-60"
                  }`}
                >
                  <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-lg ${
                      a.unlocked ? "bg-primary/20 text-primary" : "bg-white/5 text-text-low"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {!a.unlocked && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-text-low">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <p className="text-xs font-semibold leading-tight text-text-high">{a.name}</p>
                  <p className="text-[10px] leading-tight text-text-low">{a.condition}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Activity */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-text-medium">
            Recent activity
          </h2>
          <ul className="flex flex-col gap-2">
            {ACTIVITY.map((e) => {
              const Icon = ACTIVITY_ICONS[e.type] ?? Gamepad2
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-text-medium">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-high">{e.label}</p>
                    <p className="text-[11px] text-text-low">{e.time}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
