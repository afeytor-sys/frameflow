/**
 * Cloudflare R2 S3-compatible client
 * R2 is S3-compatible, so we use @aws-sdk/client-s3 with a custom endpoint.
 */
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!

/**
 * Custom domain for photo delivery with Cloudflare Image Resizing.
 * e.g. https://photos.fotonizer.com
 */
export const PHOTOS_DOMAIN = 'https://photos.fotonizer.com'

/**
 * Legacy R2 public URL (kept for backwards compatibility / migration scripts).
 * e.g. https://pub-010e77cbae3349479edbba7f4a30e8b6.r2.dev
 */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || PHOTOS_DOMAIN

/**
 * Build the full public URL for an R2 object key (full resolution).
 * e.g. getR2PublicUrl('galleries/abc/photo.jpg')
 *   → 'https://photos.fotonizer.com/galleries/abc/photo.jpg'
 */
export function getR2PublicUrl(key: string): string {
  return `${PHOTOS_DOMAIN}/${key}`
}

/**
 * Build an optimized thumbnail URL using Cloudflare Image Resizing.
 * Used for gallery grids — 600px wide, 70% quality, WebP.
 * e.g. getPhotoThumbnailUrl('galleries/abc/photo.jpg')
 *   → 'https://photos.fotonizer.com/cdn-cgi/image/width=600,quality=70,format=webp/galleries/abc/photo.jpg'
 */
export function getPhotoThumbnailUrl(key: string): string {
  return `${PHOTOS_DOMAIN}/cdn-cgi/image/width=600,quality=70,format=webp/${key}`
}

/**
 * Build an optimized full-resolution URL using Cloudflare Image Resizing.
 * Used for lightbox / full-screen view — 2400px wide, 85% quality, WebP.
 * e.g. getPhotoFullUrl('galleries/abc/photo.jpg')
 *   → 'https://photos.fotonizer.com/cdn-cgi/image/width=2400,quality=85,format=webp/galleries/abc/photo.jpg'
 */
export function getPhotoFullUrl(key: string): string {
  return `${PHOTOS_DOMAIN}/cdn-cgi/image/width=2400,quality=85,format=webp/${key}`
}

/**
 * Extract the R2 object key from any photos.fotonizer.com URL
 * (handles both plain and cdn-cgi/image/... URLs).
 * e.g. 'https://photos.fotonizer.com/cdn-cgi/image/width=600,.../galleries/abc/photo.jpg'
 *   → 'galleries/abc/photo.jpg'
 */
export function extractR2Key(url: string): string | null {
  // Strip cdn-cgi/image/... prefix if present
  const cdnMatch = url.match(/cdn-cgi\/image\/[^/]+\/(.+)$/)
  if (cdnMatch) return cdnMatch[1]
  // Plain URL: https://photos.fotonizer.com/galleries/abc/photo.jpg
  const plainMatch = url.match(/https?:\/\/[^/]+\/(.+)$/)
  return plainMatch ? plainMatch[1] : null
}
