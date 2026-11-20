/**
 * The shop's stores page (13.2; TASKS.md 27.5.b): every listed store by area, from the public
 * projection, inside the CMS's `stores` page — published, or a staff member's draft in preview. No
 * page, no built-in words: a 404.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { pageMetadata, shareImageOf, trimDescription } from '@engine/site/seo'
import { siteLocale } from '../shell/messages'
import { currentSite, siteHref } from '../shell/site'
import { firstPicture, firstWords, readShopPage } from '../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../sites/shop/blocks/shop-blocks'
import type { LocaleProps } from './props'

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const { page } = await readShopPage('stores', locale)
  if (page === null) return {}
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('stores', {}, 'en'), id: href('stores', {}, 'id') },
    title: page.seoTitle ?? page.title,
    description: trimDescription(page.seoDescription ?? firstWords(page) ?? page.title),
    image: shareImageOf(page.seoImage ?? firstPicture(page)),
    origin: site.origin,
  })
}

export default async function StoresPage({ params }: LocaleProps) {
  // Request time, as the shop's other dynamic pages: the layout's own `connection()` does not hold
  // this page back (shell/site.ts).
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  const { page } = await readShopPage('stores', locale)
  if (page === null) notFound()
  return <ShopBlocks blocks={page.blocks} locale={locale} frame="bare" title={page.title} />
}
