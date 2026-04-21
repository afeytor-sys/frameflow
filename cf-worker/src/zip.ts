/**
 * Streaming ZIP builder — STORE mode (no re-compression, images are already compressed).
 *
 * Uses the data descriptor pattern (flag bit 3): CRC-32 and sizes are written
 * AFTER the file data, so we never need to know them upfront. This allows true
 * single-pass streaming.
 *
 * Output is fed directly into an R2 multipart upload in 8 MB parts,
 * so peak memory usage is bounded to ~1 photo + 8 MB buffer regardless of
 * gallery size.
 */

import { crc32 } from './crc32'

// R2 multipart minimum part size is 5 MB (same as S3). We use 8 MB for headroom.
const PART_SIZE = 8 * 1024 * 1024

// General purpose bit flags:
//   bit 3  = data descriptor follows (CRC + sizes after file data)
//   bit 11 = UTF-8 filename encoding
const GP_FLAGS = 0x0008 | 0x0800

interface EntryMeta {
  nameBytes: Uint8Array
  crc: number
  size: number
  localHeaderOffset: number // byte offset of this entry's local file header
}

export class ZipStream {
  private readonly mpu: R2MultipartUpload
  private parts: R2UploadedPart[] = []
  private partNum = 1
  private buf: Uint8Array[] = []
  private bufLen = 0
  private streamOffset = 0 // running total of bytes handed to push()
  private entries: EntryMeta[] = []

  constructor(mpu: R2MultipartUpload) {
    this.mpu = mpu
  }

  /**
   * Add one file to the ZIP.
   * stream is consumed once; it must be a ReadableStream<Uint8Array>.
   */
  async addFile(filename: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    const nameBytes = new TextEncoder().encode(filename)
    const localHeaderOffset = this.streamOffset

    // Local file header (CRC and sizes are 0 — filled by data descriptor)
    await this.push(localFileHeader(nameBytes))

    // Stream file body, computing CRC on the fly
    let fileCrc = 0
    let fileSize = 0
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fileCrc = crc32(value, fileCrc)
        fileSize += value.length
        await this.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    // Data descriptor (written after file data)
    await this.push(dataDescriptor(fileCrc, fileSize))

    this.entries.push({ nameBytes, crc: fileCrc, size: fileSize, localHeaderOffset })
  }

  /**
   * Write central directory + EOCD, flush final part, complete multipart upload.
   * Must be called exactly once after all files have been added.
   */
  async finalize(): Promise<void> {
    const cdOffset = this.streamOffset

    for (const e of this.entries) {
      await this.push(centralDirEntry(e))
    }

    const cdSize = this.streamOffset - cdOffset
    await this.push(endOfCentralDir(this.entries.length, cdSize, cdOffset))

    // Flush remaining bytes as the final (possibly small) part
    if (this.bufLen > 0) {
      const final = concat(this.buf)
      this.parts.push(await this.mpu.uploadPart(this.partNum++, final))
    }

    await this.mpu.complete(this.parts)
  }

  /** Abort the multipart upload (called on error). */
  async abort(): Promise<void> {
    await this.mpu.abort()
  }

  // ── Internal buffering ────────────────────────────────────────────────────

  private async push(data: Uint8Array): Promise<void> {
    this.buf.push(data)
    this.bufLen += data.length
    this.streamOffset += data.length

    // Upload full parts while buffer exceeds PART_SIZE
    while (this.bufLen >= PART_SIZE) {
      const combined = concat(this.buf)
      const part = combined.slice(0, PART_SIZE)
      const rest = combined.slice(PART_SIZE)
      this.buf = rest.length > 0 ? [rest] : []
      this.bufLen = rest.length
      this.parts.push(await this.mpu.uploadPart(this.partNum++, part))
    }
  }
}

// ── ZIP format primitives ─────────────────────────────────────────────────────

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0, true)
  return b
}

function localFileHeader(nameBytes: Uint8Array): Uint8Array {
  return concat([
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // PK\x03\x04
    u16(20),                 // version needed: 2.0
    u16(GP_FLAGS),           // general purpose bit flags
    u16(0),                  // compression method: STORE
    u16(0), u16(0),          // last mod time / date
    u32(0),                  // CRC-32 (0 — in data descriptor)
    u32(0), u32(0),          // compressed / uncompressed size (0)
    u16(nameBytes.length),
    u16(0),                  // extra field length
    nameBytes,
  ])
}

function dataDescriptor(crc: number, size: number): Uint8Array {
  return concat([
    new Uint8Array([0x50, 0x4b, 0x07, 0x08]), // PK\x07\x08 (optional but recommended)
    u32(crc),
    u32(size), // compressed size (= uncompressed in STORE mode)
    u32(size),
  ])
}

function centralDirEntry(e: EntryMeta): Uint8Array {
  return concat([
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // PK\x01\x02
    u16(20), u16(20),        // version made by / needed
    u16(GP_FLAGS),
    u16(0),                  // compression: STORE
    u16(0), u16(0),          // mod time / date
    u32(e.crc),
    u32(e.size), u32(e.size),
    u16(e.nameBytes.length),
    u16(0), u16(0),          // extra / comment length
    u16(0), u16(0),          // disk number start / internal attr
    u32(0),                  // external attributes
    u32(e.localHeaderOffset),
    e.nameBytes,
  ])
}

function endOfCentralDir(count: number, cdSize: number, cdOffset: number): Uint8Array {
  return concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // PK\x05\x06
    u16(0), u16(0),          // disk number / disk with CD
    u16(count), u16(count),  // entries on this disk / total
    u32(cdSize),
    u32(cdOffset),
    u16(0),                  // comment length
  ])
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}
