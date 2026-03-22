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
 * Public URL for R2 objects — from env var R2_PUBLIC_URL.
 * e.g. https://pub-010e77cbae3349479edbba7f4a30e8b6.r2.dev
 * or a custom domain like https://photos.fotonizer.com
 */
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

/**
 * Build the full public URL for an R2 object key (full resolution).
 */
export function getR2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Extract the R2 object key from any R2 public URL.
 */
export function extractR2Key(url: string): string | null {
  const cdnMatch = url.match(/cdn-cgi\/image\/[^/]+\/(.+)$/)
  if (cdnMatch) return cdnMatch[1]
  const plainMatch = url.match(/https?:\/\/[^/]+\/(.+)$/)
  return plainMatch ? plainMatch[1] : null
}
