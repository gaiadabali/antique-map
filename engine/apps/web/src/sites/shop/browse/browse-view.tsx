/**
 * The browse listing (6.1.b; EXPERIENCE-SHOP.md §4): the category chips, the sort links, the
 * tiles and the pages. Every control is a link, so browsing works without JavaScript and never
 * prefetches; the state in each URL is `canonicalListing()`'s, so one state has one address.
 */
import type { SiteLocale } from '@engine/config/sites'
import { canonicalListing, createHref, listingSearch, SITES } from '@engine/config/sites'

import type {
  CategoryVM,
  ListingVM,
  ProductCardVM,
} from '../../../server/shop/catalogue/view-models'
import { Pagination, SectionHead } from '../../../shared/ui'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ProductCard } from './product-card'

/** The phone's first row (two columns): its cards hold the listing's LCP candidates. */
const LEAD_CARDS = 2

const SORTS = ['featured', 'newest', 'priceAsc', 'priceDesc'] as const

export type BrowseViewProps = {
  readonly listing: ListingVM
  readonly categories: readonly CategoryVM[]
  readonly locale: SiteLocale
  /** The category this listing filters to, when it is a category page's. */
  readonly categorySlug?: string
  /** The words above the grid: the page's own title ("Shop all" or the category's). */
  readonly title: string
}

export function BrowseView({
  listing,
  categories,
  locale,
  categorySlug,
  title,
}: BrowseViewProps): React.ReactElement {
  const text = browseText(locale)
  const href = createHref(SITES.shop)
  // A state's one address: canonical, page 1 and the default sort left out.
  const listingHref = (sort?: typeof listing.sort, page?: number): string => {
    const state = canonicalListing(SITES.shop.routes, 'browse', { sort, page })
    if (categorySlug === undefined) return href('browse', state, locale)
    return href('collection', { slug: categorySlug }, locale) + listingSearch(state)
  }
  const cardHref = (product: ProductCardVM): string =>
    href('product', { slug: product.slug }, locale)
  // Pagination turns pages without touching the sort.
  const pageHref = (page: number): string => listingHref(listing.sort, page)
  return (
    <section className={styles.browse} aria-labelledby="browse-title">
      <SectionHead
        level={1}
        id="browse-title"
        eyebrow={text('browse.eyebrow')}
        title={title}
        lede={categorySlug === undefined ? text('browse.description') : undefined}
      />

      <div className={styles.toolbar}>
        <nav className={styles.tabs} aria-label={text('listing.category')}>
          <a
            href={href('browse', {}, locale)}
            aria-current={categorySlug === undefined ? 'page' : undefined}
            className={styles.tab}
          >
            {text('browse.title')}
          </a>
          {categories.map((category) => (
            <a
              key={category.slug}
              href={href('collection', { slug: category.slug }, locale)}
              aria-current={category.slug === categorySlug ? 'page' : undefined}
              className={styles.tab}
            >
              {category.label}
            </a>
          ))}
        </nav>

        <div className={styles.sortRow}>
          <span className={styles.sortLabel}>{text('listing.sortBy')}</span>
          <ul className={styles.sorts}>
            {SORTS.map((sort) => (
              <li key={sort}>
                <a
                  href={listingHref(sort)}
                  aria-current={listing.sort === sort ? 'true' : undefined}
                  className={styles.sortLink}
                >
                  {text(`sort.${sort}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {listing.items.length === 0 ? (
        <p className={styles.empty}>{text('browse.empty')}</p>
      ) : (
        <>
          <ul className={styles.grid}>
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
              />
            </div>
          )}
          <p className={styles.count}>{text('browse.results', { count: listing.total })}</p>
        </>
      )}
    </section>
  )
}
