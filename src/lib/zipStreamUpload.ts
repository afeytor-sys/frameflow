/**
 * Streams a ZIP of photos directly to Cloudflare R2 via S3 multipart upload.
 *
 * Architecture:
 *   fflate Zip (STORE mode, no re-compression)
 *     → PassThrough stream (64 MB buffer)
 *       → @aws-sdk/lib-storage Upload (managed multipart, 10 MB parts)
 *         → R2
 *
 * The Upload and ZIP generation run concurrently via Promise.all.
 * Photos are fetched from R2 one at a time (streaming chunk-by-chunk),
 * bounding memory to roughly one photo at a time.
 *
 * A presigned GET URL (24 h expiry) is returned once the upload is complete.
 * The browser receives the correct Content-Type and Content-Disposition headers
 * from the presigned URL — no proxy needed.
 */

import { PassThrough } from 'node:stream'
import { Zip, ZipPassThrough } from 'fflate'
import { Upload } from '@aws-sdk/lib-storage'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET } from '@/lib/r2'
import type { BatchPhoto } from './zipBatcher'

const PART_SIZE = 10 * 1024 * 1024  // 10 MB per multipart part
const STREAM_HWM  = 64 * 1024 * 1024 // 64 MB PassThrough high-water mark

export async function streamZipToR2(
  photos: BatchPhoto[],
  key: string,
  filename: string,
): Promise<string> {
  // Large high-water mark prevents back-pressure stalls when fflate's
  // synchronous callback writes chunks faster than the upload can consume.
  const passThrough = new PassThrough({ highWaterMark: STREAM_HWM })

  const upload = new Upload({
    client: r2,
    params: {
      Bucket: R2_BUCKET,
      Key: key,
      Body: passThrough,
      ContentType: 'application/zip',
      ContentDisposition: `attachment; filename="${filename}"`,
    },
    partSize: PART_SIZE,
    queueSize: 2,          // 2 concurrent part uploads — enough without saturating
    leavePartsOnError: false,
  })

  // Run ZIP creation and upload concurrently.
  // writeZip ends passThrough when done; the Upload sees EOF and completes.
  await Promise.all([
    writeZipToStream(photos, passThrough),
    upload.done(),
  ])

  // Return a presigned GET URL so the browser downloads directly from R2.
  // Content-Disposition:attachment is embedded in the presigned URL itself.
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ResponseContentType: 'application/zip',
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    }),
    { expiresIn: 24 * 3600 }, // 24 h
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function writeZipToStream(
  photos: BatchPhoto[],
  out: PassThrough,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const zip = new Zip((err, chunk, final) => {
      if (err) {
        out.destroy(err)
        reject(err)
        return
      }
      // PassThrough.write() is safe to call synchronously; the 64 MB HWM
      // ensures we never stall here under normal photo sizes.
      out.write(Buffer.from(chunk))
      if (final) {
        out.end()
        resolve()
      }
    })

    ;(async () => {
      for (const photo of photos) {
        // Strip path separators (ZIP-slip prevention) and sanitize filename.
        const safeName =
          (photo.filename || 'photo.jpg')
            .replace(/[/\\:*?"<>|]/g, '_')
            .replace(/^\.+/, '_') || 'photo.jpg'

        try {
          const res = await fetch(photo.storage_url)
          if (!res.ok || !res.body) continue

          const entry = new ZipPassThrough(safeName) // STORE — images are pre-compressed
          zip.add(entry)

          // Stream the response body in chunks to avoid loading full photo into memory.
          const reader = res.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              entry.push(new Uint8Array(0), true) // signal EOF for this entry
              break
            }
            entry.push(value, false)
          }
        } catch {
          // Skip unreadable/failed photos — never abort the entire batch.
        }
      }

      zip.end()
    })().catch((err) => {
      out.destroy(err)
      reject(err)
    })
  })
}
