/** Shop all (6.1.b): the browse listing over every published product, sort and page in the URL. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { categories, listing } from '../../../../../server/shop/catalogue'
import type { ListingSort } from '../../../../../server/shop/catalogue/queries'
import { browseText } from '../../../../../sites/shop/browse/copy'
import { BrowseView } from '../../../../../sites/shop/browse/browse-view'
import { currentSite, siteHref } from '../../../../../shell/site'
import { siteLocale } from '../../../../../shell/messages'
import { pageMetadata } from '../../../../../server/seo'

const SORTS: readonly ListingSort[] = ['featured', 'newest', 'priceAsc', 'priceDesc']

/** A search-param value may repeat; the first is the one a visitor links with. */
function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function sortOf(value: string | string[] | undefined): ListingSort | undefined {
  return SORTS.find((sort) => sort === firstOf(value))
}

function pageOf(value: string | string[] | undefined): number | undefined {
  const page = Number(firstOf(value))
  return Number.isInteger(page) && page > 1 ? page : undefined
}

export async function generateMetadata({
  params,
}: PageProps<'/shop/[locale]/shop'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const text = browseText(locale)
  return pageMetadata({
    site: 'shop',
    locale,
    path: siteHref('shop')('browse', {}, locale),
    title: text('browse.title'),
    description: text('browse.description'),
    origin: site.origin,
  })
}

export default async function ShopBrowse({
  params,
  searchParams,
}: PageProps<'/shop/[locale]/shop'>) {
  const { locale: raw } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale

  const state = await searchParams
  const text = browseText(locale)
  const [list, allCategories] = await Promise.all([
    listing({ sort: sortOf(state.sort), page: pageOf(state.page) }),
    categories(),
  ])
  return (
    <BrowseView
      listing={list}
      categories={allCategories}
      locale={locale}
      title={text('browse.title')}
    />
  )
}
