/**
 * `pnpm data:seed-pages [--publish]` — writes the shop's built-in pages (home, partnership,
 * stores) into the CMS as `pages` records built from blocks, in English and Indonesian, exactly as
 * the site draws them today (`sites/shop/blocks/defaults`), so the owner edits the page as it is
 * rather than an empty one. **Seeded once**: a page whose address already exists is left alone — an
 * edited page is the owner's. Without `--publish` the pages are drafts and the site keeps drawing
 * its built-in words until someone publishes them in the admin.
 *
 * Run through Payload (`payload run`, from the CMS package, which finds the config); the cache tags
 * the writes expire are posted to the running app once the run returns.
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'
import { cliInvalidation, postCliTags } from '@engine/cms/import'
import { reqOf, seedEnv } from '@engine/cms/seed'
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

async function main(): Promise<number> {
  const publish = process.argv.slice(2).includes('--publish')
  seedEnv()
  // Imported after the environment is filled: the config reads it at load time.
  const { cms } = await import('@engine/cms/instance')
  const payload = await cms()
  const batch = cliInvalidation()
  for (const page of PAGES) {
    console.log(await seedPage(payload, page, publish, batch.context() as never))
  }
  console.log(await postCliTags(batch))
  return 0
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  process.exit(await main())
} catch (error: unknown) {
  console.error(error)
  process.exit(1)
}
