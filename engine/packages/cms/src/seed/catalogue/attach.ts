/**
 * Placing the pictures and publishing (task 10.6.e). The products import writes drafts without
 * pictures; this step then makes each picture's `media` row with the role and provenance
 * `./images` decided (the importer's own product-image path cannot: it stamps `flat` +
 * `photograph` on every file), puts the pictures on the product in order, and with `publish`
 * saves the product published, which runs its publish checks (CONTENT-MODEL.md §8).
 *
 * Idempotent: a media row is keyed by its file name and never re-made — one an earlier run stored
 * under the extraction's code (`MP.012.webp`) is found by that name and renamed to the product's
 * (`./images` `nameImages`), the same row, so no product loses it; a product whose pictures
 * already match and that is already published is left alone. A product the import did not create
 * (held or rejected) or a picture that cannot be read is reported, never guessed around.
 */
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

import type { File, Payload, RequestContext } from 'payload'

import { reqOf } from '../req'
import type { CatalogueProduct, ProductImage } from './types'

export type AttachReport = {
  /** `media` rows made by this run. */
  mediaCreated: number
  /** Products whose pictures this run set or changed. */
  imagesSet: number
  /** Products this run moved from draft to published. */
  published: number
  /** Why a product or picture was left alone, one line each. */
  held: string[]
}

type Doc = { id: number; _status?: string; images?: Array<{ image?: unknown }> | null }

const idOf = (value: unknown): number | undefined =>
  typeof value === 'object' && value !== null
    ? (value as { id?: number }).id
    : (value as number | undefined)

const MIME: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/** The picture's bytes under the name it is stored by. */
function fileOf(image: ProductImage): File {
  const data = readFileSync(image.path)
  return {
    data,
    name: image.fileName,
    mimetype: MIME[extname(image.path).toLowerCase()] ?? 'application/octet-stream',
    size: data.length,
  }
}

async function mediaNamed(
  payload: Payload,
  filename: string,
  context: RequestContext | undefined,
): Promise<number | null> {
  const found = await payload.find({
    collection: 'media',
    overrideAccess: true,
    req: reqOf(payload, 'en', context),
    depth: 0,
    limit: 1,
    where: { filename: { equals: filename } },
  })
  return (found.docs[0]?.id as number | undefined) ?? null
}

async function ensureMedia(
  payload: Payload,
  image: ProductImage,
  context: RequestContext | undefined,
): Promise<{ id: number; created: boolean }> {
  const named = await mediaNamed(payload, image.fileName, context)
  if (named !== null) return { id: named, created: false }
  const legacy =
    image.legacyFileName === image.fileName
      ? null
      : await mediaNamed(payload, image.legacyFileName, context)
  if (legacy !== null) {
    // The same row under its new name: the stored file is replaced by the same bytes, renamed.
    await payload.update({
      collection: 'media',
      id: legacy,
      data: {} as never,
      file: fileOf(image),
      overwriteExistingFiles: true,
      req: reqOf(payload, 'en', context),
    })
    return { id: legacy, created: false }
  }
  const created = (await payload.create({
    collection: 'media',
    data: {
      alt: image.altEn,
      altSource: 'baseline',
      subject: 'product',
      role: image.role,
      provenance: image.provenance,
    } as never,
    file: fileOf(image),
    req: reqOf(payload, 'en', context),
  })) as unknown as { id: number }
  await payload.update({
    collection: 'media',
    id: created.id,
    locale: 'id',
    data: { alt: image.altId, translationStatus: 'machine' } as never,
    req: reqOf(payload, 'id', context),
  })
  return { id: created.id, created: true }
}

export async function attachImages(
  payload: Payload,
  products: readonly CatalogueProduct[],
  options: { publish: boolean; context?: RequestContext | undefined },
): Promise<AttachReport> {
  const { context } = options
  const report: AttachReport = { mediaCreated: 0, imagesSet: 0, published: 0, held: [] }
  for (const product of products) {
    const { docs } = await payload.find({
      collection: 'products',
      overrideAccess: true,
      req: reqOf(payload, 'en', context),
      depth: 0,
      draft: true,
      limit: 1,
      where: { sku: { equals: product.sku } },
    })
    const doc = docs[0] as unknown as Doc | undefined
    if (!doc) {
      report.held.push(`${product.sku}: the import did not create it, so it has no pictures yet`)
      continue
    }
    const ids: number[] = []
    try {
      for (const image of product.images) {
        const media = await ensureMedia(payload, image, context)
        if (media.created) report.mediaCreated += 1
        ids.push(media.id)
      }
    } catch (error) {
      report.held.push(
        `${product.sku}: ${error instanceof Error ? error.message : 'a picture failed'}`,
      )
      continue
    }
    const current = (doc.images ?? []).map((row) => idOf(row.image))
    const same = current.length === ids.length && ids.every((id, index) => id === current[index])
    const publishing = options.publish && doc._status !== 'published'
    if (same && !publishing) continue
    try {
      await payload.update({
        collection: 'products',
        id: doc.id,
        data: {
          ...(same ? {} : { images: ids.map((image) => ({ image })) }),
          ...(publishing ? { _status: 'published' } : {}),
        } as never,
        req: reqOf(payload, 'en', context),
      })
    } catch (error) {
      report.held.push(
        `${product.sku}: ${error instanceof Error ? error.message : 'the save failed'}`,
      )
      continue
    }
    if (!same) report.imagesSet += 1
    if (publishing) report.published += 1
  }
  return report
}
