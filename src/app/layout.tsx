import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'
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
    default: 'Fotonizer — Photographer Studio Management Software',
    template: '%s | Fotonizer',
  },
  description:
    'The all-in-one photographer studio management software. Send photos to clients, manage contracts, client galleries and bookings. The Pixieset alternative built for Europe.',
  keywords: [
    'photographer studio management software',
    'client gallery software photographers',
    'photography contract software',
    'pixieset alternative',
    'honeybook for photographers europe',
    'send photos to clients photographer',
    'photography studio management',
    'client portal photographer',
    'photography booking software',
    'digital contracts photographers',
  ],
  authors: [{ name: 'Fotonizer' }],
  creator: 'Fotonizer',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'de_DE',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Fotonizer',
    title: 'Fotonizer — Photographer Studio Management Software',
    description:
      'The all-in-one photographer studio management software. Send photos to clients, manage contracts, client galleries and bookings. The Pixieset alternative built for Europe.',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Fotonizer — Photographer Studio Management Software for client galleries, contracts and bookings',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fotonizer — Photographer Studio Management Software',
    description:
      'The all-in-one photographer studio management software. Send photos to clients, manage contracts, client galleries and bookings. The Pixieset alternative built for Europe.',
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Frameflow',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-2081M7T2H7"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-2081M7T2H7');
        `}
      </Script>
      <body className="antialiased">
        <ThemeProvider>
          <NextIntlClientProvider>
            <div style={{ position: 'relative', zIndex: 1 }}>
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
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
