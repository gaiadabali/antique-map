/**
 * A shop category's own editorial fields (`categories`): its short description, its search-engine
 * title and description, and its cover picture — what the collections index draws on a card and
 * what a category page shares. Public read: `overrideAccess: false`, published only, projected;
 * the cover is the public derivative, never the staff-only file route. Cached under the shop's
 * catalogue tag, which a category's change expires.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { PUBLIC_IMAGE_SELECT } from '../../media/public-image'
import { imageOf } from './images'
import type { CatalogueImage } from './view-models'

export type CategoryDetails = {
  readonly slug: string
  readonly label: string
  readonly description: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly image: CatalogueImage | null
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** Every published category's details in one language. */
export async function categoryDetails(locale: SiteLocale): Promise<readonly CategoryDetails[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('shop')])
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'categories',
    overrideAccess: false,
    where: { _status: { equals: 'published' } },
    select: {
      slug: true,
      label: true,
      description: true,
      seo: { title: true, description: true },
      image: true,
    },
    populate: { media: { ...PUBLIC_IMAGE_SELECT, provenance: true } },
    depth: 1,
    limit: 200,
    locale,
  })
  const details: CategoryDetails[] = []
  for (const doc of docs as unknown as Record<string, unknown>[]) {
    const slug = str(doc.slug)
    const label = str(doc.label)
    if (slug === null || label === null) continue
    const seo = (doc.seo ?? {}) as Record<string, unknown>
    details.push({
      slug,
      label,
      description: str(doc.description),
      seoTitle: str(seo.title),
      seoDescription: str(seo.description),
      image: imageOf(doc.image),
    })
  }
  return details
}
