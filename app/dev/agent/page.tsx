import { notFound } from 'next/navigation'
import { AgentConsole } from '@/components/dev-kit/agent-console'
import { Toaster } from '@/components/toaster'

/**
 * Agent harness (F5.4).
 *
 * Flip the seat between "agent running", "agent gone" and "agent running but the
 * hardware has no such panel", and confirm the tiles stay honest in all three.
 * Dev-only, like `/dev/kit` and `/dev/bus`.
 */
export const metadata = {
  title: 'IMBA / agent',
  robots: { index: false, follow: false },
}

export default function DevAgentPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <span className="label-mono text-[10px] text-primary">DEV / AGENT</span>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-text-high text-balance">
            Station agent bridge
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-medium">
            {
              'A seat without an agent must say so. No tile here is ever allowed to report a success the hardware did not perform — that rule is the whole reason the agentAvailable flag exists.'
            }
          </p>
        </header>

        <AgentConsole />
      </main>
      <Toaster />
    </>
  )
}
