/**
 * A file's SHA-256, the way the records write it (64 lower-case hex digits: C9 `masterKey()`,
 * `IntakeEntry.checksum`) and the way S3 carries it (`x-amz-checksum-sha256`: the 32 bytes in
 * standard base64).
 */
import { createHash } from 'node:crypto'

const SHA256_HEX = /^[0-9a-f]{64}$/
const SHA256_BASE64 = /^[A-Za-z0-9+/]{43}=$/

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX.test(value)
}

/** `x-amz-checksum-sha256`'s form of a hex digest. */
export function sha256HexToBase64(hex: string): string {
  if (!isSha256Hex(hex)) throw new Error(`not a SHA-256 in 64 lower-case hex digits: "${hex}"`)
  return Buffer.from(hex, 'hex').toString('base64')
}

/**
 * A stored object's `ChecksumSHA256` as hex, or null when it is not a whole-object SHA-256 —
 * absent, or a multipart upload's composite checksum (`<base64>-<parts>`), which hashes the
 * parts' checksums rather than the file.
 */
export function storedChecksumToHex(value: string | undefined | null): string | null {
  if (!value || !SHA256_BASE64.test(value)) return null
  return Buffer.from(value, 'base64').toString('hex')
}

/** The SHA-256 of a byte stream — or of chunks already in memory — in hex. */
export async function sha256HexOf(
  stream: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}
