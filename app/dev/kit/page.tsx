import { notFound } from 'next/navigation'
import { KitCrash } from '@/components/dev-kit/kit-crash'
import { KitData } from '@/components/dev-kit/kit-data'
import { KitSurfaces } from '@/components/dev-kit/kit-surfaces'
import { Toaster } from '@/components/toaster'

/**
 * Primitive showcase (F1.22).
 *
 * Every primitive from F1 in every state, on one scrollable page — the fastest
 * way to spot a drifted variant before it ships. Excluded from production by the
 * guard below, so the route 404s on a real deployment.
 */
export const metadata = {
  title: 'IMBA / UI kit',
  robots: { index: false, follow: false },
}

const TOKENS = [
  ['--primary', 'bg-primary'],
  ['--success', 'bg-success'],
  ['--warning', 'bg-warning'],
  ['--danger', 'bg-danger'],
  ['--info', 'bg-info'],
  ['--xp', 'bg-xp'],
  ['--coin', 'bg-coin'],
  ['--debt', 'bg-debt'],
  ['--zone-vip', 'bg-zone-vip'],
  ['--zone-standard', 'bg-zone-standard'],
  ['--zone-ps5', 'bg-zone-ps5'],
  ['--steel', 'bg-steel'],
  ['--surface', 'bg-surface'],
  ['--surface-2', 'bg-surface-2'],
  ['--panel', 'bg-panel'],
] as const

export default function DevKitPage() {
  // Dev-only route — vanishes from any production build.
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <>
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-3">
          <span className="label-mono text-[10px] text-primary">DEV / KIT</span>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-text-high text-balance">
            Design system primitives
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-medium">
            {
              'Every F1 primitive in every state. Not shipped — this route 404s in production. Use it as the reference before adding a new variant anywhere else.'
            }
          </p>
        </header>

        <section id="F1.1" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="label-mono text-[10px] tabular-nums text-primary">F1.1</span>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-text-high">
              Tokens
            </h2>
            <p className="text-sm text-text-medium">Semantic colours, one source of truth</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TOKENS.map(([name, cls]) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3"
              >
                <span className={`size-7 shrink-0 rounded-sm border border-border ${cls}`} aria-hidden />
                <code className="truncate text-[11px] text-text-medium">{name}</code>
              </div>
            ))}
          </div>
        </section>

        <KitSurfaces />
        <KitData />
        {/* Not an F1 primitive, but the only place the crash screen can be
            reviewed without breaking the real shell (F6.5). */}
        <KitCrash />

        <footer className="border-t border-border pt-6 text-xs text-text-low">
          F1.1 – F1.23 · F6.5 · docs/DESIGN.md is the written counterpart to this page.
        </footer>
      </main>

      {/* Local Toaster so the F1.20 demo works without the launcher shell. */}
      <Toaster />
    </>
  )
}
