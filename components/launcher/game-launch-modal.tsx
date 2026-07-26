'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { GameCover } from '@/components/game-cover'
import { Skeleton } from '@/components/skeleton'
import { fetchGame, fetchHouseAccounts, launchGame, toApiError } from '@/lib/mock/api'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const LAUNCH_STEPS = ['Preparing account...', 'Injecting session...', 'Starting game...']

export function GameLaunchModal() {
  const launchGameId = useStore((s) => s.launchGameId)
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const toast = useStore((s) => s.toast)

  // `GET /api/games/:id` and `GET /api/club/house-accounts` (F3.4). Both are
  // conditional on the modal being open, so nothing is fetched while it is shut.
  const { data: game } = useSWR(launchGameId ? ['game', launchGameId] : null, () =>
    fetchGame(launchGameId as string),
  )
  const { data: accounts } = useSWR(
    launchGameId ? 'catalog/house-accounts' : null,
    fetchHouseAccounts,
  )

  const open = launchGameId !== null
  const houseAccounts = accounts ?? []

  const [account, setAccount] = useState<string | null>(null)
  const [remember, setRemember] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (launchGameId) {
      setAccount(null)
      setRemember(false)
      setLaunching(false)
      setStep(0)
    }
  }, [launchGameId])

  // Preselect the first seat the club has free — the server owns availability.
  useEffect(() => {
    if (account !== null || houseAccounts.length === 0) return
    const free = houseAccounts.find((a) => a.status !== 'in-use')
    if (free) setAccount(free.id)
  }, [account, houseAccounts])

  useEffect(() => {
    if (!launching) return
    const timers = LAUNCH_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 1000),
    )
    return () => timers.forEach(clearTimeout)
  }, [launching])

  const close = () => {
    if (launching) return
    setLaunchGame(null)
  }

  const handleLaunch = async () => {
    if (!game) return
    setLaunching(true)
    setStep(0)
    try {
      // The endpoint answers in a few hundred ms, but the agent's own steps are the
      // slow part — wait for both so the checklist is never cut short.
      await Promise.all([
        launchGame(game.id),
        new Promise((resolve) => setTimeout(resolve, LAUNCH_STEPS.length * 1000)),
      ])
      toast('success', `${game.name} launched! Minimizing...`)
      setLaunching(false)
      setLaunchGame(null)
    } catch (err) {
      setLaunching(false)
      // The API answers with a code; the wording stays in the UI (F2.2).
      toast('error', `Launch failed (${toApiError(err).code})`)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="tick-corners w-full max-w-md overflow-hidden rounded-xl border border-border-strong bg-surface-2"
          >
            <div className="relative">
              {game ? (
                <GameCover game={game} className="h-40 w-full" titleClassName="text-2xl" />
              ) : (
                <Skeleton className="h-40 w-full" radius="sm" />
              )}
              <button
                onClick={close}
                disabled={launching}
                className="absolute right-3 top-3 rounded-lg bg-black/40 p-1.5 text-white transition-colors hover:bg-black/70 disabled:opacity-40"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {!launching ? (
                <>
                  <p className="label-mono mb-3 text-[10px] text-text-low">
                    Select account
                  </p>
                  <div className="flex flex-col gap-2">
                    {houseAccounts.length === 0 &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-[58px] w-full" />
                      ))}
                    {houseAccounts.map((acc) => {
                      const disabled = acc.status === 'in-use'
                      const selected = account === acc.id
                      return (
                        <button
                          key={acc.id}
                          disabled={disabled}
                          onClick={() => setAccount(acc.id)}
                          className={cn(
                            'flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-black/20 hover:border-border-strong',
                            disabled && 'cursor-not-allowed opacity-45',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'h-2.5 w-2.5 rounded-full',
                                disabled ? 'bg-danger' : 'bg-success',
                              )}
                            />
                            <div>
                              <p className="text-sm font-semibold text-text-high">{acc.label}</p>
                              {acc.linkedUser && (
                                <p className="text-xs text-text-low">Linked: {acc.linkedUser}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-text-medium">
                            {disabled ? 'In Use' : 'Available'}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-sm text-text-medium">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Remember my choice for this game
                  </label>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={close}
                      className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-text-high transition-colors hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLaunch}
                      disabled={!game || !account}
                      className="flex flex-[1.4] items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_18px_rgba(229,53,43,0.4)] transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Launch
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 size={40} className="animate-spin text-primary" />
                  <div className="flex flex-col items-center gap-2">
                    {LAUNCH_STEPS.map((label, i) => (
                      <div
                        key={label}
                        className={cn(
                          'flex items-center gap-2 text-sm transition-colors',
                          i <= step ? 'text-text-high' : 'text-text-low',
                        )}
                      >
                        {i < step ? (
                          <Check size={14} className="text-success" />
                        ) : i === step ? (
                          <Loader2 size={14} className="animate-spin text-primary" />
                        ) : (
                          <span className="h-3.5 w-3.5" />
                        )}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
