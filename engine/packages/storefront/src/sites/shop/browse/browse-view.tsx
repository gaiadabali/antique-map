/**
 * The shop's narrowed listings (the redesign of 2026-10-20; the UI/UX revision of 2026-11-25, a
 * left panel "like Tokopedia"): a section's "See all" (the best sellers, wall decor), a theme's
 * prints and a product type's (a category page), inside the shop's frame (`./shop-frame`) —
 * breadcrumb, the left panel marking the section the page belongs under (`./shop-panel`), the
 * title with its count — the framed cards three to a row beside the panel (two on a phone), then
 * the boxed pager and the count. The shop page itself is `./shop-sections`. Every control is a
 * link, so browsing works without JavaScript and never prefetches; the state in each URL is
 * canonicalListing()'s, so one state has one address.
 */
import type { SiteLocale } from '@engine/config/sites'
import { canonicalListing, createHref, listingSearch, SITES } from '@engine/config/sites'

import type { ListingVM, ProductCardVM } from '../../../server/shop/catalogue/view-models'
import { Pagination } from '@engine/ui/pagination'
import type { ReactNode } from 'react'

import { filterFacets, sectionOf, type ShopFilter, type ShopSection } from '../sections/links'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ProductCard } from './product-card'
import { ShopFrame } from './shop-frame'
import { ShopPanel } from './shop-panel'

/** The phone's first row (two columns): its cards hold the listing's LCP candidates. */
const LEAD_CARDS = 2

export type BrowseViewProps = {
  readonly listing: ListingVM
  readonly locale: SiteLocale
  /** The category this listing filters to, when it is a category page's (a product type). */
  readonly categorySlug?: string
  /** The view's title: "Best sellers", a theme's name, "Shop all", a product type's name. */
  readonly title: string
  /** The narrowing a shop URL names (a theme, a view), kept on every link. */
  readonly filter?: ShopFilter
  /** A line under the title. */
  readonly description?: string
  /** A line above the page (the same-day promise). */
  readonly banner?: ReactNode
}

export function BrowseView({
  listing,
  locale,
  categorySlug,
  title,
  filter,
  description,
  banner,
}: BrowseViewProps): React.ReactElement {
  const text = browseText(locale)
  const href = createHref(SITES.shop)
  // A state's one address: canonical, page 1 and the default sort left out.
  const listingHref = (sort?: typeof listing.sort, page?: number): string => {
    const state = canonicalListing(SITES.shop.routes, 'browse', {
      sort,
      page,
      ...(filter ? { facets: filterFacets(filter) } : {}),
    })
    if (categorySlug === undefined) return href('browse', state, locale)
    return href('collection', { slug: categorySlug }, locale) + listingSearch(state)
  }
  const cardHref = (product: ProductCardVM): string =>
    href('product', { slug: product.slug }, locale)
  // Pagination turns pages without touching the sort.
  const pageHref = (page: number): string => listingHref(listing.sort, page)
  // A product type's page sits under Shop by product type, a theme's prints under Shop by theme.
  const section: ShopSection =
    categorySlug !== undefined ? 'product-types' : filter ? sectionOf(filter) : 'all'
  const panel = <ShopPanel locale={locale} section={section} />
  return (
    <ShopFrame
      locale={locale}
      panel={panel}
      title={title}
      total={listing.total}
      {...(description !== undefined ? { description } : {})}
      banner={banner}
    >
      {listing.items.length === 0 ? (
        <p className={styles.empty}>{text('browse.empty')}</p>
      ) : (
        <>
          <ul className={`${styles.grid} ${styles.gridBeside}`}>
            {listing.items.map((product, index) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  locale={locale}
                  href={cardHref(product)}
                  lead={index < LEAD_CARDS}
                />
              </li>
            ))}
          </ul>
          {listing.pages > 1 && (
            <div className={styles.pager}>
              <Pagination
                currentPage={listing.page}
                totalPages={listing.pages}
                getHref={pageHref}
                ariaLabel={text('listing.pagination')}
                previousLabel={text('listing.previous')}
                nextLabel={text('listing.next')}
                variant="boxed"
              />
            </div>
          )}
          <p className={styles.count}>{text('browse.results', { count: listing.total })}</p>
        </>
      )}
    </ShopFrame>
  )
}
