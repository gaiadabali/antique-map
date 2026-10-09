/**
 * Deep-zoom tile generation (TASKS.md 5.2.a): a static IIIF Image API 3 Level 0 tile
 * pyramid (512 px tiles), built with sharp into a temp directory, read back into memory
 * and cleaned up. Pure library — the upload hook (a later task) uploads `files` under the
 * keys returned here (public `iiif/` or private `iiif-full/`, the cap between them is the
 * caller's routing, ARCHITECTURE.md §8) and rewrites `info.json`'s `id` to its final URL.
 */
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'

import '../sharp-concurrency'
import sharp from 'sharp'

import { IIIF_TILE_SIZE, iiifPublicKey } from '../contract'

/** One tile (or the pyramid's `info.json`): its key under the pyramid root and its bytes. */
export type TileFile = { key: string; bytes: Buffer }

export type TilesResult = { files: TileFile[]; info: object }

export interface MakeTilesOptions {
  /** The tile edge in px; defaults to the contract's `IIIF_TILE_SIZE` (512). */
  tileSize?: number
  /**
   * The image's content address (`AssetId`). Given, every key is under the contract's
   * `iiifPublicKey(id)` prefix and sharp stamps that pyramid's `id` into `info.json`;
   * without it the keys are the pyramid-relative paths. The caller still points
   * `info.json`'s `id` at its final public URL (`iiifInfoUrl()`) before uploading.
   */
  iiifId?: string
}

/** Depth-first relative paths of every regular file under a directory. */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const child = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(child) : [child]
    }),
  )
  return files.flat()
}

/**
 * Build the Level 0 pyramid for a processed upload. Orientation is baked first, so a
 * portrait source tiles in its displayed shape. Tiles render as JPEG (Level 0 tiles are
 * a delivery format, not an archive — the master holds the pixels); sharp's `skipBlanks`
 * drops tiles of uniform background, which is why `files` may be shorter than the full
 * grid. Never a network call, never a bucket write.
 */
export async function makeTiles(input: Buffer, opts?: MakeTilesOptions): Promise<TilesResult> {
  const temp = await mkdtemp(join(tmpdir(), 'indies-tiles-'))
  try {
    const base = join(temp, 'pyramid')
    const tiler = sharp().tile({
      layout: 'iiif3',
      size: opts?.tileSize ?? IIIF_TILE_SIZE,
      ...(opts?.iiifId !== undefined ? { id: `${opts.iiifId}` } : {}),
    })
    await sharp(input).rotate().pipe(tiler).toFile(base)

    const files: TileFile[] = []
    for (const file of await listFiles(base)) {
      const rel = relative(base, file).split(sep).join('/')
      const bytes = await readFile(file)
      files.push({
        key: opts?.iiifId !== undefined ? `${iiifPublicKey(opts.iiifId)}/${rel}` : rel,
        bytes,
      })
    }
    const infoFile = files.find((f) => f.key.endsWith('/info.json') || f.key === 'info.json')
    if (infoFile === undefined) throw new Error('the pyramid has no info.json')
    return { files, info: JSON.parse(infoFile.bytes.toString('utf8')) as object }
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}
