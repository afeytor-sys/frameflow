import type { Metadata } from 'next'
import { DM_Sans, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import CookieBanner from '@/components/CookieBanner'
import { ThemeProvider } from '@/components/ThemeProvider'
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
    <html lang={locale} suppressHydrationWarning className={`${dmSans.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
            <CookieBanner />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-surface-solid)',
                  color: 'var(--text-primary)',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontFamily: 'var(--font-body), DM Sans, system-ui, sans-serif',
                  fontWeight: '500',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--glass-shadow)',
                  padding: '10px 14px',
                  backdropFilter: 'blur(16px)',
                },
                success: {
                  iconTheme: { primary: '#2A9B68', secondary: 'white' },
                },
                error: {
                  iconTheme: { primary: '#C43B2C', secondary: 'white' },
                },
              }}
            />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
