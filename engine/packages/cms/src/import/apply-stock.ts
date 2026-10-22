/**
 * Applying the stock rows (DATA.md §3). A stock row is the physical count on the shelf of one
 * store, product and variant: the store and product are resolved from the codes, the row is
 * written **through the count hook** in the file's transaction (`../collections/stock-levels/count`
 * — `quantity` is the count less the units open orders hold), so a recount never re-sells a held
 * unit. Codes the CMS does not have hold the row — never guessed into a relationship.
 *
 * A stock file is thousands of rows over a few stores and products, and a stock file writes
 * neither: the store and product lookups and each store's stock rows are read once per attempt
 * (one `UpsertContext` — a restarted attempt gets a fresh one) and reused. A stock row this
 * attempt creates joins its store's list, so a later row naming the same shelf finds it.
 */
import { heldUnits } from '../collections/stock-levels/count'
import { failure, findStore } from './apply-shop'
import { freshReq, type UpsertContext, type UpsertResult } from './apply'
import type { WritableRow } from './plan'

type Doc = Record<string, unknown> & { id: number }

/** The product a stock row counts, and the variant of it, or why the row is held. */
type Resolved = {
  readonly doc?: Doc
  readonly variantSku?: string | null
  readonly problem?: UpsertResult & { readonly outcome: 'held' }
}

type Lookups = {
  stores: Map<string, Promise<Doc | undefined>>
  products: Map<string, Promise<Resolved>>
  shelves: Map<number, Promise<Doc[]>>
}

const perAttempt = new WeakMap<UpsertContext, Lookups>()

function lookups(ctx: UpsertContext): Lookups {
  let found = perAttempt.get(ctx)
  if (!found) {
    found = { stores: new Map(), products: new Map(), shelves: new Map() }
    perAttempt.set(ctx, found)
  }
  return found
}

function once<K, V>(map: Map<K, Promise<V>>, key: K, read: () => Promise<V>): Promise<V> {
  let value = map.get(key)
  if (!value) {
    value = read()
    map.set(key, value)
  }
  return value
}

/** Every stock row of one store, read once per attempt. */
async function shelvesOf(ctx: UpsertContext, store: number): Promise<Doc[]> {
  return once(lookups(ctx).shelves, store, async () => {
    const { docs } = await ctx.payload.find({
      collection: 'stock-levels',
      overrideAccess: true,
      req: await freshReq(ctx),
      depth: 0,
      pagination: false,
      where: { store: { equals: store } },
    })
    return [...(docs as Doc[])]
  })
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

  const store = await once(lookups(ctx).stores, data.storeCode, () =>
    findStore(ctx, data.storeCode),
  )
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
  const product = await once(
    lookups(ctx).products,
    `${data.sku}\u0000${data.variantSku ?? ''}`,
    () => resolveProduct(ctx, data.sku, data.variantSku),
  )
  if (product.problem) return product.problem
  // The variant the row counts, per the sheet's columns (CONTENT-MODEL.md §9): `sku` names the
  // product, `variant_sku` the variant — or, when the sheet names the variant in `sku`, its own.
  const variantSku = product.variantSku ?? null

  const shelves = await shelvesOf(ctx, store.id)
  const existing = shelves.find(
    (row) => Number(row.product) === product.doc!.id && (row.variantSku ?? null) === variantSku,
  )

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
      const saved = (await ctx.payload.update({
        collection: 'stock-levels',
        id: existing.id,
        data: write as never,
        req: await freshReq(ctx),
      })) as unknown as Doc
      shelves[shelves.indexOf(existing)] = saved
    } else {
      const created = (await ctx.payload.create({
        collection: 'stock-levels',
        data: write as never,
        req: await freshReq(ctx),
      })) as unknown as Doc
      shelves.push(created)
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
      select: { sku: true },
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
