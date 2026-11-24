/**
 * What both sites' sitemap sources read with (9.3fix; moved here from today's app, TASKS.md 23.5):
 * every published record of a collection, `overrideAccess: false`, `_status: 'published'`, an
 * explicit `select` of only what a URL and its `<lastmod>` need — never a price, a note or a staff
 * field — and the entry a record makes.
 */
import type { Payload, SelectType, Where } from 'payload'

import type { SitemapEntry } from './sitemap'

export function entryOf(paths: SitemapEntry['paths'], updatedAt?: unknown): SitemapEntry {
  return typeof updatedAt === 'string' ? { paths, lastModified: new Date(updatedAt) } : { paths }
}

export async function findPublished(
  payload: Payload,
  collection: string,
  where: Where | null,
  select: SelectType,
  depth = 0,
): Promise<readonly Record<string, unknown>[]> {
  const published: Where = { _status: { equals: 'published' } }
  const found = await payload.find({
    collection: collection as never,
    overrideAccess: false,
    where: { and: where === null ? [published] : [published, where] },
    select,
    depth,
    limit: 0,
    pagination: false,
  })
  return found.docs as readonly Record<string, unknown>[]
}
