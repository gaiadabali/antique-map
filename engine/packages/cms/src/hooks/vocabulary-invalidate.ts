/**
 * A place, maker or term's change expires the gallery's listings (ARCHITECTURE.md §6; CONVENTIONS.md
 * §12): `catalogue:gallery`, through `@engine/cache`'s `invalidate(tags)` — after the commit, never
 * on the spot (see `./work-invalidate`'s header for the two modes). The browse, facets and search
 * are filtered and found by the vocabulary — a place's modern and historical names, the gazetteer's
 * tree, a maker's name and aliases, a subject's label — so a gazetteer or maker edit changes what
 * a listing shows although no work was saved. Without these hooks a renamed place kept its old name
 * on every cached listing until the listing's own expiry.
 *
 * The vocabulary keeps drafts as works do (`../collections/terms/vocabulary/access`), and the
 * listings read published records only: a save that touches no published state — a draft created,
 * a draft saved over a draft — expires nothing, and neither does deleting a draft. Anything else
 * expires the catalogue, a draft saved over a published record included (one recompute, never a
 * stale page).
 *
 * A writer outside a Next request passes its collector on `req.context` (a seed, the importer —
 * `@engine/cache` batch); with none, `after()` throws and the save fails rather than leave a stale
 * listing.
 */
import { catalogueTag, invalidate } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { touchesPublished } from './work-invalidate'

/** What a vocabulary record's change expires: the gallery's listings. */
export const VOCABULARY_TAGS = [catalogueTag('gallery')] as const

type VocabularyDoc = { _status?: unknown } | null | undefined

export const invalidateVocabularyOnChange: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  context,
}) => {
  if (touchesPublished(doc as VocabularyDoc, previousDoc as VocabularyDoc)) {
    invalidate(VOCABULARY_TAGS, context)
  }
  return doc
}

export const invalidateVocabularyOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  // A record never published leaves nothing cached behind; unpublishing it expired the tag then.
  if ((doc as VocabularyDoc)?._status !== 'draft') invalidate(VOCABULARY_TAGS, context)
  return doc
}
