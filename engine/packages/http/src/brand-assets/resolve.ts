/**
 * Which file a `/brand-assets/…` request names — or none (C13 `BRAND_ASSET_URL`, TASKS.md 4.1.f).
 * Only a regular file inside the brand's assets folder, with an extension C1's
 * `BRAND_ASSET_TYPES` lists: a `.` or `..` segment, an empty one, a backslash, a drive letter or
 * a NUL, a dotfile, and anything whose real path leaves the folder — a symbolic link or a
 * junction pointing out — is no asset. Each check is a reason to answer 404, never to guess.
 */
import { realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'

import { BRAND_ASSET_TYPES, brandAssetExtension } from '@engine/config/schema'

export type BrandAsset = {
  /** The real path of the file, inside the real assets folder. */
  readonly file: string
  /** The path under the folder, `/`-separated, as the URL names it. */
  readonly path: string
  readonly contentType: (typeof BRAND_ASSET_TYPES)[keyof typeof BRAND_ASSET_TYPES]
  readonly isSvg: boolean
}

/** A segment a URL may name inside the folder: printable, never a dot segment, a dotfile or a separator. */
const SEGMENT = /^(?!\.)[^/\\:\0]+$/

/**
 * The asset `segments` name under `assetsDir` — the route's `[...path]`, each segment decoded
 * once by Next — or `null`. Never throws: a folder that does not exist names no asset.
 */
export function resolveBrandAsset(
  assetsDir: string,
  segments: readonly string[],
): BrandAsset | null {
  if (segments.length === 0 || !segments.every((segment) => SEGMENT.test(segment))) return null
  const path = segments.join('/')
  const extension = brandAssetExtension(path)
  if (extension === null) return null
  let root: string
  let file: string
  try {
    root = realpathSync(assetsDir)
    file = realpathSync(join(root, ...segments))
    if (!statSync(file).isFile()) return null
  } catch {
    return null
  }
  if (!isInside(root, file)) return null
  return { file, path, contentType: BRAND_ASSET_TYPES[extension], isSvg: extension === '.svg' }
}

/** `file` lies strictly under `root` — both real paths, so no link can lead out unseen. */
function isInside(root: string, file: string): boolean {
  const rel = relative(root, file)
  return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)
}
