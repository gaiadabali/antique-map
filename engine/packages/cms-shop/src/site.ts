/**
 * Whether this CMS's records carry `site` — true only in today's one CMS (`@engine/cms`), which
 * holds both sites' records in one table until phase 26; the shop's own database holds the shop
 * alone, with no `site` anywhere (PLAN-V2 §2). The shop's code that once filtered by `site: 'shop'`
 * asks this instead, so the same code serves both configs.
 */
import type { FilterOptions, Payload, Where } from 'payload'

type WithCollections = Pick<Payload, 'collections'> | null | undefined

/** Whether `slug`'s records carry a `site` field in this config. */
export function recordsCarrySite(payload: WithCollections, slug: string): boolean {
  const fields = payload?.collections?.[slug as never]?.config.flattenedFields ?? []
  return fields.some((field) => 'name' in field && field.name === 'site')
}

/** The shop's records of `slug`: `site: shop` where records carry a site, else every record. */
export function shopOnly(payload: WithCollections, slug: string): Where | null {
  return recordsCarrySite(payload, slug) ? { site: { equals: 'shop' } } : null
}

/** A relationship's choices among `pages`: the shop's pages. */
export const shopPagesOnly: FilterOptions = ({ req }) => shopOnly(req.payload, 'pages') ?? true
