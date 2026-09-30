/**
 * A brand file's versioned URL (C13 `BRAND_ASSET_URL`): `?v=` is the first 8 hex digits of the
 * file's SHA-256. The shell's view model is built from these (C2 `ShellVM` carries every
 * brand-asset URL a page links) — never a template.
 *
 * Minted once per process and path (senior-fe #11): a brand file changes only with a deploy of the
 * brand folder, which restarts the process, so a render does no filesystem work for its links.
 * Should a file be replaced in place regardless, the route still serves its new bytes — only as
 * `unversioned` (five minutes, an `ETag`) for the old `?v=`, never pinned for a year under it.
 */
import { BRAND_ASSET_URL } from '../manifest'
import { readAsset } from './read'
import { resolveBrandAsset } from './resolve'

const minted = new Map<string, string | null>()

/** `/brand-assets/<path>` in `encodeURIComponent`'s one spelling per segment, as C10 writes paths. */
function bareUrl(path: string): string {
  return BRAND_ASSET_URL.path + path.split('/').map(encodeURIComponent).join('/')
}

/**
 * `/brand-assets/<path>?v=<version>`, or `null` when the brand has no such file to serve — the
 * resolver's and the reader's answer, never a guess from the URL's shape.
 */
export function versionedBrandAssetUrl(assetsDir: string, path: string): string | null {
  const key = `${assetsDir}\u0000${path}`
  if (minted.has(key)) return minted.get(key) ?? null
  const asset = resolveBrandAsset(assetsDir, path.split('/'))
  const content = asset === null ? null : readAsset(asset.file)
  const url =
    content === null ? null : `${bareUrl(path)}?${BRAND_ASSET_URL.version.param}=${content.version}`
  minted.set(key, url)
  return url
}

/**
 * The versioned URL, or the bare one when the brand has not shipped the file yet: the page still
 * names what it wanted, and the route answers 404.
 */
export function brandAssetUrl(assetsDir: string, path: string): string {
  return versionedBrandAssetUrl(assetsDir, path) ?? bareUrl(path)
}
