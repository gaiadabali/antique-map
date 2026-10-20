/**
 * The shop home's bridge to the originals (the redesign of 2026-10-20): two of the gallery's own
 * published works with a picture, shown where the handoff drew "an original in the collection" —
 * real antiques the prints are made from, not a stand-in. Maps first (the shop's line is "every
 * print begins with a map we hold"), then any other work.
 *
 * Public read in the gallery catalogue's style: `overrideAccess: false` (the anonymous visitor),
 * `_status: 'published'`, ids only, then the catalogue's `projectCards`, which never selects a
 * price or a buyer. Cached for hours under the gallery's catalogue tag and each work's own tag;
 * only called inside the home's render, so the build never touches the database.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { projectCards } from '../../gallery/catalogue/projection'
import type { WorkCardVM } from '../../gallery/catalogue/view-models'

/** Enough of the newest to find two pictured maps (cached for hours, so the scan is rare). */
const SCAN = 40
const WANT = 2

export type OriginalVM = {
  readonly title: string
  readonly date: string | null
  readonly maker: string | null
  readonly image: NonNullable<WorkCardVM['image']>
}

export async function loadOriginals(locale: SiteLocale): Promise<readonly OriginalVM[]> {
  'use cache'
  cacheLife('hours')
  const payload = await cms()
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    limit: SCAN,
    sort: '-updatedAt',
    where: { _status: { equals: 'published' } },
    select: { id: true },
  })
  const cards = await projectCards(
    payload,
    found.docs.flatMap((work) => (typeof work.id === 'number' ? [work.id] : [])),
    locale,
    '',
  )
  const pictured = cards.filter((card) => card.image !== null)
  const isMap = (card: WorkCardVM) => /map|kaart|peta|chart/i.test(card.objectType ?? card.title)
  const chosen = [...pictured.filter(isMap), ...pictured.filter((card) => !isMap(card))].slice(
    0,
    WANT,
  )
  cacheTags([
    catalogueTag('gallery'),
    ...chosen.flatMap((card) => (card.workUid ? [workTag(card.workUid)] : [])),
  ])
  return chosen.map((card) => ({
    title: card.title,
    date: card.date || null,
    maker: card.maker?.name ?? null,
    image: card.image as NonNullable<WorkCardVM['image']>,
  }))
}
