/**
 * Applying the stores, stock and discounts rows (DATA.md §3). A store is upserted by its code; a
 * discount by its code. The stock rows are `./apply-stock`'s.
 */
import { ValidationError } from 'payload'

import { splitLocales } from './bilingual'
import { freshReq, type UpsertContext, type UpsertResult } from './apply'
import { applyProductRow } from './apply-products'
import { applyStockRow } from './apply-stock'
import { changes } from './diff'
import type { WritableRow } from './plan'

type Doc = Record<string, unknown> & { id: number }

export function failure(error: unknown): UpsertResult {
  if (error instanceof ValidationError) {
    const first = error.data?.errors?.[0]
    return {
      outcome: 'rejected',
      problem: { column: first?.path, problem: String(first?.message ?? 'The row was refused.') },
    }
  }
  throw error
}

export async function findStore(ctx: UpsertContext, code: string): Promise<Doc | undefined> {
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
