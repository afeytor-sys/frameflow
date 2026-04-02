export interface BatchPhoto {
  id: string
  storage_url: string
  filename: string
  file_size: number
}

const DEFAULT_MAX_BYTES = 700 * 1024 * 1024 // 700 MB

/**
 * Splits a photo array into size-bounded batches.
 * A single photo that exceeds maxBytes gets its own batch.
 */
export function batchBySize(
  photos: BatchPhoto[],
  maxBytes = DEFAULT_MAX_BYTES,
): BatchPhoto[][] {
  const batches: BatchPhoto[][] = []
  let current: BatchPhoto[] = []
  let currentBytes = 0

  for (const photo of photos) {
    if (currentBytes + photo.file_size > maxBytes && current.length > 0) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(photo)
    currentBytes += photo.file_size
  }

  if (current.length > 0) batches.push(current)
  return batches
}
