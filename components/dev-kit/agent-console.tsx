'use client'

/**
 * Agent console (F5.4 harness).
 *
 * The `agentAvailable` flag is only worth anything if the "no agent" seat can be
 * seen on demand, so this panel flips the mock into every shape a real fleet has:
 * agent present, agent gone, and a PS5/AMD-style seat where the agent answers but
 * the panel simply is not there. Remounting the grid on each change is deliberate
 * — it is exactly what happens when a station reloads after the agent dies.
 */

import { PlugZap, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { NativePanels } from '@/components/agent/native-panels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Toggle } from '@/components/ui/toggle'
import { mockAgentControls } from '@/lib/agent/mock-agent'

export function AgentConsole() {
  const [present, setPresent] = useState(true)
  const [nvidia, setNvidia] = useState(true)
  // Bumping this remounts the grid, which re-runs the handshake from scratch.
  const [nonce, setNonce] = useState(0)

  function apply(next: { present?: boolean; nvidia?: boolean }) {
    const agentPresent = next.present ?? present
    const hasNvidia = next.nvidia ?? nvidia
    setPresent(agentPresent)
    setNvidia(hasNvidia)
    mockAgentControls.setAvailable(agentPresent)
    mockAgentControls.setCapabilities(
      hasNvidia ? {} : { nvidiaProfiles: false, nativePanels: ['windows-display', 'audio-output'] },
    )
    setNonce((n) => n + 1)
  }

  function reset() {
    mockAgentControls.reset()
    setPresent(true)
    setNvidia(true)
    setNonce((n) => n + 1)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Panel
        variant="glass"
        title="Seat simulation"
        actions={
          <Badge variant="soft" tone={present ? 'success' : 'warning'}>
            {present ? 'agentAvailable' : 'no agent'}
          </Badge>
        }
      >
        <div className="flex flex-col gap-3">
          <Toggle
            checked={present}
            onChange={(v) => apply({ present: v })}
            label="Station agent running"
            description="Off = every bridge call rejects with agentUnavailable."
          />
          <Toggle
            checked={nvidia}
            onChange={(v) => apply({ nvidia: v })}
            disabled={!present}
            label="NVIDIA GPU + full panel set"
            description="Off = a console/AMD seat: the agent answers, most panels are absent."
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={reset}
              iconLeft={<RotateCcw aria-hidden />}
            >
              Reset mock
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNonce((n) => n + 1)}
              iconLeft={<PlugZap aria-hidden />}
            >
              Re-handshake
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-text-low">
            {
              'Expected: tiles never claim success without an agent — they are disabled and say why, with one banner and a "Check again" button.'
            }
          </p>
        </div>
      </Panel>

      <Panel variant="strong" title="Native settings tiles">
        <NativePanels key={nonce} />
      </Panel>
    </div>
  )
}
