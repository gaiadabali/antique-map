/**
 * The shop page (6.1.b; TASKS.md 28.2; the UI/UX revision of 2026-11-25, a left panel "like
 * Tokopedia"): every section in the owner's order beside the left panel, which follows them as they
 * scroll — Best sellers and Wall decor two rows each, Shop by theme and Shop by product type their
 * cards, then Shop all with its sort and pages in the URL — and the same-day promise above. A
 * section's "See all" (`?productType=best-sellers`, `wall-decor`) and a theme's prints
 * (`?subject=`) are narrowed listings with the same panel (`../sites/shop/sections/links`). An
 * unknown theme is a 404, never an empty listing.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { createHref, canonicalListing, SITES } from '@engine/config/sites'

import { listing, type ListingOptions } from '../server/shop/catalogue'
import { collections } from '../server/shop/catalogue/collections'
import { themeBySlug, themes, wallDecorCategoryIds } from '../server/shop/catalogue/shop-by'
import type { ListingVM } from '../server/shop/catalogue/view-models'
import { sectionsText } from '../sites/shop/sections/copy'
import { SECTION_ANCHORS, shopFilterOf, type ShopFilter } from '../sites/shop/sections/links'
import { PromoBanner } from '../sites/shop/sections/promo'
import type { ListingSort } from '../server/shop/catalogue/queries'
import { browseText } from '../sites/shop/browse/copy'
import { BrowseView } from '../sites/shop/browse/browse-view'
import { ShopFrame } from '../sites/shop/browse/shop-frame'
import { ShopPanel } from '../sites/shop/browse/shop-panel'
import { SECTION_PRODUCTS, ShopSections } from '../sites/shop/browse/shop-sections'
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

/** What a narrowed page shows, and its title; `null`: no such theme. */
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
  return { options: { categoryIds: await wallDecorIds() }, title: t('shopBy.wallDecor') }
}

/** The categories marked Wall Decor; none is an empty set, never the whole shop under its name. */
async function wallDecorIds(): Promise<number[]> {
  const ids = await wallDecorCategoryIds()
  return ids.length > 0 ? [...ids] : [0]
}

/** A read that fails is an empty section, never an error page. */
async function safely<T>(read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read()
  } catch {
    return empty
  }
}

export default async function ShopBrowse({ params, searchParams }: ListingProps) {
  const { locale: raw } = await params
  const locale = siteLocale('shop', raw)
  if (locale === null) notFound() // the segment's not-found answers an unknown locale

  const state = await searchParams
  const filter = shopFilterOf(state) ?? undefined
  const banner = <PromoBanner locale={locale} />
  const sort = sortOf(state.sort)
  const page = pageOf(state.page)

  if (filter !== undefined) {
    const narrow = await narrowed(filter, locale)
    if (narrow === null) notFound()
    const list = await listing({ ...narrow.options, sort, page })
    return (
      <BrowseView
        listing={list}
        locale={locale}
        title={narrow.title}
        filter={filter}
        banner={banner}
      />
    )
  }

  // The shop page: every section, Shop all at the sort and page the URL names.
  const shop = createHref(SITES.shop)
  const allHref = (to: ListingSort, at?: number) =>
    `${shop('browse', canonicalListing(SITES.shop.routes, 'browse', { sort: to, page: at }), locale)}#${SECTION_ANCHORS.all}`
  const none = null as ListingVM | null
  const [all, bestSellers, wallDecor, themeCards, typeCards] = await Promise.all([
    listing({ sort, page }),
    safely(() => listing({ bestSeller: true, pageSize: SECTION_PRODUCTS }), none),
    safely(
      async () => listing({ categoryIds: await wallDecorIds(), pageSize: SECTION_PRODUCTS }),
      none,
    ),
    safely(() => themes(locale), []),
    safely(() => collections(), []),
  ])
  // A visitor who sorted or paged Shop all lands on it, so the panel starts there.
  const section = state.sort !== undefined || page !== undefined ? 'all' : 'best-sellers'
  return (
    <ShopFrame
      locale={locale}
      shopPage
      panel={
        <ShopPanel
          locale={locale}
          section={section}
          onShopPage
          sorts={{ current: all.sort, hrefOf: (to) => allHref(to) }}
        />
      }
      title={sectionsText(locale)('shopBy.title')}
      description={sectionsText(locale)('shopBy.lede')}
      banner={banner}
    >
      <ShopSections
        locale={locale}
        data={{ bestSellers, themes: themeCards, productTypes: typeCards, wallDecor, all, allHref }}
      />
    </ShopFrame>
  )
}
