/**
 * The shop's built-in pages (home, partnership, stores, privacy) as CMS `pages` records built from blocks,
 * in English and Indonesian, from their first content (`./content`): the site draws only what the
 * CMS holds (TASKS.md 27.5.b).
 *
 * **Seeded once**: a page whose address already exists is left alone — an edited page is the
 * owner's. Unpublished, the site shows no such page (the home its bare shell, the others a 404)
 * until someone publishes it. Used by `./cli` (`pnpm data:seed-pages`) and the admin's seed
 * screen, which publishes. The one exception is `replaceShopPages` (the seed screen's "Client
 * preview"): it overwrites the shop's Home and Partnership in place, published.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { recordsCarrySite, shopOnly } from '@engine/cms-shop/site'
import { reqOf } from '@engine/cms-shop/seed/req'
import type { Payload } from 'payload'

import { defaultHomeBlocks } from './content/home'
import { defaultPartnershipBlocks } from './content/partnership'
import { defaultPrivacyBlocks } from './content/privacy'
import { defaultStoresBlocks } from './content/stores'
import type { ShopBlockVM } from '../blocks'
import { toCmsLayout, withIdsOf, type SurfaceOf } from './to-cms'

const href = createHref(SITES.shop) as (surface: string, params: object, at: SiteLocale) => string

const SURFACES = ['home', 'browse', 'collection', 'partnership', 'stores', 'search', 'tracking']

const surfaceOf =
  (locale: SiteLocale): SurfaceOf =>
  (address) =>
    SURFACES.find((surface) => href(surface, {}, locale) === address) ?? null

type BuiltIn = {
  readonly slug: 'home' | 'partnership' | 'stores' | 'privacy'
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
    title: { en: 'Collaboration', id: 'Kolaborasi' },
    blocks: defaultPartnershipBlocks,
  },
  { slug: 'stores', title: { en: 'Stores', id: 'Toko' }, blocks: defaultStoresBlocks },
  {
    slug: 'privacy',
    title: { en: 'Privacy policy', id: 'Kebijakan privasi' },
    blocks: defaultPrivacyBlocks,
  },
]

/** The shop's page at `slug`, a draft too. */
async function shopPageAt(payload: Payload, slug: string) {
  return payload.find({
    collection: 'pages',
    overrideAccess: true,
    draft: true,
    depth: 0,
    limit: 1,
    where: { and: [...[shopOnly(payload, 'pages') ?? []].flat(), { slug: { equals: slug } }] },
  })
}

type Write = {
  readonly publish: boolean
  readonly context: Record<string, unknown>
  /** Overwrite the page if it exists (the client preview), keeping its id and address. */
  readonly replace?: boolean
}

async function seedPage(payload: Payload, page: BuiltIn, options: Write): Promise<string> {
  const { publish, context } = options
  const existing = await shopPageAt(payload, page.slug)
  const current = existing.docs[0] as unknown as { id: number } | undefined
  if (current && !options.replace) return `${page.slug}: present, left as it is`
  const status = publish ? 'published' : 'draft'
  const english = {
    title: page.title.en,
    layout: toCmsLayout(page.blocks('en'), surfaceOf('en')),
    _status: status,
  }
  const saved = (current
    ? await payload.update({
        collection: 'pages',
        id: current.id,
        locale: 'en',
        draft: !publish,
        data: english as never,
        req: reqOf(payload, 'en', context as never),
      })
    : await payload.create({
        collection: 'pages',
        locale: 'en',
        draft: !publish,
        data: {
          // Today's one database files a page under its site and kind; the shop's own has neither.
          ...(recordsCarrySite(payload, 'pages') ? { site: 'shop', kind: 'page' } : {}),
          slug: page.slug,
          ...english,
        } as never,
        req: reqOf(payload, 'en', context as never),
      })) as unknown as { id: number; layout?: unknown }
  await payload.update({
    collection: 'pages',
    id: saved.id,
    locale: 'id',
    draft: !publish,
    data: {
      title: page.title.id,
      layout: withIdsOf(saved.layout, toCmsLayout(page.blocks('id'), surfaceOf('id'))),
      _status: status,
    } as never,
    req: reqOf(payload, 'id', context as never),
  })
  return `${page.slug}: ${current ? 'replaced' : 'created'} (${status})`
}

/** Every built-in page, one report line each. */
export async function seedShopPages(payload: Payload, options: Write): Promise<string[]> {
  const lines: string[] = []
  for (const page of PAGES) lines.push(await seedPage(payload, page, options))
  return lines
}

/** The built-in pages the client preview replaces with their current content. */
export const REPLACED_PAGES: readonly BuiltIn['slug'][] = ['home', 'partnership']

/**
 * The client preview's pages: the shop's Home and Partnership overwritten, in place and published,
 * with the current built-in content (their address and id stay, so links to them hold); every
 * other built-in page seeded only where it is missing. No other page is touched, nor the gallery's.
 */
export async function replaceShopPages(
  payload: Payload,
  options: { readonly context: Record<string, unknown> },
): Promise<string[]> {
  const lines: string[] = []
  for (const page of PAGES) {
    const replace = REPLACED_PAGES.includes(page.slug)
    lines.push(await seedPage(payload, page, { publish: true, context: options.context, replace }))
  }
  return lines
}
