import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BusConsole } from '@/components/dev-kit/bus-console'
import { Toaster } from '@/components/toaster'

/**
 * Event-bus console (F4.4).
 *
 * Play the admin here, watch the client react in the same tab — or keep the
 * launcher open in a second tab on the same station and drive it from this one.
 * Dev-only: the route 404s in production, like `/dev/kit`.
 */
export const metadata = {
  title: 'IMBA / event bus',
  robots: { index: false, follow: false },
}

export default function DevBusPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <>
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <span className="label-mono text-[10px] text-primary">DEV / BUS</span>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-text-high text-balance">
            Realtime event bus
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-medium">
            {
              'Every event from MVP §7, published exactly the way the server will publish it. Each button writes the mock db first and pushes the frame second, so the client can never render something the next GET contradicts.'
            }
          </p>
          {/* `Link`, and it has to be one: the mock db lives in this tab's module
              instance and is not rehydrated on boot, so a typed URL or a reload
              throws away everything the buttons above wrote. A client-side
              navigation keeps it — which is what makes "seed a state here, then
              walk into it on the lock screen" possible at all. */}
          <Link
            href="/"
            className="label-mono w-fit text-[10px] text-primary underline-offset-4 hover:underline"
          >
            {'Open the launcher →'}
          </Link>
        </header>

        <BusConsole />
      </main>
      <Toaster />
    </>
  )
}
