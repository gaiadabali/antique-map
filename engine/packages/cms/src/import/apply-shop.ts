/**
 * Applying the stores, stock and discounts rows (DATA.md §3). A store is upserted by its code; a
 * discount by its code. A stock row is the physical count on the shelf of one store, product and
 * variant: the store and product are resolved from the codes, the row is written **through the
 * count hook** in the file's transaction (`../collections/stock-levels/count` — `quantity` is the
 * count less the units open orders hold), so a recount never re-sells a held unit. Codes the CMS
 * does not have hold the row — never guessed into a relationship.
 */
import { ValidationError } from 'payload'

import { heldUnits } from '../collections/stock-levels/count'
import { splitLocales } from './bilingual'
import { freshReq, type UpsertContext, type UpsertResult } from './apply'
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

async function findStore(ctx: UpsertContext, code: string): Promise<Doc | undefined> {
  const { docs } = await ctx.payload.find({
    collection: 'stores',
    overrideAccess: true,
    req: await freshReq(ctx, 'all'),
    depth: 0,
    limit: 1,
    locale: 'all',
    where: { code: { equals: code } },
  })
  return docs[0] as Doc | undefined
}

/** One stores row: a create, or an update of only what the file changes. */
export async function applyStoreRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'stores' },
): Promise<UpsertResult> {
  const data: Record<string, unknown> = { ...planned.data }
  const existing = await findStore(ctx, planned.key)
  // The hours are localised, so the write splits: the default locale's first, then the
  // Indonesian values (vocabulary.db.test.ts's idiom).
  const split = splitLocales(data)
  if (!existing) {
    try {
      const created = (await ctx.payload.create({
        collection: 'stores',
        data: split.en as never,
        req: await freshReq(ctx),
      })) as unknown as Doc
      if (Object.keys(split.id).length > 0) {
        await ctx.payload.update({
          collection: 'stores',
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
  const changed = changes(existing, data)
  if (changed.length === 0) return { outcome: 'unchanged', changes: [] }
  const update: Record<string, unknown> = {}
  for (const { column } of changed) update[column] = data[column]
  try {
    const splitUpdate = splitLocales(update)
    if (Object.keys(splitUpdate.en).length > 0) {
      await ctx.payload.update({
        collection: 'stores',
        id: existing.id,
        data: splitUpdate.en as never,
        req: await freshReq(ctx),
      })
    }
    if (Object.keys(splitUpdate.id).length > 0) {
      await ctx.payload.update({
        collection: 'stores',
        id: existing.id,
        locale: 'id',
        data: splitUpdate.id as never,
        req: await freshReq(ctx, 'id'),
      })
    }
    return { outcome: 'updated', changes: changed }
  } catch (error) {
    return failure(error)
  }
}

/** One stock row, written through the count hook in the file's transaction. */
export async function applyStockRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'stock-levels' },
): Promise<UpsertResult> {
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
  // The variant the row counts, per the sheet's columns (CONTENT-MODEL.md §9): `sku` names the
  // product, `variant_sku` the variant — or, when the sheet names the variant in `sku`, its own.
  const variantSku = product.variantSku ?? null

  const { docs } = await ctx.payload.find({
    collection: 'stock-levels',
    overrideAccess: true,
    req: await freshReq(ctx),
    depth: 0,
    limit: 100,
    where: { and: [{ store: { equals: store.id } }, { product: { equals: product.doc!.id } }] },
  })
  const existing = (docs as Doc[]).find((row) => (row.variantSku ?? null) === variantSku)

  // The row's quantity as the count hook will store it: the shelf less the units held.
  const transactionID = ctx.req.transactionID ? await ctx.req.transactionID : undefined
  const session = transactionID === undefined ? undefined : ctx.payload.db.sessions?.[transactionID]
  const expected =
    session === undefined
      ? null
      : await heldUnits(ctx.req, session.db as never, {
          store: store.id,
          product: product.doc!.id,
          variantSku,
        }).then((held) => Math.max(data.physicalCount - held, 0))

  if (existing && expected !== null && Number(existing.quantity) === expected) {
    return { outcome: 'unchanged', changes: [] }
  }
  const write = {
    store: store.id,
    product: product.doc!.id,
    variantSku,
    physicalCount: data.physicalCount,
  }
  try {
    if (existing) {
      await ctx.payload.update({
        collection: 'stock-levels',
        id: existing.id,
        data: write as never,
        req: await freshReq(ctx),
      })
    } else {
      await ctx.payload.create({
        collection: 'stock-levels',
        data: write as never,
        req: await freshReq(ctx),
      })
    }
  } catch (error) {
    return failure(error)
  }
  if (!existing) return { outcome: 'new' }
  return {
    outcome: 'updated',
    changes: [{ column: 'physicalCount', was: String(existing.quantity), now: String(expected) }],
  }
}

/** The product a stock row counts, and the variant of it, or why the row is held. */
type Resolved = {
  readonly doc?: Doc
  readonly variantSku?: string | null
  readonly problem?: UpsertResult & { readonly outcome: 'held' }
}

const heldSku = (column: string, problem: string, fix?: string): Resolved => ({
  problem: { outcome: 'held', problem: { column, problem, ...(fix ? { fix } : {}) } },
})

/**
 * `sku` names the product and `variant_sku` its variant (the seed's and template's shape); a
 * sheet that names the variant itself in `sku` is accepted too. A code nothing carries holds the
 * row — never guessed into a relationship. The variant's membership of the product is the count
 * hook's check, which refuses with the product's variant SKUs named.
 */
async function resolveProduct(
  ctx: UpsertContext,
  sku: string,
  variantColumn: string | null,
): Promise<Resolved> {
  const read = async (where: Record<string, unknown>) =>
    ctx.payload.find({
      collection: 'products',
      overrideAccess: true,
      req: await freshReq(ctx),
      depth: 0,
      draft: true,
      limit: 2,
      where: where as never,
    })

  // The product by its own SKU, with the row's variant as named.
  const { docs: own } = await read({ sku: { equals: sku } })
  if (own.length === 1) return { doc: own[0] as Doc, variantSku: variantColumn }

  // The variant named in `sku`: the array's field is a `where` the Local API answers.
  const { docs: parents } = await read({ 'variants.sku': { equals: sku } })
  if (parents.length === 1) {
    if (variantColumn !== null && variantColumn !== sku) {
      return heldSku(
        'variant_sku',
        `variant_sku is '${variantColumn}' but the SKU matched is the variant '${sku}'.`,
      )
    }
    return { doc: parents[0] as Doc, variantSku: variantColumn ?? sku }
  }
  const vague =
    own.length > 1 || parents.length > 1 ? ` More than one product carries '${sku}'.` : ''
  return heldSku(
    'sku',
    `No product and no variant carries the SKU '${sku}'.${vague}`,
    'Check the SKU, or import the product first.',
  )
}

/** One discounts row: the owner's codes, upserted by code. */
export async function applyDiscountRow(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'discounts' },
): Promise<UpsertResult> {
  const data: Record<string, unknown> = { ...planned.data }
  const { docs } = await ctx.payload.find({
    collection: 'discounts',
    overrideAccess: true,
    req: await freshReq(ctx),
    depth: 0,
    limit: 1,
    where: { code: { equals: planned.key } },
  })
  const existing = docs[0] as Doc | undefined
  if (!existing) {
    try {
      await ctx.payload.create({
        collection: 'discounts',
        data: data as never,
        req: await freshReq(ctx),
      })
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
    await ctx.payload.update({
      collection: 'discounts',
      id: existing.id,
      data: update as never,
      req: await freshReq(ctx),
    })
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
