/**
 * The media pipeline's one step (TASKS.md 5.2; ARCHITECTURE.md §8; CONTENT-MODEL.md §5): a
 * `media` record's upload, read from the private `uploads/` prefix, published as its derivatives
 * and — a work image longer than the ladder — its capped tiles (`@engine/media/pipeline`), then
 * recorded on the pipeline-only fields the loaders read (`derivatives { status, version,
 * blurDataUri }`, `iiif { status }`). Called after an upload (`./pipeline-hook`) and by the
 * backfill command (`./derivatives-cli`); a jobs task wraps it unchanged once the queue has its
 * table (ARCHITECTURE.md §10).
 *
 * - **Never throws.** A failure is recorded as `failed` — retryable: the backfill picks up every
 *   record not `ready` — and logged with the record's id and asset id only: no file name, which
 *   may name a person, and no bytes.
 * - **Idempotent.** A record already `ready` at the current `DERIVATIVE_VERSION` is left alone
 *   unless forced; the keys are content-addressed, so a rerun overwrites, never adds.
 * - **Never records a superseded file.** The record is written only while its `assetId` is still
 *   the one published: a replacement uploaded meanwhile keeps its own `pending` and its own run.
 * - **Expires what showed the old URL**: the works and products placing the image
 *   (`@engine/cache`), in the caller's collector when it passes one, else after the response.
 */
import { invalidate, productTag, workTag, type CacheTag, type RequestContext } from '@engine/cache'
import { SITES } from '@engine/config/sites'
import { ASSET_ID_PATTERN, DERIVATIVE_VERSION } from '@engine/media/contract'
import {
  publishImage,
  s3PipelineStore,
  UnpublishableImageError,
  type MediaPipelineStore,
  type Published,
} from '@engine/media/pipeline'
import { mediaStorageTarget, UPLOADS_PREFIX } from '@engine/media/storage'
import type { Payload, Where } from 'payload'

/** On a write's `context`: the pipeline's own write, which must not schedule another run. */
export const PIPELINE_CONTEXT_KEY = '@engine/cms:media-pipeline'

export type DeriveOutcome =
  | { readonly status: 'ready'; readonly tiles: 'ready' | 'none'; readonly written: number }
  | { readonly status: 'up-to-date' }
  | {
      readonly status: 'skipped'
      readonly reason: 'not-found' | 'no-file' | 'no-storage' | 'superseded'
    }
  | { readonly status: 'failed'; readonly reason: string }

export type PipelineDeps = {
  /** The media bucket; default: the process's `S3_*` (null while none is configured). */
  readonly store?: MediaPipelineStore | null
  /** `MEDIA_PUBLIC_URL`; default: the process's. */
  readonly mediaPublicUrl?: string
  /** The public long edge; default: the gallery's `publicZoomMaxPx`. */
  readonly publicLongEdge?: number
  /** A caller's collector context (a CLI, a jobs run); none inside a Next request. */
  readonly context?: RequestContext
  /** Rebuild a record already `ready` at the current version. */
  readonly force?: boolean
}

type Doc = Record<string, unknown>
const str = (value: unknown) => (typeof value === 'string' ? value : '')
const group = (value: unknown): Doc =>
  typeof value === 'object' && value !== null ? (value as Doc) : {}

const DEFAULT_LONG_EDGE: number = SITES.gallery.media.publicZoomMaxPx

function storeFromEnv(): MediaPipelineStore | null {
  const target = mediaStorageTarget(process.env)
  return target ? s3PipelineStore(target) : null
}

function publicUrlFromEnv(): string {
  return str(process.env.MEDIA_PUBLIC_URL).trim().replace(/\/+$/, '')
}

/** Whether the record's public objects are built at the current version. */
export function isUpToDate(doc: Doc): boolean {
  const derivatives = group(doc.derivatives)
  const tiles = str(group(doc.iiif).status)
  return (
    derivatives.status === 'ready' &&
    derivatives.version === DERIVATIVE_VERSION &&
    (tiles === 'ready' || tiles === 'none')
  )
}

