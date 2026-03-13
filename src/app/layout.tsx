import type { Metadata } from 'next'
import { DM_Sans, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FrameFlow — Elegante Kunden-Portale für Fotografen',
    template: '%s | FrameFlow',
  },
  description:
    'FrameFlow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne. Für Hochzeiten, Portraits, Events und alles dazwischen.',
  keywords: ['Fotografie', 'Kundenportal', 'Vertrag', 'Galerie', 'Hochzeitsfotograf'],
  authors: [{ name: 'FrameFlow' }],
  creator: 'FrameFlow',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    alternateLocale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'FrameFlow',
    title: 'FrameFlow — Elegante Kunden-Portale für Fotografen',
    description:
      'FrameFlow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FrameFlow — Elegante Kunden-Portale für Fotografen',
    description:
      'FrameFlow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.',
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${dmSans.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <CookieBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0D0D0C',
                color: '#F7F6F3',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontFamily: 'var(--font-body), DM Sans, system-ui, sans-serif',
                fontWeight: '500',
                border: '1px solid #1E1E1C',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                padding: '10px 14px',
              },
              success: {
                iconTheme: { primary: '#2A9B68', secondary: '#F7F6F3' },
              },
              error: {
                iconTheme: { primary: '#C43B2C', secondary: '#F7F6F3' },
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
