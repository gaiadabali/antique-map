/**
 * A shop page by its address, in the visitor's language (`pages`, `site: 'shop'`): the home
 * (`home`), partnership (`partnership`), stores (`stores`) or any other page at `/{slug}`. `null`
 * when the CMS holds no such page — the route then shows its honest empty state (the home) or
 * answers 404; there are no built-in words behind it (TASKS.md 27.5.b).
 *
 * **Public read** (`loadShopPage`): `overrideAccess: false`, `_status: 'published'`, `site:
 * 'shop'`, and only the fields a page shows selected; a block's picture is populated with the
 * public-derivative fields alone (`PUBLIC_IMAGE_SELECT` plus provenance), never the staff-only
 * file route; a video's or a PDF's, its type, size, title and description (`PUBLIC_FILE_SELECT`),
 * linked through the public media route, which serves it only while a published page places it. Cached: `'use cache'`, tagged `pages:shop` — a publish, edit or unpublish of a shop
 * page expires it (`@engine/cms` `hooks/pages-invalidate`) — with `cacheLife('hours')` as the
 * backstop. Called only inside a page's render, under the layout's `connection()`, so the build
 * never reads it.
 *
 * **Preview read** (`loadShopPageDraft`): the latest draft, for a signed-in owner or editor in
 * draft mode only (`./preview`) — `overrideAccess: false` with that user, so the collection's own
 * access decides, never this code. Never cached.
 */
import 'server-only'

import { cacheLife } from 'next/cache'
import type { Payload } from 'payload'

import { cacheTags, pagesTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { PUBLIC_FILE_SELECT } from '../../media/public-file'
import { shopOnly } from '@engine/cms-shop/site'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'
import { imageOf } from '../catalogue/images'
import type { ShopPageVM } from './blocks'
import { projectBlocks } from './project'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Who reads drafts: a signed-in staff user (`./preview`), or nobody (the public read). */
export type DraftReader = { readonly user: object } | null

/** One shop page from `payload`: the read the cached loader, the preview and the db test share. */
export async function queryShopPage(
  payload: Payload,
  slug: string,
  locale: SiteLocale,
  reader: DraftReader = null,
): Promise<ShopPageVM | null> {
  if (!SLUG.test(slug)) return null
  const found = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    ...(reader === null ? {} : { draft: true, user: reader.user as never }),
    where: {
      and: [
        ...(reader === null ? [{ _status: { equals: 'published' } }] : []),
        ...[shopOnly(payload, 'pages') ?? []].flat(),
        { slug: { equals: slug } },
      ],
    },
    select: {
      title: true,
      layout: true,
      seo: { title: true, description: true, image: true },
    },
    populate: {
      media: { ...PUBLIC_IMAGE_SELECT, provenance: true, ...PUBLIC_FILE_SELECT },
      categories: { slug: true },
      products: { slug: true },
    },
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

/** The published page, cached. */
export async function loadShopPage(slug: string, locale: SiteLocale): Promise<ShopPageVM | null> {
  'use cache'
  cacheLife('hours')
  cacheTags([pagesTag('shop')])
  return queryShopPage(await cms(), slug, locale)
}

/** The latest draft, for `reader` (a verified staff user in draft mode); never cached. */
export async function loadShopPageDraft(
  slug: string,
  locale: SiteLocale,
  reader: NonNullable<DraftReader>,
): Promise<ShopPageVM | null> {
  return queryShopPage(await cms(), slug, locale, reader)
}
