/**
 * The search page's results (6.1.b; EXPERIENCE-SHOP.md §4): the words as the heading, then the
 * same tiles as the listing. No category chips here — the search is over the whole shop. It
 * renders inside the page's `<Suspense>`, so the shell answers while the query runs.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ListingVM, ProductCardVM } from '../../../server/shop/catalogue/view-models'
import { Band, SectionHead } from '../../../shared/ui'
import { browseText } from './copy'
import styles from './browse.module.css'
import { ProductCard } from './product-card'

/** The phone's first row (two columns): its cards hold the listing's LCP candidates. */
const LEAD_CARDS = 2

export function SearchView({
  query,
  listing,
  locale,
  productHref,
}: {
  readonly query: string
  readonly listing: ListingVM
  readonly locale: SiteLocale
  /** A result's product page, built by the page (the route helper stays on the server). */
  readonly productHref: (product: ProductCardVM) => string
}): React.ReactElement {
  const text = browseText(locale)
  return (
    <section className={styles.browse} aria-labelledby="search-title">
      <Band pigment={1} strength="wash" pad={false} className={styles.band}>
        <SectionHead
          level={1}
          id="search-title"
          title={<>“{query}”</>}
          lede={
            listing.items.length > 0 ? text('browse.results', { count: listing.total }) : undefined
          }
        />
      </Band>
      {listing.items.length === 0 ? (
        <p className={styles.empty}>{text('search.empty', { query })}</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {listing.items.map((product, index) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  locale={locale}
                  href={productHref(product)}
                  lead={index < LEAD_CARDS}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
