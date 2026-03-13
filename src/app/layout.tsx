import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import CookieBanner from '@/components/CookieBanner'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-body',
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
    default: 'Studioflow — Elegante Kunden-Portale für Fotografen',
    template: '%s | Studioflow',
  },
  description:
    'Studioflow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne. Für Hochzeiten, Portraits, Events und alles dazwischen.',
  keywords: ['Fotografie', 'Kundenportal', 'Vertrag', 'Galerie', 'Hochzeitsfotograf'],
  authors: [{ name: 'Studioflow' }],
  creator: 'Studioflow',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    alternateLocale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Studioflow',
    title: 'Studioflow — Elegante Kunden-Portale für Fotografen',
    description:
      'Studioflow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studioflow — Elegante Kunden-Portale für Fotografen',
    description:
      'Studioflow gibt jedem Projekt ein elegantes Kundenportal — Verträge, Galerien, Zeitpläne.',
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
    <html lang={locale} suppressHydrationWarning className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
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
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontFamily: 'DM Sans, system-ui, sans-serif',
                  fontWeight: '500',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--card-shadow-hover)',
                  padding: '10px 14px',
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
