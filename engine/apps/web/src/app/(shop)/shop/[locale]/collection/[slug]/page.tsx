/** A category page (6.1.b): the browse listing filtered to one published term, by its slug. */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { categories, categoryId, listing } from '../../../../../../server/shop/catalogue'
import type { ListingSort } from '../../../../../../server/shop/catalogue/queries'
import { browseText } from '../../../../../../sites/shop/browse/copy'
import { BrowseView } from '../../../../../../sites/shop/browse/browse-view'
import { currentSite, siteHref } from '../../../../../../shell/site'
import { siteLocale } from '../../../../../../shell/messages'
import { pageMetadata } from '../../../../../../server/seo'

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
}: PageProps<'/shop/[locale]/collection/[slug]'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const slug = (await params).slug
  const [category, text] = await Promise.all([categoryId(slug), browseText(locale)])
  if (category === null) return {}
  const categoriesList = await categories()
  const label = categoriesList.find((each) => each.slug === slug)?.label ?? slug
  return pageMetadata({
    site: 'shop',
    locale,
    path: siteHref('shop')('collection', { slug }, locale),
    title: label,
    description: text('browse.description'),
    origin: site.origin,
  })
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<'/shop/[locale]/collection/[slug]'>) {
  const { locale: raw, slug } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound()

  // An unknown slug is a 404, never an empty listing (the URL is the contract).
  const [id, allCategories] = await Promise.all([categoryId(slug), categories()])
  if (id === null) notFound()
  const category = allCategories.find((each) => each.slug === slug)
  if (category === undefined) notFound()

  const state = await searchParams
  const list = await listing({
    categoryId: id,
    sort: sortOf(state.sort),
    page: pageOf(state.page),
  })
  return (
    <BrowseView
      listing={list}
      categories={allCategories}
      locale={locale}
      categorySlug={slug}
      title={category.label}
    />
  )
}
