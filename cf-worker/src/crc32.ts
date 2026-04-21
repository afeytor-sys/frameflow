// CRC-32 lookup table — computed once at module load
const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

/**
 * Update a running CRC-32 with more data.
 * Call with prev=0 for the first chunk, then pass the result as prev for each subsequent chunk.
 * Finalize: the final return value IS the CRC-32 (already XOR'd).
 */
export function crc32(data: Uint8Array, prev = 0): number {
  let c = prev ^ 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
