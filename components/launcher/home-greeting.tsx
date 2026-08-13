'use client'

/**
 * Personal greeting on the home surface (C3.1).
 *
 * The four facts the task asks for, and nothing else: who the player is, what
 * level they are, how long this visit has been running, and how many days in a
 * row they have shown up. It is the only block on the surface that speaks to the
 * *person* rather than to something the club sells, so it owns the page's `h1`
 * and the hero below it no longer greets anybody — two welcomes on one screen is
 * how the "Welcome back // NAME" eyebrow and this component would have read
 * together.
 *
 * Every number here is server-owned. The level and the streak arrive on
 * `UserProfile` (the streak because "consecutive days" depends on the club's own
 * day boundary — a visit that starts at 01:00 belongs to the night that opened
 * it — so no client can count it), and the elapsed clock is the store's
 * `sessionPlayedSeconds`, the same derived cache the top bar reads. Nothing on
 * this screen counts anything itself.
 */

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/provider'
import { icons } from '@/lib/icons'
import { useStore } from '@/lib/store'
import { formatDurationParts, serverNowMs } from '@/lib/time'
import type { TKey } from '@/lib/i18n/types'
import { cn } from '@/lib/utils'

/**
 * Which greeting the hour gets.
 *
 * Four bands rather than one "Hello" because a club is busiest at the hours a
 * generic greeting reads worst — 02:00 is not a morning. The band boundaries are
 * the only logic; the wording is dictionary copy (F2.4), so a language that
 * splits the evening differently changes strings and not this function.
 */
function greetingKey(hour: number): TKey {
  if (hour >= 5 && hour < 12) return 'home.greetMorning'
  if (hour >= 12 && hour < 18) return 'home.greetAfternoon'
  if (hour >= 18 && hour < 23) return 'home.greetEvening'
  return 'home.greetNight'
}

/**
 * Splits a translated template around one `{placeholder}` so the caller can
 * render a React node in its place.
 *
 * The alternative — interpolating a sentinel and splitting on that — makes the
 * sentinel a value the dictionary could legitimately contain. Splitting the
 * template keeps the seam where it actually is.
 */
function splitOnPlaceholder(
  template: string,
  name: string,
): { text: string; isPlaceholder: boolean }[] {
  return template
    .split(`{${name}}`)
    .flatMap((text, i) => (i === 0 ? [{ text, isPlaceholder: false }] : [{ text: '', isPlaceholder: true }, { text, isPlaceholder: false }]))
    .filter((part) => part.isPlaceholder || part.text !== '')
}

/**
 * The current hour on the **server's** timeline, refreshed once a minute.
 *
 * `serverNowMs()` and not `new Date()` for the reason the notification headings
 * use it too (C2.5): a kiosk with a wrong system clock would otherwise wish an
 * evening player a good morning. Re-read on an interval so a visit that runs
 * across a band boundary — and a club's late shift crosses two of them — is not
 * stuck with the greeting it was opened with.
 *
 * Rendering `serverNowMs()` directly is safe here: the store boots at
 * `screen: 'lock'`, so the home surface is only ever mounted after an unlock and
 * never takes part in the server render that a clock read would desynchronise.
 */
