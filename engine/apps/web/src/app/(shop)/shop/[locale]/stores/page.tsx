/**
 * The shop's stores page (13.2): every listed store by area, from the public projection. Its
 * sections are the CMS's published `stores` page, or — until there is one — the directory alone
 * with the lexicon's words (`sites/shop/blocks/defaults/stores`).
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import type { SiteLocale } from '@engine/config/sites'

import { pageMetadata, shareImageOf, trimDescription } from '../../../../../server/seo'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, siteHref } from '../../../../../shell/site'
import { defaultStoresBlocks } from '../../../../../sites/shop/blocks/defaults/stores'
import { pageBlocks } from '../../../../../sites/shop/blocks/page-blocks'
import { ShopBlocks } from '../../../../../sites/shop/blocks/shop-blocks'
import { storesText } from '../../../../../sites/shop/stores/copy'

const storesBlocks = (locale: SiteLocale) =>
  pageBlocks('stores', locale, () => defaultStoresBlocks(locale))

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/stores'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const t = storesText(locale)
  const page = await storesBlocks(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('stores', {}, 'en'), id: href('stores', {}, 'id') },
    title: page.seoTitle ?? t('stores.title'),
    description: trimDescription(page.seoDescription ?? t('stores.description')),
    image: shareImageOf(page.seoImage),
    origin: site.origin,
  })
}

export default async function StoresPage({ params }: PageProps<'/shop/[locale]/stores'>) {
  // Request time, as the shop's other dynamic pages: the layout's own `connection()` does not hold
  // this page back (shell/site.ts).
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  const page = await storesBlocks(locale)
  return <ShopBlocks blocks={page.blocks} locale={locale} frame="bare" />
}
