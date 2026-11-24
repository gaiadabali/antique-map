/** The collections index (13.1): every category with products, as a grid of matted lead pictures. */
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import type { Metadata } from 'next'

import { collections } from '../server/shop/catalogue/collections'
import { collectionsText } from '../sites/shop/collections/copy'
import { CollectionsView } from '../sites/shop/collections/collections-view'
import { currentSite, siteHref } from '../shell/site'
import { siteLocale } from '../shell/messages'
import { pageMetadata } from '@engine/site/seo'
import type { LocaleProps } from './props'

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const text = collectionsText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('collection', {}, 'en'), id: href('collection', {}, 'id') },
    title: text('collections.title'),
    description: text('collections.lede'),
    origin: site.origin,
  })
}

export default async function CollectionsPage({ params }: LocaleProps) {
  // The cached read touches the CMS, so the page waits for a request, never the build.
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  return <CollectionsView collections={await collections()} locale={locale} />
}
