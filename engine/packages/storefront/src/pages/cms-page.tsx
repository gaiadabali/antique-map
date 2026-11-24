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

import { pageMetadata, shareImageOf, trimDescription } from '@engine/site/seo'
import { siteLocale } from '../shell/messages'
import { currentSite } from '../shell/site'
import { firstPicture, firstWords, readShopPage } from '../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../sites/shop/blocks/shop-blocks'
import type { SlugProps } from './props'

const href = createHref(SITES.shop)

/** The named pages' records: drawn on their own routes only. */
const BUILT_IN = new Set(['home', 'partnership', 'stores'])

type Props = SlugProps

async function pageOf({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null || BUILT_IN.has(slug)) return null
  // Published, or a signed-in staff member's draft in preview (TASKS.md 27.5.a).
  const { page } = await readShopPage(slug, locale)
  return page === null ? null : { locale, slug, page }
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
