/**
 * Applying the products rows (DATA.md §3): a product per row, its variants merged from the rows
 * that name it with `parent_sku` — a variant row without its own price takes the product's, and a
 * variant's `active` stays as the catalogue has it when the file does not say. Only what the row
 * carries and what differs goes into the update; an empty cell never clears a field.
 */
import { ValidationError } from 'payload'

import { freshReq, type UpsertContext, type UpsertResult } from './apply'
import { asEnglish, splitLocales } from './bilingual'
import { changes, same } from './diff'
import type { WritableRow } from './plan'
import { nextFreeSlug, slugTaken, slugify } from '../fields/slug'

type Doc = Record<string, unknown> & { id: number }

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
    req: await freshReq(ctx, 'all'),
    depth: 0,
    draft: true,
    limit: 1,
    locale: 'all',
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

export async function applyProductRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'products' },
): Promise<UpsertResult> {
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
      req: await freshReq(ctx),
      depth: 0,
      limit: 1,
      where: { stockNumber: { equals: stockNumber } },
    })
    if (docs.length > 0) data.relatedWork = docs[0]!.id
  }

  const existing = await findBySku(ctx, planned.key)
  if (!existing) {
    // The default locale's write first, then the Indonesian values (vocabulary.db.test.ts's idiom —
    // the Local API does not take an `{ en, id }` pair on one write).
    const split = splitLocales(data)
    const payloadData: Record<string, unknown> = {
      ...split.en,
      // The address is made once, here — the collection's own hook does not see the
      // (localised) name of a Local API create inside an operation.
      slug: await freeSlug(ctx, nameOf(data, planned.key)),
      _status: ctx.publish ? 'published' : 'draft',
    }
    if (ctx.publish && planned.imageFiles && planned.imageFiles.length > 0) {
      // A published product shows its picture: the images go with the publish run (DATA.md §5).
      payloadData.images = await imagesFor(ctx, planned.imageFiles, data)
    }
    try {
      const created = (await ctx.payload.create({
        collection: 'products',
        data: payloadData as never,
        req: await freshReq(ctx),
      })) as unknown as Doc
      if (Object.keys(split.id).length > 0) {
        await ctx.payload.update({
          collection: 'products',
          id: created.id,
          locale: 'id',
          data: split.id as never,
          req: await freshReq(ctx, 'id'),
        })
      }
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
    const split = splitLocales(update)
    if (Object.keys(split.en).length > 0) {
      await ctx.payload.update({
        collection: 'products',
        id: existing.id,
        data: split.en as never,
        req: await freshReq(ctx),
      })
    }
    if (Object.keys(split.id).length > 0) {
      await ctx.payload.update({
        collection: 'products',
        id: existing.id,
        locale: 'id',
        data: split.id as never,
        req: await freshReq(ctx, 'id'),
      })
    }
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
  const currentIndex = existingRows.findIndex((row) => row.sku === variantSku)
  const current = currentIndex >= 0 ? existingRows[currentIndex] : undefined
  const row = asVariantRow({
    ...data,
    ...(current?.active === false ? { active: false } : {}),
  })
  // The row replaces its variant where it sits; a new one joins at the end. An idempotent
  // re-run must leave the array exactly as it was — never reordered.
  const next =
    currentIndex >= 0
      ? existingRows.map((each, i) => (i === currentIndex ? row : each))
      : [...existingRows, row]
  // Like with like: the writer stores the label's English value only (below), so the sheet's
  // `{ en, id }` pair compares by its English half against the stored English label.
  const sameRows =
    current !== undefined &&
    row.sku === current.sku &&
    same(englishOf(row.label), englishOf(current.label)) &&
    (row.price === undefined || same(row.price ?? null, current.price ?? null)) &&
    row.active === current.active
  if (sameRows) return { outcome: 'unchanged', changes: [] }
  try {
    // The variants go back as one array in the default locale, each label as its English value
    // (an array write is a whole-array write; a second, `locale: 'id'` pass would rebuild the
    // rows). A variant_label_id is honoured by an editor in the CMS, not by the sheet.
    const written = next.map((each) => ({ ...each, label: asEnglish(each.label) }))
    await ctx.payload.update({
      collection: 'products',
      id: parent.id,
      data: { variants: written } as never,
      req: ctx.req,
    })
    return {
      outcome: 'updated',
      changes: [
        {
          column: `variants (${variantSku})`,
          was: current ? 'a variant of its own' : 'absent',
          now: 'as the file says',
        },
      ],
    }
  } catch (error) {
    return failure(error)
  }
}

/** The images a published product shows, as `media` rows keyed by filename. */
async function imagesFor(
  ctx: UpsertContext,
  files: readonly string[],
  data: Record<string, unknown>,
): Promise<unknown> {
  const { ensureMedia } = await import('./apply-works')
  const name = (data.name as { en?: string } | undefined)?.en ?? 'The product'
  const rows: Array<{ image: number }> = []
  for (const file of files) {
    rows.push({ image: await ensureMedia(ctx, fileNameOf(file), file, name, 'product', 'flat') })
  }
  return rows
}

const fileNameOf = (file: string) => file.split(/[\\/]/).pop() ?? file

/** A label's English value: a stored `locale: 'all'` read answers `{ en, id: null }`, a row `{ en, id }`. */
const englishOf = (value: unknown): unknown =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as { en?: unknown }).en
    : value

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
