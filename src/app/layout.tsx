import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import CookieBanner from '@/components/CookieBanner'
import './globals.css'

// JetBrains Mono from Google Fonts (for mono/code elements)
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
    <html lang={locale} className={jetbrainsMono.variable}>
      <head>
        {/* Clash Display + Satoshi from Fontshare CDN */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=satoshi@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <CookieBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#111110',
                color: '#F8F7F4',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'Satoshi, system-ui, sans-serif',
                fontWeight: '500',
                border: '1px solid #1E1E1C',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              },
              success: {
                iconTheme: { primary: '#2D9E6B', secondary: '#F8F7F4' },
              },
              error: {
                iconTheme: { primary: '#C94030', secondary: '#F8F7F4' },
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
