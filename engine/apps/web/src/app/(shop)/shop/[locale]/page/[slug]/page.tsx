/**
 * The shop's own CMS pages (an about page, delivery and returns, a gift guide…): the proxy rewrites
 * any single public segment no other surface claims here (`parsePublicPath()`'s fallback), and a
 * published shop `pages` record at that address answers, drawn from its sections. The built-in
 * pages' addresses (`home`, `partnership`, `stores`) are theirs alone: their records draw on their
 * own routes, never a second time here.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { createHref, SITES } from '@engine/config/sites'

import { pageMetadata, shareImageOf, trimDescription } from '../../../../../../server/seo'
import type { ShopPageVM } from '../../../../../../server/shop/pages/blocks'
import { loadShopPage } from '../../../../../../server/shop/pages/load-page'
import { siteLocale } from '../../../../../../shell/messages'
import { currentSite } from '../../../../../../shell/site'
import { ShopBlocks } from '../../../../../../sites/shop/blocks/shop-blocks'

const href = createHref(SITES.shop)

/** A page's first paragraph, for a description the editor left empty. */
function firstWords(page: ShopPageVM): string | null {
  for (const block of page.blocks) {
    if (block.type === 'text' || block.type === 'imageText') return block.paragraphs[0] ?? null
    if ('lede' in block && block.lede) return block.lede
    if ('body' in block && typeof block.body === 'string' && block.body) return block.body
  }
  return null
}

/** A page's first picture, for a sharing picture the editor left empty. */
function firstPicture(page: ShopPageVM) {
  for (const block of page.blocks) if (block.type === 'imageText' && block.image) return block.image
  return null
}

/** The built-in pages' records: drawn on their own routes only. */
const BUILT_IN = new Set(['home', 'partnership', 'stores'])

type Props = PageProps<'/shop/[locale]/page/[slug]'>

async function pageOf({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null || BUILT_IN.has(slug)) return null
  const page = await loadShopPage(slug, locale)
  return page === null || page.blocks.length === 0 ? null : { locale, slug, page }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [found, site] = await Promise.all([pageOf(props), currentSite('shop')])
  if (found === null || site.origin === null) return {}
  const { page, locale, slug } = found
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('page', { slug }, 'en'), id: href('page', { slug }, 'id') },
    title: page.seoTitle ?? page.title,
    description: trimDescription(page.seoDescription ?? firstWords(page) ?? page.title),
    image: shareImageOf(page.seoImage ?? firstPicture(page)),
    origin: site.origin,
  })
}

export default async function ShopCmsPage(props: Props) {
  await connection()
  const found = await pageOf(props)
  if (found === null) notFound()
  return (
    <ShopBlocks
      blocks={found.page.blocks}
      locale={found.locale}
      frame="page"
      title={found.page.title}
    />
  )
}
