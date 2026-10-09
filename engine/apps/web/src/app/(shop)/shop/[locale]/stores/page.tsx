/** The shop's stores page (13.2): every listed store by area, from the public projection. */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { listedStores } from '../../../../../server/shop/stores'
import { pageMetadata } from '../../../../../server/seo'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, siteHref } from '../../../../../shell/site'
import { storesText } from '../../../../../sites/shop/stores/copy'
import { StoresView } from '../../../../../sites/shop/stores/stores-view'

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/stores'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const t = storesText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('stores', {}, 'en'), id: href('stores', {}, 'id') },
    title: t('stores.title'),
    description: t('stores.description'),
    origin: site.origin,
  })
}

export default async function StoresPage({ params }: PageProps<'/shop/[locale]/stores'>) {
  // Request time, as the shop's other dynamic pages: the layout's own `connection()` does not hold
  // this page back (shell/site.ts).
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  return <StoresView groups={await listedStores(locale)} locale={locale} />
}
