/**
 * Applying the stores, stock and discounts rows (DATA.md §3). A store is upserted by its code; a
 * discount by its code. A stock row is the physical count on the shelf of one store, product and
 * variant: the store and product are resolved from the codes, the row is written **through the
 * count hook** in the file's transaction (`../collections/stock-levels/count` — `quantity` is the
 * count less the units open orders hold), so a recount never re-sells a held unit. Codes the CMS
 * does not have hold the row — never guessed into a relationship.
 */
import type { PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import { heldUnits } from '../collections/stock-levels/count'
import type { UpsertContext, UpsertResult } from './apply'
import { applyProductRow } from './apply-products'
import { changes } from './diff'
import type { WritableRow } from './plan'

type Doc = Record<string, unknown> & { id: number }

function failure(error: unknown): UpsertResult {
  if (error instanceof ValidationError) {
    const first = error.data?.errors?.[0]
    return {
      outcome: 'rejected',
      problem: { column: first?.path, problem: String(first?.message ?? 'The row was refused.') },
    }
  }
  throw error
}

const idOf = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object' && 'id' in (value as object)) return (value as Doc).id
  return value
}

async function findStore(ctx: UpsertContext, code: string): Promise<Doc | undefined> {
  const { docs } = await ctx.payload.find({
    collection: 'stores',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    limit: 1,
    where: { code: { equals: code } },
  })
  return docs[0] as Doc | undefined
}

/** One stores row: a create, or an update of only what the file changes. */
export async function applyStoreRow(ctx: UpsertContext, planned: WritableRow & { collection: 'stores' }): Promise<UpsertResult> {
  const data: Record<string, unknown> = { ...planned.data }
  const existing = await findStore(ctx, planned.key)
  if (!existing) {
    try {
      await ctx.payload.create({ collection: 'stores', data: data as never, req: ctx.req })
      return { outcome: 'new' }
    } catch (error) {
      return failure(error)
    }
  }
  const changed = changes(existing, data)
  if (changed.length === 0) return { outcome: 'unchanged', changes: [] }
  const update: Record<string, unknown> = {}
  for (const { column } of changed) update[column] = data[column]
  try {
    await ctx.payload.update({ collection: 'stores', id: existing.id, data: update as never, req: ctx.req })
    return { outcome: 'updated', changes: changed }
  } catch (error) {
    return failure(error)
  }
}

/** One stock row, written through the count hook in the file's transaction. */
export async function applyStockRow(ctx: UpsertContext, planned: WritableRow & { collection: 'stock-levels' }): Promise<UpsertResult> {
  const data = planned.data as {
    storeCode: string
    sku: string
    variantSku: string | null
    physicalCount: number
  }

  const store = await findStore(ctx, data.storeCode)
  if (!store) {
    return {
      outcome: 'held',
      problem: {
        column: 'store_code',
        problem: `No store carries the code '${data.storeCode}'.`,
        fix: 'Check the code, or import the store first.',
      },
    }
  }
  const product = await resolveProduct(ctx, data.sku, data.variantSku)
  if (product.problem) return product.problem
  const productId = product.doc!.id
  // The variant the row counts: its own SKU for a variant row, none for a product without variants.
  const variantSku = data.variantSku !== null ? data.sku : null

  const { docs } = await ctx.payload.find({
    collection: 'stock-levels',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    limit: 100,
    where: { and: [{ store: { equals: store.id } }, { product: { equals: productId } }] },
  })
  const existing = (docs as Doc[]).find(
    (row) => (row.variantSku ?? null) === variantSku,
  )

  // The row's quantity as the count hook will store it: the shelf less the units held.
  const transactionID = ctx.req.transactionID ? await ctx.req.transactionID : undefined
  const session = transactionID === undefined ? undefined : ctx.payload.db.sessions?.[transactionID]
  const expected =
    session === undefined
      ? null
      : await heldUnits(ctx.req, session.db as never, {
          store: store.id,
          product: productId,
          variantSku,
        }).then((held) => Math.max(data.physicalCount - held, 0))

  if (existing && expected !== null && Number(existing.quantity) === expected) {
    return { outcome: 'unchanged', changes: [] }
  }
  const write = {
    store: store.id,
    product: productId,
    variantSku,
    physicalCount: data.physicalCount,
  }
  try {
    if (existing) {
      await ctx.payload.update({
        collection: 'stock-levels',
        id: existing.id,
        data: write as never,
        req: ctx.req,
      })
    } else {
      await ctx.payload.create({ collection: 'stock-levels', data: write as never, req: ctx.req })
    }
  } catch (error) {
    return failure(error)
  }
  return {
    outcome: 'updated',
    changes: existing
      ? [{ column: 'physicalCount', was: String(existing.quantity), now: String(expected) }]
      : [],
  }
}

