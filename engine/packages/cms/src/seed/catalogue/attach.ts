/**
 * Placing the pictures and publishing (task 10.6.e). The products import writes drafts without
 * pictures; this step then makes each picture's `media` row with the role and provenance
 * `./images` decided (the importer's own product-image path cannot: it stamps `flat` +
 * `photograph` on every file), puts the pictures on the product in order, and with `publish`
 * saves the product published, which runs its publish checks (CONTENT-MODEL.md §8).
 *
 * Idempotent: a media row is keyed by its file name and never re-made; a product whose pictures
 * already match and that is already published is left alone. A product the import did not create
 * (held or rejected) or a picture that cannot be read is reported, never guessed around.
 */
import type { Payload, RequestContext } from 'payload'

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

async function ensureMedia(
  payload: Payload,
  image: ProductImage,
  context: RequestContext | undefined,
): Promise<{ id: number; created: boolean }> {
  const found = await payload.find({
    collection: 'media',
    overrideAccess: true,
    req: reqOf(payload, 'en', context),
    depth: 0,
    limit: 1,
    where: { filename: { equals: image.fileName } },
  })
  if (found.docs.length > 0) return { id: found.docs[0]!.id as number, created: false }
  const created = (await payload.create({
    collection: 'media',
    data: {
      alt: image.altEn,
      altSource: 'baseline',
      subject: 'product',
      role: image.role,
      provenance: image.provenance,
    } as never,
    filePath: image.path,
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
