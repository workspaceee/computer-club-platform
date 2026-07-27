'use client'

/**
 * Native settings tiles (F5.4).
 *
 * The whole point of this component is the honest failure state. Opening the
 * NVIDIA Control Panel is something only the station agent can do, so:
 *
 *  - while the handshake runs, tiles are skeletons — not enabled, not failed;
 *  - with no agent, every tile is a disabled "Unavailable on this PC" tile plus
 *    one banner with a "Check again" button — never a click that pretends to work;
 *  - with an agent, a tile whose target is missing from `capabilities.nativePanels`
 *    (PS5 seat, AMD build) says "Not available on this hardware" and stays
 *    disabled, so a dead tile can never look alive;
 *  - a click that throws surfaces `errors.<AgentErrorCode>` and resets the tile.
 *
 * Copy comes from the `agent` namespace, never from the agent itself.
 */

import { AlertTriangle, Gauge, Headphones, Keyboard, Mic, Monitor, MousePointer2, PlugZap, RefreshCw, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { IconTile } from '@/components/icon-tile'
import { Button } from '@/components/ui/button'
import { NATIVE_PANEL_TARGETS, type NativePanelTarget, toAgentError } from '@/lib/agent/bridge'
import { mockAgent } from '@/lib/agent/mock-agent'
import { useAgent } from '@/hooks/use-agent'
import { useT } from '@/lib/i18n/provider'
import type { TKey } from '@/lib/i18n/types'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Presentation for each target: icon plus the two dictionary keys. */
const PANELS: Record<NativePanelTarget, { icon: LucideIcon; nameKey: TKey; hintKey: TKey }> = {
  'nvidia-control-panel': {
    icon: Gauge,
    nameKey: 'agent.panelNvidia',
    hintKey: 'agent.panelNvidiaHint',
  },
  'windows-display': {
    icon: Monitor,
    nameKey: 'agent.panelWindowsDisplay',
    hintKey: 'agent.panelWindowsDisplayHint',
  },
  'audio-output': {
    icon: Headphones,
    nameKey: 'agent.panelAudioOutput',
    hintKey: 'agent.panelAudioOutputHint',
  },
  'audio-input': {
    icon: Mic,
    nameKey: 'agent.panelAudioInput',
    hintKey: 'agent.panelAudioInputHint',
  },
  mouse: {
    icon: MousePointer2,
    nameKey: 'agent.panelMouse',
    hintKey: 'agent.panelMouseHint',
  },
  keyboard: {
    icon: Keyboard,
    nameKey: 'agent.panelKeyboard',
    hintKey: 'agent.panelKeyboardHint',
  },
}

export function NativePanels({ className }: { className?: string }) {
  const { status, supports, recheck, rechecking } = useAgent()
  const { t } = useT()
  const toast = useStore((s) => s.toast)
  const [opening, setOpening] = useState<NativePanelTarget | null>(null)

  const checking = status === 'checking'
  const unavailable = status === 'unavailable'

  async function open(target: NativePanelTarget) {
    setOpening(target)
    try {
      await mockAgent.openNativePanel(target)
      toast('success', t('agent.openedToast', { panel: t(PANELS[target].nameKey) }))
    } catch (error) {
      // The agent only ever hands back a code; the copy is ours.
      toast('error', t(`errors.${toAgentError(error).code}` as TKey))
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* One banner for the whole grid, so we do not repeat the reason six times. */}
      {unavailable && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/[0.07] p-4 sm:flex-row sm:items-center"
        >
          <AlertTriangle size={18} className="shrink-0 text-warning" aria-hidden />
          <div className="flex-1">
            <p className="font-display text-sm font-bold uppercase tracking-tight text-text-high">
              {t('agent.statusUnavailable')}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-text-medium">
              {t('agent.unavailableBody')} {t('agent.unavailableHint')}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={recheck}
            loading={rechecking}
            iconLeft={<RefreshCw aria-hidden />}
            className="shrink-0 self-start sm:self-auto"
          >
            {t('agent.recheck')}
          </Button>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NATIVE_PANEL_TARGETS.map((target) => {
          const { icon, nameKey, hintKey } = PANELS[target]
          const usable = supports(target)
          const isOpening = opening === target
          // Three reasons a tile can be dead, each with its own honest line.
          const reason = checking
            ? t('agent.statusChecking')
            : unavailable
              ? t('agent.unavailable')
              : usable
                ? t(hintKey)
                : t('agent.unsupported')

          return (
            <li key={target}>
              <button
                type="button"
                onClick={() => void open(target)}
                disabled={!usable || isOpening}
                aria-busy={isOpening || checking}
                className={cn(
                  'group flex w-full items-center gap-3.5 rounded-lg border p-3.5 text-left outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-primary/70',
                  usable
                    ? 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
                    : 'cursor-not-allowed border-border/60 bg-surface/40',
                )}
              >
                <IconTile
                  icon={usable ? icon : PlugZap}
                  size="md"
                  variant={usable ? 'default' : 'muted'}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm font-semibold',
                      usable ? 'text-text-high' : 'text-text-low',
                    )}
                  >
                    {t(nameKey)}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block truncate text-xs',
                      checking && 'animate-pulse',
                      usable ? 'text-text-medium' : 'text-text-low',
                    )}
                  >
                    {isOpening ? t('agent.opening') : reason}
                  </span>
                </span>
                {usable && (
                  <span className="label-mono shrink-0 text-[9px] text-text-low transition-colors group-hover:text-primary">
                    {t('agent.open')}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
