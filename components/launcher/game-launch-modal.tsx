'use client'

import { motion } from 'framer-motion'
import { icons } from '@/lib/icons'
import { useEffect, useId, useState } from 'react'
import { DataBoundary } from '@/components/data-boundary'
import { GameCover } from '@/components/game-cover'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Overlay } from '@/components/ui/overlay'
import { useApi } from '@/hooks/use-api'
import { useDismissableLayer } from '@/hooks/use-dismissable-layer'
import { useT } from '@/lib/i18n/provider'
import { fetchGame, fetchHouseAccounts, launchGame, toApiError } from '@/lib/mock/api'
import { OVERLAY_MAX_H } from '@/lib/overlay'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const LAUNCH_STEPS = ['Preparing account...', 'Injecting session...', 'Starting game...']

export function GameLaunchModal() {
  const { t } = useT()
  const launchGameId = useStore((s) => s.launchGameId)
  const setLaunchGame = useStore((s) => s.setLaunchGame)
  const setRunningGame = useStore((s) => s.setRunningGame)
  const toast = useStore((s) => s.toast)

  // `GET /api/games/:id` and `GET /api/club/house-accounts` (F3.4). Both are
  // conditional on the modal being open, so nothing is fetched while it is shut.
  const { data: game } = useApi(launchGameId ? ['game', launchGameId] : null, () =>
    fetchGame(launchGameId as string),
  )
  const accounts = useApi(launchGameId ? 'catalog/house-accounts' : null, fetchHouseAccounts)

  const open = launchGameId !== null
  const houseAccounts = accounts.data ?? []

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

  // Escape, the focus trap and the body scroll lock all come from the shared
  // layer core. This dialog used to hand-roll a scrim click instead, so it was
  // dismissable by mouse only — and Tab walked straight out of it into the game
  // grid behind. `closeOnEscape` follows `launching` because a sequence already
  // running on the machine must not be abandoned by a stray keypress (F6.4).
  const titleId = useId()
  const panelRef = useDismissableLayer({
    open,
    onClose: close,
    closeOnEscape: !launching,
  })

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
      // The confirmation belongs to the *launcher's* action and is raised while
      // the launcher is still what the player is looking at, so it goes out
      // before the machine is handed over.
      toast('success', `${game.name} launched! Minimizing...`)
      setLaunching(false)
      setLaunchGame(null)
      // From here the title holds the machine, and the shell goes quiet except
      // for the session clock and an administrator (F8.4). This is the only
      // place that enters that state, because it is the only place that knows a
      // start actually succeeded — the dialog closing is not the same event.
      setRunningGame(game.id)
    } catch (err) {
      setLaunching(false)
      // The API answers with a code; the wording stays in the UI (F2.2).
      toast('error', `Launch failed (${toApiError(err).code})`)
    }
  }

  return (
    <Overlay
      open={open}
      layer="modal"
      blur="md"
      // No dismiss while the agent is mid-launch: a stray click on the scrim
      // would hide a sequence that is still running on the machine.
      onDismiss={launching ? undefined : close}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        // The visible title is painted inside `GameCover`, so the name is given
        // directly rather than referenced — a screen reader still opens with
        // "Launch Civilization VII" instead of an unnamed dialog.
        aria-label={game ? `Launch ${game.name}` : 'Launch game'}
        tabIndex={-1}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        // The cap + inner scroll: this card carries a 160px cover, a list of
        // house accounts and a footer, so it was the tallest dialog in the
        // product and the first to lose its cover art off the top of a short
        // window (F6.4).
        className={cn(
          'tick-corners flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-2',
          OVERLAY_MAX_H,
        )}
      >
            <div className="relative shrink-0">
              {game ? (
                <GameCover
                  game={game}
                  className="h-40 w-full"
                  titleClassName="text-2xl"
                  // The panel is capped at `max-w-md`, so the cover never renders
                  // wider than that regardless of viewport.
                  sizes="448px"
                />
              ) : (
                <Skeleton className="h-40 w-full" radius="sm" />
              )}
              <button
                onClick={close}
                disabled={launching}
                className="absolute right-3 top-3 rounded-lg bg-black/40 p-1.5 text-white transition-colors hover:bg-black/70 disabled:opacity-40"
                aria-label="Close"
              >
                <icons.close size={18} />
              </button>
            </div>

            {/* Only the account list scrolls; the cover stays pinned so the
                guest can always see which game they are about to start. */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {!launching ? (
                <>
                  <p className="label-mono mb-3 text-[10px] text-text-low">
                    Select account
                  </p>
                  <DataBoundary
                    state={accounts}
                    errorBare
                    errorSize="sm"
                    loading={
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-[58px] w-full" />
                        ))}
                      </div>
                    }
                    isEmpty={(rows) => rows.length === 0}
                    empty={
                      <EmptyState
                        bare
                        size="sm"
                        icon={icons.accountMissing}
                        title={t('games.noAccounts')}
                        description={t('games.noAccountsBody')}
                      />
                    }
                  >
                    {(rows) => (
                      <div className="flex flex-col gap-2">
                        {rows.map((acc) => {
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
                    )}
                  </DataBoundary>

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
                  <icons.pending size={40} className="animate-spin text-primary" />
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
                          <icons.check size={14} className="text-success" />
                        ) : i === step ? (
                          <icons.pending size={14} className="animate-spin text-primary" />
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
    </Overlay>
  )
}
