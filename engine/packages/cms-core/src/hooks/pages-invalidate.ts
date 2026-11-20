/**
 * A page's change expires what its site showed of it: `pages:<site>`, through `@engine/cache`'s
 * `invalidate(tags)` — after the commit. Every save that touches published state expires it: a
 * publish, an edit of a published page, an unpublish, a delete; a page moved from one site to the
 * other expires both. A CMS whose pages carry no `site` (one site per database, PLAN-V2 §2) names
 * its site once: `pagesInvalidation('shop')`.
 */
import { invalidate, pagesTag, type TagSite } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { changedPublishedState } from './published-state'

type PageDoc = { site?: unknown; _status?: unknown } | null | undefined

export function pagesInvalidation(site?: TagSite): {
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  const siteOf = (doc: PageDoc): TagSite | null =>
    doc?.site === 'gallery' || doc?.site === 'shop' ? doc.site : (site ?? null)

  return {
    afterChange: async (args) => {
      if (!(await changedPublishedState(args))) return args.doc
      const sites = new Set([siteOf(args.doc as PageDoc), siteOf(args.previousDoc as PageDoc)])
      sites.delete(null)
      invalidate(
        [...sites].map((each) => pagesTag(each as TagSite)),
        args.context,
      )
      return args.doc
    },
    afterDelete: ({ doc, context }) => {
      const at = siteOf(doc as PageDoc)
      if (at !== null && (doc as PageDoc)?._status !== 'draft') invalidate([pagesTag(at)], context)
      return doc
    },
  }
}
