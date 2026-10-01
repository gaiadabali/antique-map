/**
 * A brand file's bytes and digests, read once per change (senior-be #8, #9).
 *
 * - **Through one descriptor.** The real path is `lstat`ed, opened, and the descriptor's `fstat`
 *   must be the same regular file, so a file swapped for a link between the check and the read is
 *   refused, and the bytes come from the descriptor, never a second open by name.
 * - **Capped.** A file over `BRAND_ASSET_MAX_BYTES` — a master scan dropped into `assets/` by
 *   mistake — is no asset: logged once, answered 404, never pinned in memory.
 * - **Cached by identity.** The key is the file's device and inode, so every spelling of a URL on a
 *   case-insensitive disk shares one entry; the entry is re-read when its size or modification time
 *   changes. The body is one `ArrayBuffer`, built at read time, so an answer copies nothing more.
 * - **Never throws.** A file removed or unreadable under the route is `null`: a 404, not Next's 500.
 */
import { createHash } from 'node:crypto'
import { closeSync, fstatSync, lstatSync, openSync, readSync } from 'node:fs'

import { BRAND_ASSET_URL } from '../manifest'

/** Logos, icons, the OG base and a licensed font are kilobytes; 5 MB is a mistake. */
export const BRAND_ASSET_MAX_BYTES = 5 * 1024 * 1024

export type AssetContent = {
  readonly body: ArrayBuffer
  /** The full SHA-256, hex: the strong `ETag`. */
  readonly sha256: string
  /** Its first `BRAND_ASSET_URL.version.hexDigits` digits: the `?v=`. */
  readonly version: string
}

const cache = new Map<string, { readonly stamp: string; readonly content: AssetContent }>()
const warnedTooLarge = new Set<string>()

/** The file's content, or `null` when it is no regular file, too large, or cannot be read. */
export function readAsset(file: string): AssetContent | null {
  let fd: number | undefined
  try {
    const checked = lstatSync(file)
    if (!checked.isFile() || tooLarge(file, checked.size)) return null
    fd = openSync(file, 'r')
    const stat = fstatSync(fd)
    const same = stat.isFile() && stat.dev === checked.dev && stat.ino === checked.ino
    if (!same || tooLarge(file, stat.size)) return null
    const key = `${stat.dev}:${stat.ino}`
    const stamp = `${stat.size}:${stat.mtimeMs}`
    const known = cache.get(key)
    if (known?.stamp === stamp) return known.content
    const content = digest(readAll(fd, stat.size))
    cache.set(key, { stamp, content })
    return content
  } catch {
    return null
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

function tooLarge(file: string, size: number): boolean {
  if (size <= BRAND_ASSET_MAX_BYTES) return false
  if (!warnedTooLarge.has(file)) {
    warnedTooLarge.add(file)
    console.warn(
      `[brand-assets] ${file} is ${size} bytes, over ${BRAND_ASSET_MAX_BYTES}: not served`,
    )
  }
  return true
}

function readAll(fd: number, size: number): ArrayBuffer {
  const body = new ArrayBuffer(size)
  const view = new Uint8Array(body)
  let offset = 0
  while (offset < size) {
    const read = readSync(fd, view, offset, size - offset, offset)
    if (read === 0) throw new Error('the file shrank while it was read')
    offset += read
  }
  return body
}

function digest(body: ArrayBuffer): AssetContent {
  const sha256 = createHash('sha256').update(new Uint8Array(body)).digest('hex')
  return { body, sha256, version: sha256.slice(0, BRAND_ASSET_URL.version.hexDigits) }
}
