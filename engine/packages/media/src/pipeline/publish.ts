/**
 * Publishing one `media` upload (TASKS.md 5.2; ARCHITECTURE.md §8; SECURITY.md F1, F3, F4): its
 * derivative ladder and blur placeholder, and — for a work image longer than the ladder's top
 * rung — its capped IIIF Level 0 pyramid, written to the public `derivatives/` and `iiif/`
 * prefixes under C9's keys. The upload itself is only read: it stays under the private
 * `uploads/` prefix, and the full-resolution capture in the masters bucket is never touched.
 *
 * - **F1**: the bytes are sniffed here (`./sniff`), and sharp must agree, before anything decodes.
 * - **F3**: every public byte is re-encoded by sharp without metadata — no EXIF, GPS or maker notes.
 * - **Idempotent**: every key is content-addressed (the asset id) and versioned, so a second run
 *   overwrites the same objects with the same bytes and never adds one. `info.json` is written
 *   last, so a viewer never finds a pyramid whose tiles are still on their way.
 *
 * No Payload and no environment here: the store is a port, the caller (`@engine/cms`'s media
 * pipeline) reads the record, the bucket and the public base.
 */
import sharp from 'sharp'

import {
  ASSET_ID_PATTERN,
  BLUR_MAX_WIDTH,
  DERIVATIVE_VERSION,
  DERIVATIVE_WIDTHS,
  iiifPublicKey,
} from '../contract'
import { makeDerivatives } from '../derivatives'
import { makeTiles } from '../tiles'
import { SHARP_FORMAT, sniffImageType } from './sniff'

/** Where the public objects go: the media bucket's writer, refusing loudly. */
export interface PublicImageStore {
  put(key: string, bytes: Uint8Array, contentType: string, cacheControl: string): Promise<void>
}

/** Every public object is content-addressed and versioned: cache it for a year, immutably. */
export const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** The ladder's top rung: an image no longer than this zooms from its largest derivative. */
export const TILE_THRESHOLD_PX: number = Math.max(...DERIVATIVE_WIDTHS)

/** How many objects are written at once. */
const PUT_CONCURRENCY = 8

export type PublishOptions = {
  /** C9 `AssetId`: 32 hex characters, the media record's `assetId`. */
  readonly assetId: string
  /** `MEDIA_PUBLIC_URL`, without a trailing slash: `info.json`'s `id` is built on it. */
  readonly mediaPublicUrl: string
  /** Whether this image may have a deep zoom at all (a work's image). */
  readonly tilesWanted: boolean
  /** The public long edge (`publicZoomMaxPx`): tiles and derivatives stop here. */
  readonly publicLongEdge: number
}

export type Published = {
  readonly version: typeof DERIVATIVE_VERSION
  readonly blurDataUri: string
  /** The image as displayed (orientation applied), before any cap. */
  readonly width: number
  readonly height: number
  readonly derivatives: number
  /** `ready` when a pyramid was written; `none` when the image needs none. */
  readonly tiles: 'ready' | 'none'
  readonly tileFiles: number
}

/** The upload is not an image the pipeline may publish: retrying cannot help. */
export class UnpublishableImageError extends Error {
  override readonly name = 'UnpublishableImageError'
}

const CONTENT_TYPE = { avif: 'image/avif', webp: 'image/webp' } as const

async function putAll(
  store: PublicImageStore,
  objects: readonly { key: string; bytes: Uint8Array; contentType: string }[],
): Promise<void> {
  for (let at = 0; at < objects.length; at += PUT_CONCURRENCY) {
    await Promise.all(
      objects
        .slice(at, at + PUT_CONCURRENCY)
        .map((o) => store.put(o.key, o.bytes, o.contentType, PUBLIC_CACHE_CONTROL)),
    )
  }
}

/** The displayed size of a source: EXIF orientations 5–8 swap its axes. */
async function displayedSize(input: Buffer, expected: string) {
  const meta = await sharp(input).metadata()
  if (meta.format !== expected) {
    throw new UnpublishableImageError(`the bytes decode as ${meta.format}, not ${expected}`)
  }
  if (!meta.width || !meta.height) throw new UnpublishableImageError('the image has no size')
  const swapped = meta.orientation !== undefined && meta.orientation >= 5
  return swapped
    ? { width: meta.height, height: meta.width }
    : { width: meta.width, height: meta.height }
}

async function blurPlaceholder(input: Buffer): Promise<string> {
  const bytes = await sharp(input)
    .rotate()
    .resize({ width: BLUR_MAX_WIDTH, height: BLUR_MAX_WIDTH, fit: 'inside' })
    .webp({ quality: 40 })
    .toBuffer()
  return `data:image/webp;base64,${bytes.toString('base64')}`
}

/** The capped pyramid: tiles, then `info.json` with its `id` at its public address. */
async function publishTiles(
  input: Buffer,
  store: PublicImageStore,
  options: PublishOptions,
): Promise<number> {
  const capped = await sharp(input)
    .rotate()
    .resize({
      width: options.publicLongEdge,
      height: options.publicLongEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 1 })
    .toBuffer()
  const { files, info } = await makeTiles(capped, { iiifId: options.assetId })
  const root = iiifPublicKey(options.assetId)
  const infoKey = `${root}/info.json`
  const tiles = files.filter((file) => file.key !== infoKey)
  for (const tile of tiles) {
    if (!tile.key.startsWith(`${root}/`) || !tile.key.endsWith('.jpg')) {
      throw new Error(`the tiler wrote an unexpected file: ${tile.key}`)
    }
  }
  await putAll(
    store,
    tiles.map((tile) => ({ key: tile.key, bytes: tile.bytes, contentType: 'image/jpeg' })),
  )
  const published = {
    ...(info as Record<string, unknown>),
    id: `${options.mediaPublicUrl}/${root}`,
  }
  await store.put(
    infoKey,
    Buffer.from(JSON.stringify(published)),
    'application/json',
    PUBLIC_CACHE_CONTROL,
  )
  return tiles.length + 1
}

/** Renders and writes one upload's public objects; throws on any failure, writing nothing more. */
export async function publishImage(
  upload: Uint8Array,
  store: PublicImageStore,
  options: PublishOptions,
): Promise<Published> {
  if (!ASSET_ID_PATTERN.test(options.assetId)) {
    throw new UnpublishableImageError('the record has no content address')
  }
  if (!/^https?:\/\/\S+[^/]$/.test(options.mediaPublicUrl)) {
    throw new Error('the public media URL must be an http(s) URL without a trailing slash')
  }
  const type = sniffImageType(upload)
  if (type === null) throw new UnpublishableImageError('not a JPEG, PNG, WebP or AVIF image')
  const input = Buffer.from(upload.buffer, upload.byteOffset, upload.byteLength)
  const { width, height } = await displayedSize(input, SHARP_FORMAT[type])

  const derivatives = await makeDerivatives(input, {
    id: options.assetId,
    maxLongEdge: options.publicLongEdge,
  })
  await putAll(
    store,
    derivatives.map((d) => ({ key: d.key, bytes: d.bytes, contentType: CONTENT_TYPE[d.format] })),
  )
  const blurDataUri = await blurPlaceholder(input)

  const wantsTiles = options.tilesWanted && Math.max(width, height) > TILE_THRESHOLD_PX
  const tileFiles = wantsTiles ? await publishTiles(input, store, options) : 0
  return {
    version: DERIVATIVE_VERSION,
    blurDataUri,
    width,
    height,
    derivatives: derivatives.length,
    tiles: wantsTiles ? 'ready' : 'none',
    tileFiles,
  }
}
