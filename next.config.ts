import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vrfsirwrdlrkpaaysnyj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'vrfsirwrdlrkpaaysnyj.supabase.co',
        pathname: '/storage/v1/render/image/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        // Cloudflare R2 public bucket CDN (legacy)
        protocol: 'https',
        hostname: 'pub-010e77cbae3349479edbba7f4a30e8b6.r2.dev',
        pathname: '/**',
      },
      {
        // Cloudflare custom domain with Image Resizing
        protocol: 'https',
        hostname: 'photos.fotonizer.com',
        pathname: '/**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
