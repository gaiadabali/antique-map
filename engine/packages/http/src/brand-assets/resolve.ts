/**
 * Which file a `/brand-assets/…` request names — or none (C13 `BRAND_ASSET_URL`, TASKS.md 4.1.f).
 * Only a file inside the brand's assets folder, with an extension C1's `BRAND_ASSET_TYPES` lists:
 * a `.` or `..` segment, an empty one, a backslash, a drive letter or a NUL, a dotfile, and
 * anything whose real path leaves the folder — a symbolic link or a junction pointing out — is no
 * asset. The real path obeys the same rules as the URL (senior-be #6): a link *inside* the folder
 * to a dotfile, a hidden folder or a file of another type is no asset either. Each check is a
 * reason to answer 404, never to guess.
 */
import { realpathSync } from 'node:fs'
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

/** A segment a URL — or a real path — may hold: printable, never a dot segment, a dotfile or a separator. */
const SEGMENT = /^(?!\.)[^/\\:\0]+$/

const isSegment = (segment: string) => SEGMENT.test(segment)

/**
 * The asset `segments` name under `assetsDir` — the route's `[...path]`, each segment decoded
 * once by Next — or `null`. Never throws: a folder that does not exist names no asset. Whether it
 * is a regular file is the reader's check, on the descriptor it reads from (`./read`).
 */
export function resolveBrandAsset(
  assetsDir: string,
  segments: readonly string[],
): BrandAsset | null {
  if (segments.length === 0 || !segments.every(isSegment)) return null
  const path = segments.join('/')
  const extension = brandAssetExtension(path)
  if (extension === null) return null
  let root: string
  let file: string
  try {
    // `.native`: the path as the filesystem spells it, so on a case-insensitive disk every
    // spelling of a URL resolves to one file (senior-be #7).
    root = realpathSync.native(assetsDir)
    file = realpathSync.native(join(root, ...segments))
  } catch {
    return null
  }
  const real = relative(root, file)
  if (real === '' || isAbsolute(real) || real === '..' || real.startsWith(`..${sep}`)) return null
  const realSegments = real.split(sep)
  if (!realSegments.every(isSegment)) return null
  if (brandAssetExtension(realSegments.join('/')) !== extension) return null
  return { file, path, contentType: BRAND_ASSET_TYPES[extension], isSvg: extension === '.svg' }
}
