/**
 * The shop page (6.1.b; TASKS.md 28.2): every published product, sort and page in the URL. The whole
 * shop's first page starts with "Shop by" — best sellers, themes, product types, wall decor — and
 * the same-day promise; `?subject=` (a theme) and `?productType=` (a set) narrow it to a theme, the best sellers or wall
 * decor (`../sites/shop/sections/links`). An unknown theme is a 404, never an empty listing.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { categories, listing, type ListingOptions } from '../server/shop/catalogue'
import { themeBySlug, wallDecorCategoryIds } from '../server/shop/catalogue/shop-by'
import { sectionsText } from '../sites/shop/sections/copy'
import { shopFilterOf, type ShopFilter } from '../sites/shop/sections/links'
import { PromoBanner } from '../sites/shop/sections/promo'
import { ShopByRails } from '../sites/shop/sections/shop-by-rails'
import type { ListingSort } from '../server/shop/catalogue/queries'
import { browseText } from '../sites/shop/browse/copy'
import { BrowseView } from '../sites/shop/browse/browse-view'
import { currentSite, siteHref } from '../shell/site'
import { siteLocale } from '../shell/messages'
import { pageMetadata } from '@engine/site/seo'
import type { ListingProps } from './props'

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

export async function generateMetadata({ params }: ListingProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const text = browseText(locale)
  const href = siteHref('shop')
  return pageMetadata({
    site: 'shop',
    locale,
    paths: { en: href('browse', {}, 'en'), id: href('browse', {}, 'id') },
    title: text('browse.title'),
    description: text('browse.description'),
    origin: site.origin,
  })
}

/** What a filter narrows the listing to, and the title it gives the page; `null`: no such theme. */
async function narrowed(
  filter: ShopFilter,
  locale: 'en' | 'id',
): Promise<{ readonly options: ListingOptions; readonly title: string } | null> {
  const t = sectionsText(locale)
  if (filter.kind === 'theme') {
    const theme = await themeBySlug(filter.slug, locale)
    return theme === null ? null : { options: { themeId: theme.id }, title: theme.label }
  }
  if (filter.set === 'best-sellers') {
    return { options: { bestSeller: true }, title: t('shopBy.bestSellers') }
  }
  const ids = await wallDecorCategoryIds()
  // No category marked Wall Decor: an empty set, never the whole shop under its name.
  return { options: { categoryIds: ids.length > 0 ? ids : [0] }, title: t('shopBy.wallDecor') }
}

export default async function ShopBrowse({ params, searchParams }: ListingProps) {
  const { locale: raw } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale

  const state = await searchParams
  const text = browseText(locale)
  const filter = shopFilterOf(state) ?? undefined
  const narrow = filter ? await narrowed(filter, locale) : null
  if (filter && narrow === null) notFound()
  const page = pageOf(state.page)
  const [list, allCategories] = await Promise.all([
    listing({ ...narrow?.options, sort: sortOf(state.sort), page }),
    categories(),
  ])
  const t = sectionsText(locale)
  // The whole shop's first page starts with "Shop by"; a narrowed or later page is the listing.
  const intro =
    filter === undefined && page === undefined
      ? { title: t('shopBy.title'), lede: t('shopBy.lede'), rails: <ShopByRails locale={locale} /> }
      : undefined
  return (
    <BrowseView
      listing={list}
      categories={allCategories}
      locale={locale}
      title={narrow?.title ?? text('browse.title')}
      filter={filter}
      intro={intro}
      banner={<PromoBanner locale={locale} />}
    />
  )
}