/** The cache tags of every work and product placing the image. */
async function placingTags(payload: Payload, id: number | string): Promise<CacheTag[]> {
  const where = (path: string): Where => ({ [path]: { equals: id } })
  const [works, products] = await Promise.all([
    payload.find({
      collection: 'works',
      where: where('images.media'),
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      select: { workUid: true },
    }),
    payload.find({
      collection: 'products',
      where: where('images.image'),
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      select: { id: true },
    }),
  ])
  const tags: CacheTag[] = []
  for (const work of works.docs as Doc[]) {
    try {
      tags.push(workTag(str(work.workUid)))
    } catch {
      // A work without a valid uid has no tag and no public page.
    }
  }
  for (const product of products.docs as Doc[]) tags.push(productTag(Number(product.id)))
  return tags
}

/** Writes the pipeline's fields, only while the record still carries `assetId`. */
async function record(
  payload: Payload,
  id: number | string,
  assetId: string,
  data: Doc,
  context: RequestContext | undefined,
): Promise<boolean> {
  const { docs } = await payload.update({
    collection: 'media',
    where: { and: [{ id: { equals: id } }, { assetId: { equals: assetId } }] },
    data: data as never,
    depth: 0,
    overrideAccess: true,
    context: { ...context, [PIPELINE_CONTEXT_KEY]: true },
  })
  return docs.length > 0
}

/** A failure's reason, safe to log: the file name, which may name a person, is masked. */
function reasonOf(error: unknown, filename: string): string {
  const message = error instanceof Error ? error.message : String(error)
  const masked = filename ? message.split(filename).join('<file>') : message
  return masked.slice(0, 300)
}

/** Publishes one record's upload and records the outcome; never throws. */
export async function deriveMedia(
  payload: Payload,
  id: number | string,
  deps: PipelineDeps = {},
): Promise<DeriveOutcome> {
  const doc = (await payload
    .findByID({ collection: 'media', id, depth: 0, overrideAccess: true, disableErrors: true })
    .catch(() => null)) as Doc | null
  if (!doc) return { status: 'skipped', reason: 'not-found' }
  const assetId = str(doc.assetId)
  const filename = str(doc.filename)
  if (!ASSET_ID_PATTERN.test(assetId) || filename === '') {
    return { status: 'skipped', reason: 'no-file' }
  }
  if (!deps.force && isUpToDate(doc)) return { status: 'up-to-date' }

  const store = deps.store === undefined ? storeFromEnv() : deps.store
  const mediaPublicUrl = deps.mediaPublicUrl ?? publicUrlFromEnv()
  if (store === null || mediaPublicUrl === '') return { status: 'skipped', reason: 'no-storage' }

  let published: Published
  try {
    const upload = await store.read(`${str(doc.prefix) || UPLOADS_PREFIX}/${filename}`)
    if (upload === null) throw new Error('the upload is missing from the media bucket')
    published = await publishImage(upload, store, {
      assetId,
      mediaPublicUrl,
      tilesWanted: doc.subject === 'work',
      publicLongEdge: deps.publicLongEdge ?? DEFAULT_LONG_EDGE,
    })
    const recorded = await record(
      payload,
      id,
      assetId,
      {
        derivatives: {
          status: 'ready',
          version: published.version,
          blurDataUri: published.blurDataUri,
        },
        iiif: { status: published.tiles },
      },
      deps.context,
    )
    if (!recorded) return { status: 'skipped', reason: 'superseded' }
  } catch (error) {
    const reason = reasonOf(error, filename)
    payload.logger.error({
      msg: 'media pipeline: derivatives failed',
      mediaId: id,
      assetId,
      retryable: !(error instanceof UnpublishableImageError),
      reason,
    })
    await record(
      payload,
      id,
      assetId,
      {
        derivatives: { status: 'failed', version: null, blurDataUri: null },
        iiif: { status: 'failed' },
      },
      deps.context,
    ).catch(() => false)
    return { status: 'failed', reason }
  }
  // Published and recorded: a cache that cannot be expired now keeps the record ready — the
  // page shows the derivative on its next render, at the latest the next edit or deploy.
  try {
    const tags = await placingTags(payload, id)
    if (tags.length > 0) invalidate(tags, deps.context)
  } catch (error) {
    payload.logger.warn({
      msg: 'media pipeline: the placing records could not be expired',
      mediaId: id,
      assetId,
      reason: reasonOf(error, filename),
    })
  }
  return {
    status: 'ready',
    tiles: published.tiles,
    written: published.derivatives + published.tileFiles,
  }
}
