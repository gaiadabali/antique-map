/**
 * The on-disk cache that makes the public read resumable and keeps it from
 * ever asking the old site for the same URL twice (D41). One entry per URL:
 * a metadata file written LAST, after the body has been renamed into place,
 * so an interrupted write leaves no entry and the URL is simply fetched on
 * the next run — never read back half-written.
 *
 * Bodies are kept only for 2xx answers. An error page is recorded by status
 * alone: the old site's error pages are framework debug output (MIGRATION.md
 * §1) and may carry its environment, which has no business on our disk.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type CachedResponse = {
  url: string
  status: number
  fetchedAt: string
  contentType: string | null
  location: string | null
  lastModified: string | null
  /** Path of the body relative to the cache root, or null (non-2xx, or empty). */
  body: string | null
  bytes: number
}

const EXTENSIONS: Record<string, string> = {
  'text/html': 'html',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/plain': 'txt',
  'application/json': 'json',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function urlKey(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

function extensionFor(contentType: string | null): string {
  const bare = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  return EXTENSIONS[bare] ?? 'bin'
}

function writeAtomically(path: string, data: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.partial`
  writeFileSync(temporary, data)
  renameSync(temporary, path)
}

export class ResponseCache {
  readonly root: string

  constructor(root: string) {
    this.root = root
    mkdirSync(root, { recursive: true })
  }

  private metaPath(url: string): string {
    const key = urlKey(url)
    return join(this.root, 'meta', key.slice(0, 2), `${key}.json`)
  }

  has(url: string): boolean {
    return existsSync(this.metaPath(url))
  }

  get(url: string): CachedResponse | null {
    const path = this.metaPath(url)
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf8')) as CachedResponse
  }

  /** The body's absolute path, or null. */
  bodyPath(entry: CachedResponse): string | null {
    return entry.body === null ? null : join(this.root, entry.body)
  }

  readText(entry: CachedResponse): string | null {
    const path = this.bodyPath(entry)
    return path === null ? null : readFileSync(path, 'utf8')
  }

  put(meta: Omit<CachedResponse, 'body' | 'bytes'>, body: Uint8Array | null): CachedResponse {
    const keep = body !== null && body.byteLength > 0 && meta.status >= 200 && meta.status < 300
    let relativeBody: string | null = null
    if (keep) {
      const key = urlKey(meta.url)
      relativeBody = `bodies/${key.slice(0, 2)}/${key}.${extensionFor(meta.contentType)}`
      writeAtomically(join(this.root, relativeBody), body)
    }
    const entry: CachedResponse = { ...meta, body: relativeBody, bytes: keep ? body.byteLength : 0 }
    writeAtomically(this.metaPath(meta.url), `${JSON.stringify(entry, null, 2)}\n`)
    return entry
  }
}
