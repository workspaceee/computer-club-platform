import { notFound } from 'next/navigation'
import { SfxConsole } from '@/components/dev-kit/sfx-console'
import { SfxEngineConsole } from '@/components/dev-kit/sfx-engine-console'

/**
 * Audition page for the F8.1 sound set (docs/DESIGN.md §13.9).
 *
 * `pnpm assets:verify` can prove these files are short, quiet and click-free.
 * It cannot tell you whether they sound like one instrument or like seven
 * downloads — that needs ears, and ears need a page. Dev-only: 404s in
 * production, like `/dev/kit` and `/dev/bus`.
 */
export const metadata = {
  title: 'IMBA / sound set',
  robots: { index: false, follow: false },
}

export default function DevSfxPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <span className="label-mono text-[10px] text-primary">DEV / SFX</span>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-text-high text-balance">
          Interface sound set
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-medium">
          {
            'Seven cues, synthesised from the recipes in scripts/lib/sfx-manifest.mjs — nothing here was downloaded. Play them in order first: the set has to sound like one instrument, and a stranger among seven is obvious in sequence but easy to miss one at a time.'
          }
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-text-low">
          {
            'Length, peak and RMS are decoded from the files being served right now, not copied from the generator — a number that agrees with its own source proves nothing. Waveforms are peak-normalised to show shape; at true scale these cues are nearly flat lines, which is the point.'
          }
        </p>
      </header>

      <SfxConsole />

      <section className="flex flex-col gap-5 border-t border-border pt-8">
        <header className="flex flex-col gap-2">
          <span className="label-mono text-[10px] text-primary">F8.2 / ENGINE</span>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-text-high">
            Playback engine
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-text-medium">
            {
              'The console above plays files directly; this one goes through lib/sfx.ts — the single entry point every screen uses. What it tests is the part listening cannot: that a burst of identical events is heard once, that unrelated cues stop at the voice cap, that a critical cue is never the one dropped, and that every silence reports its reason.'
            }
          </p>
        </header>

        <SfxEngineConsole />
      </section>
    </main>
  )
}
