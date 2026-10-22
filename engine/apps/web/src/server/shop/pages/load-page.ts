/**
 * A published shop page by its address, in the visitor's language (`pages`, `site: 'shop'`): the
 * home (`home`), partnership (`partnership`), stores (`stores`) or any other page at `/{slug}`.
 * `null` when the CMS holds no published shop page there — the route then draws its built-in
 * words (`sites/shop/blocks/defaults`) or answers 404.
 *
 * Public read: `overrideAccess: false`, `_status: 'published'`, `site: 'shop'`, and only the
 * fields a page shows selected; a block's picture is populated with the public-derivative fields
 * alone (`PUBLIC_IMAGE_SELECT` plus provenance), never the staff-only file route.
 *
 * Cached: `'use cache'`, tagged `pages:shop` — a publish, edit or unpublish of a shop page expires
 * it (`@engine/cms` `hooks/pages-invalidate`) — with `cacheLife('hours')` as the backstop. Called
 * only inside a page's render, under the layout's `connection()`, so the build never reads it.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, pagesTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { PUBLIC_IMAGE_SELECT } from '../../media/public-image'
import { imageOf } from '../catalogue/images'
import type { ShopPageVM } from './blocks'
import { projectBlocks } from './project'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function loadShopPage(slug: string, locale: SiteLocale): Promise<ShopPageVM | null> {
  'use cache'
  cacheLife('hours')
  cacheTags([pagesTag('shop')])
  if (!SLUG.test(slug)) return null
  const payload = await cms()
  const found = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: 'shop' } },
        { slug: { equals: slug } },
      ],
    },
    select: {
      title: true,
      layout: true,
      seo: { title: true, description: true, image: true },
    },
    populate: { media: { ...PUBLIC_IMAGE_SELECT, provenance: true }, categories: { slug: true } },
    depth: 1,
    limit: 1,
    locale,
  })
  const doc = found.docs[0] as Record<string, unknown> | undefined
  if (!doc) return null
  // A block names a surface without params (`browse`, `stores`…); `./project` allows no other.
  const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string
  const seo = (doc.seo ?? {}) as Record<string, unknown>
  const str = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : null)
  return {
    title: str(doc.title) ?? '',
    blocks: projectBlocks(doc.layout, (surface) => href(surface, {}, locale)),
    seoTitle: str(seo.title),
    seoDescription: str(seo.description),
    seoImage: imageOf(seo.image),
  }
}
