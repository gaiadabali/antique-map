/**
 * The gallery home's "Recently placed" band (14.3): the three works most recently marked sold.
 *
 * Public read, in the catalogue's own style (`../catalogue/catalogue`): `overrideAccess: false`
 * so it runs as the anonymous visitor, `_status: 'published'` AND `status: 'sold'`, and the
 * query selects ids only — the cards are then projected by the catalogue's `projectCards`, which
 * never selects a price (the gallery shows none) nor a buyer. A sold work is "Sold" and nothing
 * more.
 *
 * Cached: `'use cache'`, `cacheLife('hours')`, tagged with the gallery's catalogue tag (a work
 * newly marked sold carries no tag this entry knows) and each shown work's own `workTag`. Only
 * called inside the home page's render, so the build never touches the database.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { projectCards } from '../catalogue/projection'
import type { WorkCardVM } from '../catalogue/view-models'

const LIMIT = 3

/** The date a card shows when a work's date was left unknown — the catalogue's own words. */
const UNKNOWN_DATE: Record<SiteLocale, string> = {
  en: 'Date unknown',
  id: 'Tanggal tidak diketahui',
}

export async function loadRecentlyPlaced(locale: SiteLocale): Promise<readonly WorkCardVM[]> {
  'use cache'
  cacheLife('hours')
  const payload = await cms()
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    limit: LIMIT,
    sort: '-updatedAt',
    where: { and: [{ _status: { equals: 'published' } }, { status: { equals: 'sold' } }] },
    select: { id: true },
  })
  const cards = await projectCards(
    payload,
    found.docs.flatMap((work) => (typeof work.id === 'number' ? [work.id] : [])),
    locale,
    UNKNOWN_DATE[locale],
  )
  cacheTags([
    catalogueTag('gallery'),
    ...cards.flatMap((card) => (card.workUid ? [workTag(card.workUid)] : [])),
  ])
  return cards
}
