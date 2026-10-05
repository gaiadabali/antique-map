/**
 * The seed purge (DATA.md §2): `pnpm data:purge-seed` deletes every row the shop seed layer
 * created — the `SEED-` products, their stock rows and the seed stores — identified by the
 * seed's own committed sheets, so purge and seed always agree on what "seed data" is. The
 * welcome discount is not seed data and stays. It refuses production outright (the codebase's
 * fail-closed env check, as in `db/adapter.ts`): a purge is for a development database being
 * re-freshed, nothing else.
 */
import { fileURLToPath } from 'node:url'

import { readCsv } from '../import/csv'
import { PRODUCT_COLUMNS, STORE_COLUMNS } from '../import/kinds'
import type { Payload, PayloadRequest, Where } from 'payload'

const SHOP_DATA = (file: string) => fileURLToPath(new URL(`./shop/data/${file}`, import.meta.url))

/** The production refusal, or null when the purge may run. `env` is injectable for the tests. */
export function purgeRefusal(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  if (env.NODE_ENV === 'production') {
    return (
      'data:purge-seed is refused in production: it deletes the seed products, stores and ' +
      'stock rows by their SEED- identity, and production data is not seed data.'
    )
  }
  return null
}

export type PurgeReport = {
  products: number
  stockLevels: number
  stores: number
}

/** Reads the seed shop sheets and returns the keys the seed layer created. */
export function seedShopKeys(): {
  skus: readonly string[]
  storeCodes: readonly string[]
} {
  const column = (
    sheet: {
      header: readonly string[]
      rows: ReadonlyArray<{ readonly cells: readonly string[] }>
    },
    name: string,
  ): string[] => {
    const index = sheet.header.indexOf(name)
    return sheet.rows.map((row) => row.cells[index] ?? '')
  }
  const products = readCsv(SHOP_DATA('products.csv'), 'products', PRODUCT_COLUMNS)
  const stores = readCsv(SHOP_DATA('stores.csv'), 'stores', STORE_COLUMNS)
  return {
    skus: [...new Set(column(products, 'sku'))].filter((sku) => sku !== ''),
    storeCodes: [...new Set(column(stores, 'store_code'))].filter((code) => code !== ''),
  }
}

/**
 * One transaction for the whole purge: it lands complete or not at all, and seven thousand
 * stock deletes inside one transaction take a fraction of the time of one transaction each.
 */
export async function purgeSeed(payload: Payload): Promise<PurgeReport> {
  const refusal = purgeRefusal()
  if (refusal !== null) throw new Error(refusal)
  const { skus, storeCodes } = seedShopKeys()
  const transactionID = ((await payload.db.beginTransaction()) ?? undefined) as
    string | number | undefined
  const req = {
    payload,
    user: null,
    locale: 'en',
    headers: new Headers(),
    transactionID,
    t: (key: string) => key,
  } as unknown as PayloadRequest
  try {
    // Stock first (its rows reference the products and stores), then the rows it points at.
    const report: PurgeReport = {
      stockLevels: await purge(req, 'stock-levels', { 'store.code': { in: storeCodes } }),
      products: await purge(req, 'products', { sku: { in: skus } }),
      stores: await purge(req, 'stores', { code: { in: storeCodes } }),
    }
    if (transactionID !== undefined) await payload.db.commitTransaction(transactionID)
    return report
  } catch (error) {
    if (transactionID !== undefined) {
      await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
    }
    throw error
  }
}

/** Deletes every row the `where` finds, in chunks by id, and counts them. */
async function purge(
  req: PayloadRequest,
  collection: 'stock-levels' | 'products' | 'stores',
  where: Where,
): Promise<number> {
  const { payload } = req
  const { docs } = await payload.find({
    collection,
    overrideAccess: true,
    depth: 0,
    pagination: false,
    req,
    where,
  })
  const ids = docs.map((doc) => doc.id as number)
  for (let start = 0; start < ids.length; start += 500) {
    const result = await payload.delete({
      collection,
      overrideAccess: true,
      req,
      where: { id: { in: ids.slice(start, start + 500) } },
    })
    if (result.errors.length > 0) {
      throw new Error(`The purge could not delete ${collection}: ${result.errors[0]!.message}`)
    }
  }
  return ids.length
}
