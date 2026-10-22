/**
 * The catalogue reads behind `CatalogueReader`, through Payload's Local API.
 *
 * - `find()` is a public read: **`overrideAccess: false`** with no user, so Payload applies the
 *   anonymous visitor's access (published works and products, active and listed stores) on top
 *   of the projection's own `_status: 'published'` filter and `select`. A query for `works` or
 *   `products` without that filter is refused here before it runs.
 * - `productsInStock()` is the one server-side read of `stock-levels` (which the public never
 *   reads, CONTENT-MODEL.md §7): it selects only the product of rows with a quantity above zero
 *   at an active store, and returns a yes or no per product — never a quantity or a store.
 */
import 'server-only'

import type { Payload } from '@engine/cms/instance'

import type { CatalogueFind, CatalogueReader } from '../ports'

type LooseFind = (args: Record<string, unknown>) => Promise<{ docs: unknown[] }>

const PUBLISHED_FILTER = '{"_status":{"equals":"published"}}'

export function payloadCatalogue(payload: Payload): CatalogueReader {
  const find = payload.find.bind(payload) as unknown as LooseFind
  return {
    async find(query: CatalogueFind) {
      if (
        query.collection !== 'stores' &&
        !JSON.stringify(query.where).includes(PUBLISHED_FILTER)
      ) {
        throw new Error(`a ${query.collection} read without the published filter was refused`)
      }
      const result = await find({
        collection: query.collection,
        where: query.where,
        select: query.select,
        ...(query.populate ? { populate: query.populate } : {}),
        limit: query.limit,
        locale: query.locale,
        fallbackLocale: 'en',
        depth: query.depth,
        pagination: false,
        overrideAccess: false,
      })
      return result.docs
    },
    async productsInStock(productIds) {
      if (productIds.length === 0) return new Set<string>()
      const result = await find({
        collection: 'stock-levels',
        where: {
          and: [
            { product: { in: productIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id)) } },
            { quantity: { greater_than: 0 } },
            { 'store.active': { equals: true } },
          ],
        },
        select: { product: true },
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
      })
      const stocked = new Set<string>()
      for (const row of result.docs) {
        const product = (row as { product?: unknown }).product
        if (typeof product === 'string' || typeof product === 'number') stocked.add(String(product))
      }
      return stocked
    },
  }
}
