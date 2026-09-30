/**
 * A brand file's version and its versioned URL (C13 `BRAND_ASSET_URL`): the first 8 hex digits of
 * the file's SHA-256. `brandAssetUrl()` is what builds the shell's view model (C2 `ShellVM`
 * carries every brand-asset URL a page links) — never a template — so a page cached before a file
 * changed keeps asking for the old version, which the route answers `unversioned`, and never
 * pins the new bytes under the old name for a year.
 *
 * A file changes only with a deploy of the brand folder, which restarts the process, but the
 * digest is keyed by the file's size and modification time too, so a file replaced in place is
 * read again rather than served under a stale version.
 */
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'

import { BRAND_ASSET_URL } from '../manifest'
import { resolveBrandAsset } from './resolve'

export type AssetContent = {
  readonly bytes: Buffer
  /** The full SHA-256, hex: the strong `ETag`. */
  readonly sha256: string
  /** Its first `BRAND_ASSET_URL.version.hexDigits` digits: the `?v=`. */
  readonly version: string
}

const contents = new Map<string, { readonly stamp: string; readonly content: AssetContent }>()

/** The file's bytes and digests, read once per change of size or modification time. */
export function readAsset(file: string): AssetContent {
  const stat = statSync(file)
  const stamp = `${stat.size}:${stat.mtimeMs}`
  const known = contents.get(file)
  if (known?.stamp === stamp) return known.content
  const bytes = readFileSync(file)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const content = { bytes, sha256, version: sha256.slice(0, BRAND_ASSET_URL.version.hexDigits) }
  contents.set(file, { stamp, content })
  return content
}

/**
 * `/brand-assets/<path>?v=<version>` for a file in `assetsDir`; the bare `/brand-assets/<path>`
 * when there is no such file to version (a brand that has not shipped it yet — the route answers
 * 404, and the page still names what it wanted). Each segment is written in `encodeURIComponent`'s
 * one spelling, as C10 writes every path.
 */
export function brandAssetUrl(assetsDir: string, path: string): string {
  const segments = path.split('/')
  const url =
    BRAND_ASSET_URL.path + segments.map((segment) => encodeURIComponent(segment)).join('/')
  const asset = resolveBrandAsset(assetsDir, segments)
  if (asset === null) return url
  return `${url}?${BRAND_ASSET_URL.version.param}=${readAsset(asset.file).version}`
}
