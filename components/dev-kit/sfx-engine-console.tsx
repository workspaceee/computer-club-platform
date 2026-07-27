'use client'

import { useCallback } from 'react'
import { icons } from '@/lib/icons'
import { SFX, SFX_IDS, type SfxId } from '@/lib/assets/sfx'
import { sfx, MAX_VOICES, RETRIGGER_GAP_MS, type SfxOutcome } from '@/lib/sfx'
import { useSfx, useSfxPreload, useSfxState, useSfxVolume } from '@/hooks/use-sfx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

/**
 * Bench for the F8.2 engine.
 *
 * The console above this one auditions the *files*; this one exercises the
 * *rules*, because the rules are the part that cannot be verified by listening
 * politely to one cue at a time. Each button below is a situation the product
 * will actually produce — a burst of identical pushes, four unrelated events in
 * one frame, a cue fired before the set finished decoding, a muted station — and
 * the log shows the outcome the engine reported for every attempt.
 */
export function SfxEngineConsole() {
  // Same mount the shell does (F8.2), so this page boots like the product does:
  // the set is decoded during idle before anything is pressed.
  useSfxPreload()

  const { play, stopAll } = useSfx()
  const state = useSfxState()
  const { volume, muted, setVolume, setMuted } = useSfxVolume()

  /** Five identical cues in one tick — the realtime burst F8.2 exists for. */
  const burst = useCallback(() => {
    for (let i = 0; i < 5; i++) play('notify')
  }, [play])

  /** Four different cues at once — should stop at the voice cap. */
  const flood = useCallback(() => {
    for (const id of ['notify', 'success', 'level-up', 'order-ready'] as SfxId[]) play(id)
  }, [play])

  /** A critical cue against a full bus — it must take a slot, never be dropped. */
  const critical = useCallback(() => {
    for (const id of ['notify', 'success', 'level-up'] as SfxId[]) play(id)
    play('time-warning')
  }, [play])

  return (
    <div className="flex flex-col gap-6">
      <Panel variant="strong" radius="lg" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono text-[10px] text-text-low">engine</span>
          <Badge tone={state.supported ? 'success' : 'danger'} variant="soft" size="sm">
            {state.supported ? 'web audio' : 'unsupported'}
          </Badge>
          <Badge tone={state.armed ? 'success' : 'warning'} variant="soft" size="sm" dot pulse={!state.armed}>
            {state.armed ? 'armed' : 'awaiting gesture'}
          </Badge>
          <Badge tone={state.ready ? 'success' : 'info'} variant="outline" size="sm">
            {`decoded ${state.loaded}/${state.total}`}
          </Badge>
          {state.failed > 0 && (
            <Badge tone="danger" variant="soft" size="sm">
              {`${state.failed} failed`}
            </Badge>
          )}
          <Badge tone={state.voices > 0 ? 'info' : 'neutral'} variant="soft" size="sm">
            {`${state.voices}/${MAX_VOICES} voices`}
          </Badge>
          {state.blocked && (
            <Badge tone="warning" variant="solid" size="sm">
              last attempt blocked
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-5">
          <div className="min-w-56 flex-1">
            <Slider
              label="Engine volume"
              value={Math.round(volume * 100)}
              onChange={(next) => setVolume(next / 100)}
              suffix="%"
              disabled={muted}
            />
            <p className="mt-2 text-xs leading-relaxed text-text-low">
              {
                'Ramped, not stepped — a gain jump on a ringing cue clicks, which would make the slider itself sound broken. F8.3 stores this value; the engine only applies it.'
              }
            </p>
          </div>
          <Toggle
            label="Mute interface sound"
            description="Cuts ringing voices immediately, not just future ones."
            checked={muted}
            onChange={setMuted}
            className="min-w-72 flex-1"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => void sfx.arm()}>
            <icons.play />
            Arm (gesture)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void sfx.preload()}>
            <icons.pending />
            Preload set
          </Button>
          <Button variant="secondary" size="sm" onClick={burst}>
            notify ×5 in one tick
          </Button>
          <Button variant="secondary" size="sm" onClick={flood}>
            {`4 different cues (cap ${MAX_VOICES})`}
          </Button>
          <Button variant="secondary" size="sm" onClick={critical}>
            critical vs full bus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => sfx.clearSuppression()}>
            clear windows
          </Button>
          <Button variant="ghost" size="sm" onClick={stopAll}>
            <icons.close />
            Stop all
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-text-low">
          {`A cue holds the floor for its own length plus ${RETRIGGER_GAP_MS} ms, so "notify ×5" must read played + four suppressed. Press it twice in a row slowly and the second press plays again — suppression is a window, not a rate limit.`}
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel variant="flat" radius="lg" className="flex flex-col gap-3">
          <span className="label-mono text-[10px] text-text-low">play through the engine</span>
          <div className="flex flex-col gap-2">
            {SFX_IDS.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-24 shrink-0"
                  onClick={() => play(id)}
                >
                  <icons.play />
                  {'Play'}
                </Button>
                <span className="label-mono truncate text-xs text-text-high">{id}</span>
                {SFX[id].critical && (
                  <Badge tone="warning" variant="outline" size="sm">
                    critical
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel variant="flat" radius="lg" className="flex flex-col gap-3">
          <span className="label-mono text-[10px] text-text-low">
            attempts — newest first
          </span>
          {state.history.length === 0 ? (
            <p className="text-sm leading-relaxed text-text-medium">
              {'Nothing requested yet. Every play() call lands here with its outcome, including the silent ones.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {state.history.map((attempt) => (
                <li
                  key={attempt.seq}
                  className="flex items-center gap-3 rounded-sm bg-white/[0.03] px-2.5 py-1.5"
                >
                  <span className="label-mono w-8 shrink-0 text-[10px] tabular-nums text-text-low">
                    {attempt.seq}
                  </span>
                  <span className="label-mono min-w-0 flex-1 truncate text-[11px] text-text-medium">
                    {attempt.id}
                  </span>
                  <OutcomeBadge outcome={attempt.outcome} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** Outcome tones: heard is green, *designed* silence is neutral, a fault is red. */
function OutcomeBadge({ outcome }: { outcome: SfxOutcome }) {
  const tone =
    outcome === 'played'
      ? 'success'
      : outcome === 'deferred'
        ? 'info'
        : outcome === 'blocked'
          ? 'warning'
          : outcome === 'unavailable' || outcome === 'unsupported'
            ? 'danger'
            : 'neutral'

  return (
    <Badge tone={tone} variant="soft" size="sm" className={cn('w-24 justify-center')}>
      {outcome}
    </Badge>
  )
}