function useGreetingHour(): number {
  const [hour, setHour] = useState(() => new Date(serverNowMs()).getHours())

  useEffect(() => {
    const tick = () => setHour(new Date(serverNowMs()).getHours())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return hour
}

/** One fact in the status line: an icon, a value, and no box of its own. */
function Fact({
  icon: Icon,
  children,
  tone = 'default',
}: {
  icon: typeof icons.timer
  children: React.ReactNode
  tone?: 'default' | 'primary' | 'warning'
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <Icon
        size={15}
        aria-hidden
        className={cn(
          tone === 'primary' && 'text-primary',
          tone === 'warning' && 'text-warning',
          tone === 'default' && 'text-text-low',
        )}
      />
      <span className="text-text-medium">{children}</span>
    </span>
  )
}

/** Hairline between facts. Hidden from the reader — it separates, it says nothing. */
function FactRule() {
  return <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
}

/**
 * No `surface` prop: whether this is a member or a walk-in is already decided by
 * which of `user` / `guest` the store holds, and those two are mutually
 * exclusive. Taking the surface as well would create a second source of truth
 * that could disagree with the first.
 */
export function HomeGreeting() {
  const { t, tp, formatNumber } = useT()
  const user = useStore((s) => s.user)
  const guest = useStore((s) => s.guest)
  const hour = useGreetingHour()

  /**
   * Quantised to whole minutes on purpose. The played clock is rewritten by the
   * 1 Hz `syncClock()` tick, but this block only ever *shows* minutes, so
   * selecting the minute makes zustand skip the other fifty-nine renders.
   */
  const playedMinutes = useStore((s) => Math.floor(s.sessionPlayedSeconds / 60))
  const { hours, minutes } = formatDurationParts(playedMinutes * 60)

  // A guest has no profile: no level, no XP, no streak — the same omission the
  // coin balance and the prize ladder make on this surface (F6.2). The session
  // clock is not part of that, because a walk-in is being billed for it.
  const name = user?.nickname ?? guest?.label
  if (!name) return null

  const elapsed =
    hours > 0
      ? `${tp('common.hours', hours)} ${tp('common.minutes', minutes)}`
      : tp('common.minutes', minutes)
  // "Playing for 0 minutes" is what this branch exists to avoid: on the first
  // screen of a visit it reads as a broken counter, not as a fresh arrival.
  const playing =
    playedMinutes < 1 ? t('home.justArrived') : t('home.playingFor', { duration: elapsed })

  const xpPct = user ? Math.min(100, Math.round((user.xp / user.xpMax) * 100)) : 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4"
    >
      <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tighter text-text-high text-balance md:text-5xl">
        {/* The greeting is one sentence in the dictionary and the name is the one
            word inside it that gets the accent, so the *template* is split on its
            placeholder rather than the sentence being concatenated around the
            name: `{name}` does not sit in the same position in all three
            languages, and RU puts a comma before it that EN does not. Calling `t`
            with no vars deliberately leaves the placeholder intact to split on. */}
        {splitOnPlaceholder(t(greetingKey(hour)), 'name').map((part, i) =>
          part.isPlaceholder ? (
            <span key={i} className="text-primary text-glow">
              {name}
            </span>
          ) : (
            part.text
          ),
        )}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-5">
        <Fact icon={icons.timer} tone="primary">
          {playing}
        </Fact>

        {user && (
          <>
            <FactRule />
            {/* Level and its progress read as one fact, so the bar sits inside
                the same row instead of becoming a second block. The bar is
                decoration — the accessible name carries the numbers. */}
            <span className="flex items-center gap-2.5">
              <Fact icon={icons.level}>{t('home.level', { level: user.level })}</Fact>
              <span
                role="progressbar"
                aria-valuenow={xpPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('home.levelProgress', {
                  xp: formatNumber(user.xp),
                  max: formatNumber(user.xpMax),
                  next: user.level + 1,
                })}
                className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"
              >
                <motion.span
                  className="block h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </span>
              <span className="label-mono text-[9px] text-text-low tabular-nums">
                {t('home.levelProgressShort', {
                  xp: formatNumber(user.xp),
                  max: formatNumber(user.xpMax),
                })}
              </span>
            </span>

            <FactRule />
            {/* A lapsed or first-day streak is shown as an invitation rather than
                as "0 days in a row", and drops the flame with it — a cold streak
                should not wear the badge of a hot one. */}
            <Fact
              icon={user.visitStreak > 0 ? icons.streak : icons.calendar}
              tone={user.visitStreak > 0 ? 'warning' : 'default'}
            >
              {user.visitStreak > 0
                ? tp('home.streakDays', user.visitStreak)
                : t('home.streakStart')}
              <span className="sr-only"> — {t('home.streakLabel')}</span>
            </Fact>
          </>
        )}
      </div>
    </motion.section>
  )
}
