/**
 * The shop page's "Shop by" reads (TASKS.md 28.2; the owner's feedback of 2026-11-19): the themes
 * (Bali, Java, Botanicals…) in the owner's order, a theme by its slug, and the categories marked
 * Wall Decor. Public reads of published records only — `overrideAccess: false`,
 * `_status: 'published'` — each `select`ing the fields shown; cached under the shop's catalogue
 * tag, which a theme's or a category's change expires. The products in each are the listing's own
 * read (`./catalogue` `listing()`), so their availability stays live.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'

import { imageOf } from './images'
import { listProducts } from './queries'
import type { CatalogueImage } from './view-models'

const CATALOGUE = catalogueTag('shop')

/** A theme as the shop page shows it: its name, its address and its cover (or first product's). */
export type ThemeVM = {
  readonly id: number
  readonly slug: string
  readonly label: string
  readonly image: CatalogueImage | null
}

type ThemeDoc = { id: number; slug?: unknown; label?: unknown; image?: unknown }

function themeOf(doc: ThemeDoc, fallback: CatalogueImage | null): ThemeVM | null {
  if (typeof doc.slug !== 'string' || typeof doc.label !== 'string' || doc.label.trim() === '') {
    return null
  }
  return { id: doc.id, slug: doc.slug, label: doc.label, image: imageOf(doc.image) ?? fallback }
}

/**
 * The published themes that hold a published product, in the order the owner dragged them; a
 * theme without its own cover shows its newest product's picture.
 */
export async function themes(locale: SiteLocale): Promise<readonly ThemeVM[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'themes',
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
    where: { _status: { equals: 'published' } },
    select: { slug: true, label: true, image: true },
    populate: { media: { ...PUBLIC_IMAGE_SELECT, provenance: true } },
    sort: '_order',
    limit: 100,
    depth: 1,
  } as never)
  const found = await Promise.all(
    (docs as unknown as readonly ThemeDoc[]).map(async (doc) => {
      const { items, total } = await listProducts(payload, { themeId: doc.id, pageSize: 1 })
      return total > 0 ? themeOf(doc, items[0]?.image ?? null) : null
    }),
  )
  return found.filter((theme): theme is ThemeVM => theme !== null)
}

/** The published theme a shop page's `?theme=` names, or `null`. */
export async function themeBySlug(
  slug: string,
  locale: SiteLocale,
): Promise<{ readonly id: number; readonly label: string } | null> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'themes',
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    select: { label: true },
    limit: 1,
    depth: 0,
  } as never)
  const doc = (docs as unknown as readonly { id: number; label?: unknown }[])[0]
  return doc && typeof doc.label === 'string' ? { id: doc.id, label: doc.label } : null
}

/** The ids of the published categories the owner marked Wall Decor. */
export async function wallDecorCategoryIds(): Promise<readonly number[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'categories',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { wallDecor: { equals: true } }] },
    select: { id: true },
    limit: 100,
    depth: 0,
  } as never)
  return (docs as unknown as readonly { id: number }[]).map((doc) => doc.id)
}
