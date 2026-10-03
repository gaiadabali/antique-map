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
import type { Payload } from 'payload'

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

export async function purgeSeed(payload: Payload): Promise<PurgeReport> {
  const refusal = purgeRefusal()
  if (refusal !== null) throw new Error(refusal)
  const { skus, storeCodes } = seedShopKeys()
  const report: PurgeReport = { products: 0, stockLevels: 0, stores: 0 }

  // Stock first (its rows reference the products and stores), then the rows it points at.
  for (const storeCode of storeCodes) {
    const stock = await payload.find({
      collection: 'stock-levels',
      overrideAccess: true,
      depth: 0,
      limit: 1000,
      where: { 'store.code': { equals: storeCode } },
    })
    for (const doc of stock.docs) {
      await payload.delete({
        collection: 'stock-levels',
        id: doc.id as number,
        overrideAccess: true,
      })
      report.stockLevels += 1
    }
  }
  const products = await payload.find({
    collection: 'products',
    overrideAccess: true,
    depth: 0,
    limit: 1000,
    where: { sku: { in: skus } },
  })
  for (const doc of products.docs) {
    await payload.delete({ collection: 'products', id: doc.id as number, overrideAccess: true })
    report.products += 1
  }
  for (const code of storeCodes) {
    const stores = await payload.find({
      collection: 'stores',
      overrideAccess: true,
      depth: 0,
      limit: 10,
      where: { code: { equals: code } },
    })
    for (const doc of stores.docs) {
      await payload.delete({ collection: 'stores', id: doc.id as number, overrideAccess: true })
      report.stores += 1
    }
  }
  return report
}
