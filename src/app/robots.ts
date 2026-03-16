import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fotonizer.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/impressum', '/datenschutz', '/agb'],
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/client/',
          '/api/',
          '/onboarding',
          '/auth/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
