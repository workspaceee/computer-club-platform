import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Overpass } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const overpass = Overpass({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-overpass',
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
  themeColor: '#131315',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${overpass.variable}`}>
      <body className="antialiased bg-background text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
