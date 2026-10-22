/**
 * The shop's built-in pages (home, partnership, stores) as CMS `pages` records built from blocks,
 * in English and Indonesian, exactly as the site draws them today (`sites/shop/blocks/defaults`).
 * **Seeded once**: a page whose address already exists is left alone — an edited page is the
 * owner's. Unpublished, the site keeps drawing its built-in words. Used by `./cli` (`pnpm
 * data:seed-pages`) and the admin's seed screen.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { reqOf } from '@engine/cms/seed'
import type { Payload } from 'payload'

import { defaultHomeBlocks } from '../../../../sites/shop/blocks/defaults/home'
import { defaultPartnershipBlocks } from '../../../../sites/shop/blocks/defaults/partnership'
import { defaultStoresBlocks } from '../../../../sites/shop/blocks/defaults/stores'
import type { ShopBlockVM } from '../blocks'
import { toCmsLayout, withIdsOf, type SurfaceOf } from './to-cms'

const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string

const SURFACES = ['home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking']

const surfaceOf =
  (locale: SiteLocale): SurfaceOf =>
  (address) =>
    SURFACES.find((surface) => href(surface, {}, locale) === address) ?? null

type BuiltIn = {
  readonly slug: 'home' | 'partnership' | 'stores'
  readonly title: Record<SiteLocale, string>
  readonly blocks: (locale: SiteLocale) => readonly ShopBlockVM[]
}

const PAGES: readonly BuiltIn[] = [
  {
    slug: 'home',
    title: { en: 'Home', id: 'Beranda' },
    blocks: (locale) => defaultHomeBlocks(locale, (surface) => href(surface, {}, locale)),
  },
  {
    slug: 'partnership',
    title: { en: 'Partnership', id: 'Kemitraan' },
    blocks: defaultPartnershipBlocks,
  },
  { slug: 'stores', title: { en: 'Stores', id: 'Toko' }, blocks: defaultStoresBlocks },
]

async function seedPage(
  payload: Payload,
  page: BuiltIn,
  publish: boolean,
  context: Record<string, unknown>,
): Promise<string> {
  const existing = await payload.find({
    collection: 'pages',
    overrideAccess: true,
    draft: true,
    depth: 0,
    limit: 1,
    where: { and: [{ site: { equals: 'shop' } }, { slug: { equals: page.slug } }] },
  })
  if (existing.docs.length > 0) return `${page.slug}: present, left as it is`
  const status = publish ? 'published' : 'draft'
  const created = (await payload.create({
    collection: 'pages',
    locale: 'en',
    draft: !publish,
    data: {
      site: 'shop',
      kind: 'page',
      slug: page.slug,
      title: page.title.en,
      layout: toCmsLayout(page.blocks('en'), surfaceOf('en')),
      _status: status,
    } as never,
    req: reqOf(payload, 'en', context as never),
  })) as unknown as { id: number; layout?: unknown }
  await payload.update({
    collection: 'pages',
    id: created.id,
    locale: 'id',
    draft: !publish,
    data: {
      title: page.title.id,
      layout: withIdsOf(created.layout, toCmsLayout(page.blocks('id'), surfaceOf('id'))),
      _status: status,
    } as never,
    req: reqOf(payload, 'id', context as never),
  })
  return `${page.slug}: created (${status})`
}

/** Every built-in page, one report line each. */
export async function seedShopPages(
  payload: Payload,
  options: { readonly publish: boolean; readonly context: Record<string, unknown> },
): Promise<string[]> {
  const lines: string[] = []
  for (const page of PAGES)
    lines.push(await seedPage(payload, page, options.publish, options.context))
  return lines
}
