/**
 * Applying the products rows (DATA.md §3): a product per row, its variants merged from the rows
 * that name it with `parent_sku` — a variant row without its own price takes the product's, and a
 * variant's `active` stays as the catalogue has it when the file does not say. Only what the row
 * carries and what differs goes into the update; an empty cell never clears a field.
 */
import type { PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import type { UpsertContext, UpsertResult } from './apply'
import { changes } from './diff'
import type { WritableRow } from './plan'
import { nextFreeSlug, slugTaken, slugify } from '../fields/slug'

type Doc = Record<string, unknown> & { id: number }

const idOf = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object' && 'id' in (value as object)) return (value as Doc).id
  return value
}

/** A variant row as it is stored and compared: `active` on, like the collection's default. */
function asVariantRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    sku: row.sku,
    label: row.label,
    ...(row.price === undefined ? {} : { price: row.price }),
    active: true,
  }
}

async function findBySku(ctx: UpsertContext, sku: string): Promise<Doc | undefined> {
  const { docs } = await ctx.payload.find({
    collection: 'products',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    draft: true,
    limit: 1,
    where: { sku: { equals: sku } },
  })
  return docs[0] as Doc | undefined
}

function failure(error: unknown): UpsertResult {
  if (error instanceof ValidationError) {
    const first = error.data?.errors?.[0]
    return {
      outcome: 'rejected',
      problem: {
        column: first?.path,
        problem: String(first?.message ?? 'The row was refused.'),
      },
    }
  }
  throw error
}

export async function applyProductRow(ctx: UpsertContext, planned: WritableRow & { collection: 'products' }): Promise<UpsertResult> {
  const data: Record<string, unknown> = { ...planned.data }

  // A variant row: merge it into its parent's variants, wherever the parent came from.
  if (data.parentSku !== undefined) {
    return applyVariantRow(ctx, planned, data.parentSku as string, data)
  }
  // The link to the original antique: set only while that work is on record (it is optional).
  if (data.relatedStockNumber !== undefined) {
    const stockNumber = data.relatedStockNumber as string
    delete data.relatedStockNumber
    const { docs } = await ctx.payload.find({
      collection: 'works',
      overrideAccess: true,
      req: ctx.req,
      depth: 0,
      limit: 1,
      where: { stockNumber: { equals: stockNumber } },
    })
    if (docs.length > 0) data.relatedWork = docs[0]!.id
  }

  const existing = await findBySku(ctx, planned.key)
  if (!existing) {
    const payloadData: Record<string, unknown> = {
      ...data,
      // The address is made once, here — the collection derives it from the (localised) name,
      // which a Local API create inside an operation does not see.
      slug: await freeSlug(ctx, nameOf(data, planned.key)),
      _status: ctx.publish ? 'published' : 'draft',
    }
    if (ctx.publish && planned.imageFiles && planned.imageFiles.length > 0) {
      // A published product shows its picture: the images go with the publish run (DATA.md §5).
      payloadData.images = await imagesFor(ctx, planned.imageFiles, data)
    }
    try {
      await ctx.payload.create({ collection: 'products', data: payloadData as never, req: ctx.req })
      return { outcome: 'new' }
    } catch (error) {
      return failure(error)
    }
  }

  const incoming: Record<string, unknown> = { ...data }
  if (ctx.publish && existing._status !== 'published') incoming._status = 'published'
  const changed = changes(existing, incoming)
  if (changed.length === 0) return { outcome: 'unchanged', changes: [] }
  const update: Record<string, unknown> = {}
  for (const { column } of changed) update[column] = incoming[column]
  try {
    await ctx.payload.update({ collection: 'products', id: existing.id, data: update as never, req: ctx.req })
    return { outcome: 'updated', changes: changed }
  } catch (error) {
    return failure(error)
  }
}

async function applyVariantRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'products' },
  parentSku: string,
  data: Record<string, unknown>,
): Promise<UpsertResult> {
  const parent = await findBySku(ctx, parentSku)
  if (!parent) {
    return {
      outcome: 'rejected',
      problem: {
        column: 'parent_sku',
        problem: `No product carries the SKU '${parentSku}' — the file needs its product row before the variant's, or the product must be on record already.`,
      },
    }
  }
  const variantSku = data.sku as string
  const existingRows = (parent.variants as Array<Record<string, unknown>> | null) ?? []
  const current = existingRows.find((row) => row.sku === variantSku)
  const row = asVariantRow({
    ...data,
    ...(current?.active === false ? { active: false } : {}),
  })
  const next = [...existingRows.filter((each) => each.sku !== variantSku), row]
  const sameRows =
    existingRows.length === next.length &&
    next.every((each, i) =>
      ['sku', 'label', 'price', 'active'].every(
        (key) => JSON.stringify(each[key] ?? null) === JSON.stringify(existingRows[i]?.[key] ?? null),
      ),
    )
  if (sameRows) return { outcome: 'unchanged', changes: [] }
  try {
    await ctx.payload.update({
      collection: 'products',
      id: parent.id,
      data: { variants: next } as never,
      req: ctx.req,
    })
    return {
      outcome: 'updated',
      changes: [{ column: `variants (${variantSku})`, was: current ? 'a variant of its own' : 'absent', now: 'as the file says' }],
    }
  } catch (error) {
    return failure(error)
  }
}

/** The images a published product shows, as `media` rows keyed by filename. */
async function imagesFor(ctx: UpsertContext, files: readonly string[], data: Record<string, unknown>): Promise<unknown> {
  const { ensureMedia } = await import('./apply-works')
  const name = (data.name as { en?: string } | undefined)?.en ?? 'The product'
  const rows: Array<{ image: number }> = []
  for (const file of files) {
    rows.push({ image: await ensureMedia(ctx, fileNameOf(file), file, name, 'flat') })
  }
  return rows
}

const fileNameOf = (file: string) => file.split(/[\\/]/).pop() ?? file

/** The name a product shows: the default locale's, else the SKU — what the address is made from. */
function nameOf(data: Record<string, unknown>, sku: string): string {
  const name = data.name as { en?: string; id?: string } | undefined
  return name?.en ?? name?.id ?? sku
}

/** The product's free address, made from its name (`-2`, `-3` … when the name repeats). */
async function freeSlug(ctx: UpsertContext, base: string): Promise<string> {
  const candidate = slugify(base)
  const free = await nextFreeSlug(candidate, (slug) =>
    slugTaken({ req: ctx.req, collection: 'products', candidate: slug }),
  )
  return free ?? candidate
}
