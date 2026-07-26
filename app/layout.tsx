import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Chakra_Petch, Inter, Manrope } from 'next/font/google'
import { I18nProvider } from '@/lib/i18n/provider'
import { I18nProvider } from '@/lib/i18n/provider'
import './globals.css'

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

// Tactical digital typeface used for the big station clock.
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
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${chakraPetch.variable} bg-background`}
    >
      <body className="antialiased bg-background text-foreground">
        {/* `lang` above is the SSR default (EN); I18nProvider updates it on the client. */}
        <I18nProvider>{children}</I18nProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
