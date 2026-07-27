import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Chakra_Petch, Inter, Manrope } from 'next/font/google'
import { RealtimeProvider } from '@/components/realtime/realtime-provider'
import { I18nProvider } from '@/lib/i18n/provider'
import './globals.css'

/**
 * Root document of the shell (F6.6).
 *
 * The rule that shapes every value below: **this is a kiosk, not a website.**
 * The document is opened once by the club's own machine, in fullscreen, on a
 * screen nobody owns. So the defaults a website wants — pinch-zoom, indexing,
 * auto-linked phone numbers, pull-to-refresh, a light UA theme flash — are all
 * wrong here, and each is switched off deliberately rather than left to chance.
 */

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

// Single geometric display face for headings across all languages
// (Latin, Latin-ext, Cyrillic) so type looks identical regardless of language.
const manrope = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

// Tactical digital typeface used for the big station clock. Latin only on
// purpose: it renders digits and separators, never translated copy, so the
// Cyrillic subset would be weight the kiosk downloads and never paints.
const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-clock',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'IMBA Cyber Club — Gaming Shell',
  description:
    'IMBA-SHELL — the client launcher experience for IMBA Cyber Club gaming stations.',
  applicationName: 'IMBA-SHELL',
  generator: 'v0.app',

  // The shell is the interior of a paid seat, not a public page. It has nothing
  // to offer a crawler and everything to leak (session state, member names in
  // shared links), so it stays out of every index.
  robots: { index: false, follow: false, nocache: true },

  // Assets live in `public/`, so Next's file convention (app/icon.*) does not
  // pick them up — they have to be declared. The tab icon follows the OS theme
  // because an admin's laptop is where these tabs are actually read.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-light-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/apple-icon.png',
  },

  // A phone number in the bar's contact line, a session code that looks like a
  // date — iOS turns those into tappable links with its own styling, which on a
  // kiosk means a guest can open Maps or the dialer from inside the launcher.
  formatDetection: { telephone: false, address: false, email: false, date: false },

  // The tablet self-service surface is added to the home screen and must open
  // chromeless; `black-translucent` keeps our own background under the status bar.
  appleWebApp: {
    capable: true,
    title: 'IMBA-SHELL',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  // Dark is not a preference here, it is the only theme the product has, and
  // `themeColor` is the exact `--background` from globals.css so the browser
  // chrome does not flash a different near-black before first paint.
  colorScheme: 'dark',
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,

  // Pinch-zoom off: the layout is already sized for the seat, and a guest who
  // zooms by accident on a touch screen has no address bar and no reset gesture
  // to get back — the station looks broken until an admin fixes it. Accessibility
  // is served by the product's own type scale, not by the UA zoom.
  maximumScale: 1,
  userScalable: false,

  // On-screen keyboard resizes the layout instead of sliding the viewport: our
  // fixed layers (top bar, mobile bar, dialog scroll port) are positioned
  // against the viewport, and a shifted one drags them off-screen mid-typing.
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      // `bg-background` on the root element, not just on body: the overscroll
      // area and the space behind a short page are painted by `<html>`, so
      // without it a rubber-band pull shows white on the club's screen.
      className={`${inter.variable} ${manrope.variable} ${chakraPetch.variable} bg-background`}
    >
      <body className="overscroll-none touch-manipulation bg-background text-foreground antialiased">
        {/* `overscroll-none` kills pull-to-refresh — a downward flick on a touch
            kiosk must never reload the visit. `touch-manipulation` drops the
            double-tap-zoom wait, so buttons answer immediately. */}

        {/* `lang` above is the SSR default (EN); I18nProvider updates it on the client. */}
        <I18nProvider>
          {/* One realtime stream for the whole shell (F4.3): pushes, SWR
              invalidation, toasts and the offline banner (F4.5). */}
          <RealtimeProvider>{children}</RealtimeProvider>
        </I18nProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
