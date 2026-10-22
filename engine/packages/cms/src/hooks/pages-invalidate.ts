/**
 * A page's change expires what its site showed of it: `pages:<site>`, through `@engine/cache`'s
 * `invalidate(tags)` — after the commit (see `./work-invalidate`'s header). Every save that touches
 * published state expires it: a publish, an edit of a published page, an unpublish, a delete; a
 * page moved from one site to the other expires both.
 */
import { invalidate, pagesTag, type TagSite } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { changedPublishedState } from './published-state'

type PageDoc = { site?: unknown; _status?: unknown } | null | undefined

const siteOf = (doc: PageDoc): TagSite | null =>
  doc?.site === 'gallery' || doc?.site === 'shop' ? doc.site : null

export const invalidatePagesOnChange: CollectionAfterChangeHook = async (args) => {
  if (!(await changedPublishedState(args))) return args.doc
  const sites = new Set([siteOf(args.doc as PageDoc), siteOf(args.previousDoc as PageDoc)])
  sites.delete(null)
  invalidate(
    [...sites].map((site) => pagesTag(site as TagSite)),
    args.context,
  )
  return args.doc
}

export const invalidatePagesOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  const site = siteOf(doc as PageDoc)
  if (site !== null && (doc as PageDoc)?._status !== 'draft') invalidate([pagesTag(site)], context)
  return doc
}
