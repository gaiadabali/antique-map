/**
 * Search (6.1.b): the words come from the URL, the results stream inside `<Suspense>` so the
 * shell answers first (ARCHITECTURE.md §Rendering). A bare search page answers not-found: the
 * search exists to hold a query.
 */
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'

import { search } from '../../../../../server/shop/catalogue'
import type { ListingSort } from '../../../../../server/shop/catalogue/queries'
import type { ProductCardVM } from '../../../../../server/shop/catalogue/view-models'
import { browseText } from '../../../../../sites/shop/browse/copy'
import { SearchView } from '../../../../../sites/shop/browse/search-view'
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

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/shop/[locale]/search'>): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  // A search page is a query's answer: no query, no page (the body 404s); a query, never indexed.
  const query = firstOf((await searchParams).q)?.trim() ?? ''
  if (query === '') return {}
  const text = browseText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('search', { q: query }, 'en'), id: href('search', { q: query }, 'id') },
    title: `${text('search.title')} “${query}”`,
    description: text('browse.description'),
    origin: site.origin,
    noindex: true,
  })
}

async function Results({
  query,
  locale,
  sort,
}: {
  query: string
  locale: 'en' | 'id'
  sort?: ListingSort
}) {
  const results = await search({ query, locale, sort })
  const href = siteHref('shop')
  return (
    <SearchView
      query={query}
      listing={results}
      locale={locale}
      productHref={(product: ProductCardVM) => href('product', { slug: product.slug }, locale)}
    />
  )
}

export default async function ShopSearch({
  params,
  searchParams,
}: PageProps<'/shop/[locale]/search'>) {
  const { locale: raw } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound()

  const { q, sort } = await searchParams
  const query = firstOf(q)?.trim() ?? ''
  if (query === '') notFound()

  return (
    <Suspense fallback={null}>
      <Results query={query} locale={locale} sort={sortOf(sort)} />
    </Suspense>
  )
}
