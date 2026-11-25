/**
 * The shop page (6.1.b; TASKS.md 28.2; the UI/UX revision of 2026-11-25, a left panel "like
 * Tokopedia"): one view at a time beside the panel, in the owner's order — the best sellers (the
 * shop's own address), Shop by theme, Shop by product type, Wall decor, Shop all with its sort and
 * pages in the URL — and the same-day promise above. `?productType=` names the view and
 * `?subject=` (a theme) narrows the listing to a theme's prints
 * (`../sites/shop/sections/links`). An unknown theme is a 404, never an empty listing.
 */
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import type { Metadata } from 'next'

import { listing, type ListingOptions } from '../server/shop/catalogue'
import { collections } from '../server/shop/catalogue/collections'
import { themeBySlug, themes, wallDecorCategoryIds } from '../server/shop/catalogue/shop-by'
import { sectionsText } from '../sites/shop/sections/copy'
import { shopFilterOf, viewOf, type ShopFilter } from '../sites/shop/sections/links'
import { PromoBanner } from '../sites/shop/sections/promo'
import type { ListingSort } from '../server/shop/catalogue/queries'
import { browseText } from '../sites/shop/browse/copy'
import { BrowseView } from '../sites/shop/browse/browse-view'
import { ShopByView } from '../sites/shop/browse/shop-by-view'
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

/**
 * What a listing view narrows the shop to, and its title; `null`: no such theme. No filter is the
 * best sellers, the shop's first view.
 */
async function narrowed(
  filter: ShopFilter | undefined,
  locale: 'en' | 'id',
): Promise<{ readonly options: ListingOptions; readonly title: string } | null> {
  const t = sectionsText(locale)
  if (filter?.kind === 'theme') {
    const theme = await themeBySlug(filter.slug, locale)
    return theme === null ? null : { options: { themeId: theme.id }, title: theme.label }
  }
  if (filter?.set === 'all') return { options: {}, title: browseText(locale)('browse.title') }
  if (filter?.set === 'wall-decor') {
    const ids = await wallDecorCategoryIds()
    // No category marked Wall Decor: an empty set, never the whole shop under its name.
    return { options: { categoryIds: ids.length > 0 ? ids : [0] }, title: t('shopBy.wallDecor') }
  }
  return { options: { bestSeller: true }, title: t('shopBy.bestSellers') }
}

/** The themes' or the product types' cards; a failed read is an empty view, never an error. */
async function cardsOf(view: 'themes' | 'product-types', locale: 'en' | 'id') {
  try {
    return view === 'themes' ? await themes(locale) : await collections()
  } catch {
    return []
  }
}

export default async function ShopBrowse({ params, searchParams }: ListingProps) {
  const { locale: raw } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale

  const state = await searchParams
  const filter = shopFilterOf(state) ?? undefined
  const view = viewOf(filter)
  const banner = <PromoBanner locale={locale} />
  if (filter?.kind === 'set' && (view === 'themes' || view === 'product-types')) {
    // Request time, as a listing read is (`server/shop/catalogue`): the cards' reads are cached,
    // and the same-day promise above them reads the clock.
    await connection()
    return (
      <ShopByView locale={locale} view={view} cards={await cardsOf(view, locale)} banner={banner} />
    )
  }
  const narrow = await narrowed(filter, locale)
  if (narrow === null) notFound()
  const page = pageOf(state.page)
  const list = await listing({ ...narrow.options, sort: sortOf(state.sort), page })
  return (
    <BrowseView
      listing={list}
      locale={locale}
      title={narrow.title}
      filter={filter}
      // The shop's own address opens on the best sellers, with the line that starts the shop.
      {...(filter === undefined
        ? { description: sectionsText(locale)('shopBy.lede') }
        : view === 'all'
          ? { description: browseText(locale)('browse.description') }
          : {})}
      banner={banner}
    />
  )
}