/** The product a stock row counts: by its own SKU, or by a variant's SKU with the row named. */
type Resolved = {
  readonly doc?: Doc
  readonly problem?: UpsertResult & { readonly outcome: 'held' }
}

async function resolveProduct(ctx: UpsertContext, sku: string, variantColumn: string | null): Promise<Resolved> {
  const { docs: own } = await ctx.payload.find({
    collection: 'products',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    draft: true,
    limit: 1,
    where: { sku: { equals: sku } },
  })
  if (own.length > 0) {
    if (variantColumn !== null) {
      return {
        problem: {
          outcome: 'held',
          problem: {
            column: 'variant_sku',
            problem: `'${sku}' is the product's own SKU: leave variant_sku empty.`,
          },
        },
      }
    }
    return { doc: own[0] as Doc }
  }
  // A variant's parent: by the variants' own table — `variants.sku` is not a `where` the Local
  // API answers, and the SKU is the row's own well-formed value.
  const transactionID = ctx.req.transactionID ? await ctx.req.transactionID : undefined
  const session = transactionID === undefined ? undefined : ctx.payload.db.sessions?.[transactionID]
  const escaped = sku.replace(/'/g, "''")
  const raw =
    session === undefined
      ? undefined
      : ((await ctx.payload.db.execute({
          db: session.db as never,
          raw: `SELECT parent_id FROM products_variants WHERE sku = '${escaped}' LIMIT 2`,
        })) as { rows?: Array<{ parent_id: number }> })
  const parents = raw?.rows ?? []
  if (parents.length !== 1) {
    return {
      problem: {
        outcome: 'held',
        problem: {
          column: 'sku',
          problem: `No product and no variant carries the SKU '${sku}'.`,
          fix: 'Check the SKU, or import the product first.',
        },
      },
    }
  }
  const { docs: found } = await ctx.payload.find({
    collection: 'products',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    draft: true,
    limit: 1,
    where: { id: { equals: parents[0]!.parent_id } },
  })
  if (found.length === 0) {
    return {
      problem: {
        outcome: 'held',
        problem: { column: 'sku', problem: `No product and no variant carries the SKU '${sku}'.` },
      },
    }
  }
  if (variantColumn !== null && variantColumn !== sku) {
    return {
      problem: {
        outcome: 'held',
        problem: {
          column: 'variant_sku',
          problem: `variant_sku is '${variantColumn}' but the SKU matched is '${sku}'.`,
        },
      },
    }
  }
  return { doc: found[0] as Doc }
}

/** One discounts row: the owner's codes, upserted by code. */
export async function applyDiscountRow(ctx: UpsertContext, planned: WritableRow & { collection: 'discounts' }): Promise<UpsertResult> {  const data: Record<string, unknown> = { ...planned.data }
  const { docs } = await ctx.payload.find({
    collection: 'discounts',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    limit: 1,
    where: { code: { equals: planned.key } },
  })
  const existing = docs[0] as Doc | undefined
  if (!existing) {
    try {
      await ctx.payload.create({ collection: 'discounts', data: data as never, req: ctx.req })
      return { outcome: 'new' }
    } catch (error) {
      return failure(error)
    }
  }
  const changed = changes(existing, data)
  if (changed.length === 0) return { outcome: 'unchanged', changes: [] }
  const update: Record<string, unknown> = {}
  for (const { column } of changed) update[column] = data[column]
  try {
    await ctx.payload.update({ collection: 'discounts', id: existing.id, data: update as never, req: ctx.req })
    return { outcome: 'updated', changes: changed }
  } catch (error) {
    return failure(error)
  }
}

/** The shop rows: products (`./apply-products`), stores, stock and discounts. */
export async function applyShopRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: string },
): Promise<UpsertResult> {
  if (planned.collection === 'products') return applyProductRow(ctx, planned as never)
  if (planned.collection === 'stores') return applyStoreRow(ctx, planned as never)
  if (planned.collection === 'stock-levels') return applyStockRow(ctx, planned as never)
  return applyDiscountRow(ctx, planned as never)
}
