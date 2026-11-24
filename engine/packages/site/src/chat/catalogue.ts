/**
 * The catalogue reads behind `CatalogueReader`, through Payload's Local API (moved from today's app,
 * TASKS.md 23.4: both apps' chats read their own CMS through this).
 *
 * - `find()` is a public read: **`overrideAccess: false`** with no user, so Payload applies the
 *   anonymous visitor's access (published works and products, active and listed stores) on top
 *   of the projection's own `_status: 'published'` filter and `select`. A query for `works` or
 *   `products` without that filter is refused here before it runs.
 * - In a CMS that holds one site's records (`only`, the shop's own — no `site` field anywhere), a
 *   projection's `site` clause for that site is vacuous and is dropped before the read; a clause
 *   naming another site is refused, as a read of records this CMS cannot hold.
 * - `productsInStock()` is the one server-side read of `stock-levels` (which the public never
 *   reads, CONTENT-MODEL.md §7): it selects only the product of rows with a quantity above zero
 *   at an active store, and returns a yes or no per product — never a quantity or a store.
 * - `imageUrl()` is the public image's URL (`../media/public-image`): its largest published
 *   derivative, else the record's own file — as every page's loader chooses it.
 */
import 'server-only'

import type { CatalogueFind, CatalogueReader } from '@engine/chat/server/ports'
import type { SiteKey } from '@engine/config/sites'

import { publicImageUrl } from '../media/public-image'

/** The Local API calls the reader makes, typed by what it reads (the app's own `Payload`). */
export type CatalogueApi = { readonly find: (...args: never[]) => Promise<unknown> }

type LooseFind = (args: Record<string, unknown>) => Promise<{ docs: unknown[] }>
type Where = Record<string, unknown>

const PUBLISHED_FILTER = '{"_status":{"equals":"published"}}'

export type CatalogueOptions = {
  /** The one site this CMS holds, when its records carry no `site` field; else unset. */
  readonly only?: SiteKey
}

/** The site a clause such as `{ site: { equals: 'shop' } }` names, else `null`. */
function siteClause(clause: unknown): string | null {
  if (clause === null || typeof clause !== 'object') return null
  const keys = Object.keys(clause)
  const site = (clause as { site?: { equals?: unknown } }).site
  return keys.length === 1 && typeof site?.equals === 'string' ? site.equals : null
}

/** `where` without its top-level clauses for `only`; throws on a clause naming another site. */
export function scopedWhere(where: Where, only: SiteKey | undefined): Where {
  if (only === undefined) return where
  const named = siteClause(where)
  if (named !== null) {
    if (named !== only)
      throw new Error(`a read of ${named} records was refused in the ${only}'s CMS`)
    return {}
  }
  if (!Array.isArray(where.and)) return where
  const and = (where.and as unknown[]).filter((clause) => {
    const site = siteClause(clause)
    if (site !== null && site !== only) {
      throw new Error(`a read of ${site} records was refused in the ${only}'s CMS`)
    }
    return site === null
  })
  return { ...where, and }
}

export function payloadCatalogue(
  payload: CatalogueApi,
  options: CatalogueOptions = {},
): CatalogueReader {
  const find = (payload.find as unknown as LooseFind).bind(payload)
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
        where: scopedWhere(query.where as Where, options.only),
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
    imageUrl(media) {
      return media !== null && typeof media === 'object'
        ? publicImageUrl(media as Record<string, unknown>)
        : null
    },
  }
}
